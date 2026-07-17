#!/usr/bin/env node
/**
 * check-version-bump.mjs — AGENTS.md §5.1 item 7 helper (advisory, non-blocking)
 *
 * Item 7 is the one self-check that has no machine backing: "if a skill's
 * content changed relative to git HEAD, `version` must be bumped and
 * `updated` must be set to today." Nothing enforces this today — a
 * contributor can simply forget. This script gives a deterministic way to
 * check it, without turning it into a CI gate (this repo is trust-based /
 * no-PR; see ADR-0006 — a hard gate here would contradict that).
 *
 * Usage (run manually, or wire into a pre-commit hook if you want one):
 *
 *   node scripts/check-version-bump.mjs
 *
 * Logic, per changed skills/<name>/ folder (vs `git diff HEAD`):
 *   - If any file under skills/<name>/ differs from HEAD, but SKILL.md's own
 *     diff does not contain an ADDED line starting with `version:` and one
 *     starting with `updated:`, print a warning.
 *   - Never exits non-zero for "found a warning" — this is a reminder, not a
 *     gate (mirrors build-index.mjs's non-blocking compliance warnings).
 *
 * Exit codes:
 *   0 — always, unless invoked outside a git repo entirely (see runGit).
 */

import { pathToFileURL } from "node:url";
import { runGit } from "./check-updates.mjs";

/**
 * Untracked file paths under skills/ (new files never added/committed).
 * `git diff HEAD` alone is silent on these, so a brand-new skill folder or a
 * brand-new file inside an existing one would otherwise go undetected.
 */
function listUntrackedSkillPaths(cwd) {
  const out = runGit(["ls-files", "--others", "--exclude-standard", "--", "skills/"], cwd);
  return out.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Skill folder names (under skills/) that differ from HEAD, sorted. */
export function listChangedSkillNames(cwd) {
  const tracked = runGit(["diff", "HEAD", "--name-only", "--", "skills/"], cwd);
  const untracked = listUntrackedSkillPaths(cwd);
  const names = new Set();
  for (const line of [...tracked.split("\n"), ...untracked]) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^skills\/([^/]+)\//);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * Full diff (vs HEAD) of everything under skills/<name>/, PLUS a synthetic
 * marker line for any untracked (new, never-added) file in that folder —
 * `git diff HEAD` is silent on untracked files, but their presence still
 * means "this skill folder changed" for listChangedSkillNames()'s purposes.
 */
export function getSkillFolderDiff(skillName, cwd) {
  const tracked = runGit(["diff", "HEAD", "--", `skills/${skillName}/`], cwd);
  const untracked = listUntrackedSkillPaths(cwd).filter((p) =>
    p.startsWith(`skills/${skillName}/`)
  );
  const untrackedMarker = untracked.map((p) => `+++ untracked ${p}`).join("\n");
  return [tracked, untrackedMarker].filter(Boolean).join("\n");
}

/** Diff (vs HEAD) of just skills/<name>/SKILL.md. */
export function getSkillMdDiff(skillName, cwd) {
  return runGit(["diff", "HEAD", "--", `skills/${skillName}/SKILL.md`], cwd);
}

/**
 * True/true if the SKILL.md diff contains an added `version:` line and an
 * added `updated:` line respectively. Only counts lines the diff ADDS
 * (prefixed `+`, excluding the `+++ b/...` file header) — an unchanged
 * value that merely appears in context lines doesn't count as a bump.
 */
export function diffAddsVersionAndUpdated(skillMdDiff) {
  const addedLines = skillMdDiff
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1).trim());
  return {
    addedVersion: addedLines.some((l) => /^version:/.test(l)),
    addedUpdated: addedLines.some((l) => /^updated:/.test(l)),
  };
}

/**
 * Check one changed skill. Returns null if the bump looks correct (or the
 * skill's SKILL.md didn't need one), or `{ skillName, reason }` if it looks
 * like a missed bump.
 */
export function checkSkillVersionBump(skillName, cwd) {
  const folderDiff = getSkillFolderDiff(skillName, cwd);
  if (!folderDiff.trim()) return null; // nothing actually changed

  const skillMdDiff = getSkillMdDiff(skillName, cwd);
  if (!skillMdDiff.trim()) {
    // Content changed elsewhere in the folder (scripts/ references/ assets/)
    // but SKILL.md itself was never touched — version/updated can't have bumped.
    return {
      skillName,
      reason:
        "files under skills/<name>/ changed but SKILL.md itself was not touched — version/updated cannot have been bumped",
    };
  }

  const { addedVersion, addedUpdated } = diffAddsVersionAndUpdated(skillMdDiff);
  if (addedVersion && addedUpdated) return null;

  const missing = [];
  if (!addedVersion) missing.push("version");
  if (!addedUpdated) missing.push("updated");
  return {
    skillName,
    reason: `SKILL.md changed but the \`${missing.join("\` / \`")}\` line(s) were not bumped (AGENTS.md §5.1 item 7)`,
  };
}

function main() {
  const cwd = process.cwd();
  let names;
  try {
    names = listChangedSkillNames(cwd);
  } catch (err) {
    console.error(`[check-version-bump] could not run: ${err.message}`);
    process.exit(0); // advisory tool — never fail the caller's flow
  }

  if (names.length === 0) {
    console.error("[check-version-bump] no skills/ changes vs HEAD — nothing to check.");
    process.exit(0);
  }

  let anyWarning = false;
  for (const name of names) {
    const result = checkSkillVersionBump(name, cwd);
    if (result) {
      anyWarning = true;
      console.error(`[warn] ${result.skillName}: ${result.reason}`);
    }
  }

  if (!anyWarning) {
    console.error(
      `[check-version-bump] ${names.length} changed skill(s) — version/updated bump looks OK for all.`
    );
  }

  process.exit(0); // advisory only — never blocks commit (ADR-0006, trust-based)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
