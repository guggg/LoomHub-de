#!/usr/bin/env node
/**
 * check-updates.mjs — Spec §7.3 / PRD FR-6.2, FR-6.3
 *
 * Pull-based update checker. Run inside a local clone of the hub with no
 * arguments:
 *
 *   node scripts/check-updates.mjs [--json]
 *
 * It does exactly three things, all read-only w.r.t. the working tree:
 *
 *   1. `git fetch origin` — refresh refs/remotes/origin/main. Never checks
 *      out, merges, or touches the current branch/working tree.
 *   2. For every skills/<name>/SKILL.md, compare the on-disk (working tree)
 *      `version` against the same file read from origin/main via
 *      `git show origin/main:<path>` (no checkout needed). Reports:
 *        - skills where origin/main is ahead ("update available", + level).
 *        - skills that exist on origin/main but not locally ("new on hub").
 *   3. Detects local content that has not made it back to origin/main yet
 *      (FR-6.3) — either a brand-new local skill folder that was never
 *      pushed, or an existing skill whose local content differs from
 *      origin/main in a way that is NOT explained by origin/main being
 *      ahead (i.e. local is equal-or-ahead but diverged). Only a reminder
 *      is printed; no git operation is performed — FR-6.3 is explicitly
 *      "detect + remind", never auto-sync.
 *
 * A single skill with unreadable/unparsable frontmatter (local or remote)
 * is skipped with a warning — it never aborts the whole run (see
 * checkUpdates()).
 *
 * Exit codes:
 *   0 — comparison completed (even if it found updates / warnings)
 *   1 — could not run at all (not a git repo, or `git fetch` failed)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { splitFrontmatter } from "./build-index.mjs";

// Unlike build-index.mjs / install-skill.mjs (which always act on THIS repo
// and so anchor to the script's own __dirname), this script's whole purpose
// is "compare whatever local clone you're standing in against its origin" —
// per Spec §7.3 it is invoked with no args from inside a local clone. So it
// must anchor to the clone's git root, not wherever the user happens to be
// cd'd to inside that clone — `git ls-tree <rev>:<path>` resolves <path>
// relative to CWD (unlike `git show <rev>:<path>`, which is root-relative),
// so a stale process.cwd() here would silently break listRemoteSkillNames()
// whenever this is invoked from e.g. skills/<name>/.
function resolveRepoRoot(cwd) {
  const res = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
  if (res.status !== 0) return cwd; // let assertGitRepo() below report the real error
  return res.stdout.trim();
}
const REPO_ROOT = resolveRepoRoot(process.cwd());

// Hub's canonical branch (Spec §7.3 / this repo's own default branch).
const REMOTE_REF = "origin/main";

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/** Parse "x.y.z" into [x, y, z] numbers, or null if not valid semver. */
export function parseSemver(v) {
  if (typeof v !== "string") return null;
  const m = v.match(SEMVER_RE);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Classic 3-way comparator over parsed [maj,min,patch] tuples. */
export function semverCompare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/** Highest-order differing segment between two parsed semver tuples, or null if equal. */
export function semverLevel(a, b) {
  if (a[0] !== b[0]) return "major";
  if (a[1] !== b[1]) return "minor";
  if (a[2] !== b[2]) return "patch";
  return null;
}

/**
 * Run `git <args>` in `cwd`. Returns trimmed-safe raw stdout on success;
 * throws a plain Error (message only, no captured stack noise) on any
 * failure — missing git binary, non-zero exit, path not found, etc.
 */
export function runGit(args, cwd) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (res.status !== 0) {
    const stderr = (res.stderr || "").trim();
    throw new Error(stderr || `git ${args.join(" ")} exited with code ${res.status}`);
  }
  return res.stdout;
}

/** Throws if `repoRoot` is not inside a git working tree (or git is missing). */
export function assertGitRepo(repoRoot) {
  const out = runGit(["rev-parse", "--is-inside-work-tree"], repoRoot);
  if (out.trim() !== "true") {
    throw new Error("not inside a git working tree");
  }
}

/** `git fetch origin` — throws on failure (offline, no such remote, etc.). */
export function fetchOrigin(repoRoot) {
  runGit(["fetch", "origin"], repoRoot);
}

/** Top-level directory names under skills/ in the local working tree. */
export function listLocalSkillNames(repoRoot) {
  let dirents;
  try {
    dirents = readdirSync(join(repoRoot, "skills"), { withFileTypes: true });
  } catch {
    return [];
  }
  return dirents
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Top-level directory (tree) names under skills/ at origin/main. [] if unreadable. */
export function listRemoteSkillNames(repoRoot) {
  let out;
  try {
    out = runGit(["ls-tree", `${REMOTE_REF}:skills`], repoRoot);
  } catch {
    return [];
  }
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      const meta = line.slice(0, tab);
      const name = line.slice(tab + 1);
      const type = meta.split(/\s+/)[1];
      return { name, type };
    })
    .filter((e) => e.type === "tree")
    .map((e) => e.name)
    .sort();
}

/** Raw SKILL.md content from the local working tree, or null if unreadable. */
export function readLocalSkillMd(repoRoot, name) {
  try {
    return readFileSync(join(repoRoot, "skills", name, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

/** Raw SKILL.md content from origin/main, or null if it doesn't exist there. */
export function readRemoteSkillMd(repoRoot, name) {
  try {
    return runGit(["show", `${REMOTE_REF}:skills/${name}/SKILL.md`], repoRoot);
  } catch {
    return null;
  }
}

/**
 * Parse a SKILL.md's frontmatter just far enough to get `version`. Reuses
 * build-index.mjs's splitFrontmatter (same FRONTMATTER_RE) rather than
 * re-deriving the fence regex.
 */
export function parseFrontmatterVersion(raw) {
  const split = splitFrontmatter(raw);
  if (!split) return { ok: false, error: "no YAML frontmatter fence (---)" };
  let fm;
  try {
    fm = parseYaml(split.yaml);
  } catch (err) {
    return { ok: false, error: `frontmatter YAML parse error: ${err.message}` };
  }
  if (fm == null || typeof fm !== "object" || Array.isArray(fm)) {
    return { ok: false, error: "frontmatter is not a mapping" };
  }
  if (fm.version == null) {
    return { ok: false, error: "missing `version` field" };
  }
  return { ok: true, fm, version: String(fm.version) };
}

/**
 * Core comparison (Spec §7.3 / FR-6.2 / FR-6.3). Assumes the caller has
 * already run `git fetch origin` — this function never fetches or mutates
 * anything, so it is safe to call repeatedly / from tests.
 *
 * Returns { updates, newOnHub, unpushed, warnings } — never throws; any
 * single skill that can't be compared is recorded in `warnings` and
 * skipped, per the "one bad skill must not abort the whole run" contract.
 */
export function checkUpdates(repoRoot) {
  const localNames = listLocalSkillNames(repoRoot);
  const remoteNames = listRemoteSkillNames(repoRoot);

  const updates = [];
  const unpushed = [];
  const newOnHub = [];
  const warnings = [];

  for (const name of localNames) {
    const localRaw = readLocalSkillMd(repoRoot, name);
    if (localRaw == null) {
      warnings.push(`${name}: local SKILL.md unreadable — skipped`);
      continue;
    }
    const local = parseFrontmatterVersion(localRaw);
    if (!local.ok) {
      warnings.push(`${name}: local frontmatter unparsable (${local.error}) — skipped`);
      continue;
    }

    const remoteRaw = readRemoteSkillMd(repoRoot, name);
    if (remoteRaw == null) {
      // Not on origin/main at all yet — a local-only skill never pushed.
      unpushed.push({ name, kind: "new", localVersion: local.version });
      continue;
    }

    if (remoteRaw === localRaw) continue; // identical — nothing to report

    const remote = parseFrontmatterVersion(remoteRaw);
    if (!remote.ok) {
      warnings.push(`${name}: remote frontmatter unparsable (${remote.error}) — skipped`);
      continue;
    }

    const localSem = parseSemver(local.version);
    const remoteSem = parseSemver(remote.version);
    if (!localSem || !remoteSem) {
      warnings.push(
        `${name}: version not valid semver (local "${local.version}", remote "${remote.version}") — cannot compare, skipped`
      );
      continue;
    }

    const cmp = semverCompare(localSem, remoteSem);
    if (cmp < 0) {
      updates.push({
        name,
        localVersion: local.version,
        remoteVersion: remote.version,
        level: semverLevel(localSem, remoteSem),
      });
    } else {
      // Local is equal-or-ahead of origin/main but content still differs —
      // i.e. NOT explained by origin/main being ahead. FR-6.3 territory.
      unpushed.push({
        name,
        kind: "modified",
        localVersion: local.version,
        remoteVersion: remote.version,
      });
    }
  }

  for (const name of remoteNames) {
    if (localNames.includes(name)) continue;
    const remoteRaw = readRemoteSkillMd(repoRoot, name);
    let version = null;
    if (remoteRaw != null) {
      const remote = parseFrontmatterVersion(remoteRaw);
      if (remote.ok) {
        version = remote.version;
      } else {
        warnings.push(`${name}: remote frontmatter unparsable (${remote.error}) — listed without version`);
      }
    }
    newOnHub.push({ name, version });
  }

  return { updates, newOnHub, unpushed, warnings };
}

/** Render the plain-text report (Spec §7.3 output). */
export function formatText(result) {
  const { updates, newOnHub, unpushed, warnings } = result;
  const lines = [];

  if (updates.length) {
    lines.push("有更新的 skill：");
    for (const u of updates) {
      lines.push(`  [update] ${u.name}: ${u.localVersion} -> ${u.remoteVersion} (${u.level})`);
    }
  }

  if (newOnHub.length) {
    if (lines.length) lines.push("");
    lines.push("Hub 上新出現的 skill（本機尚未安裝）：");
    for (const n of newOnHub) {
      lines.push(`  [new]    ${n.name}${n.version ? ` (v${n.version})` : ""}`);
    }
  }

  if (unpushed.length) {
    if (lines.length) lines.push("");
    lines.push("本機未回流的改動（僅提醒，未自動同步）：");
    for (const u of unpushed) {
      if (u.kind === "new") {
        lines.push(
          `  [local]  ${u.name}: 本機新增的 skill（v${u.localVersion}）尚未推送到 hub — 考慮走貢獻流程 push 回去`
        );
      } else {
        lines.push(
          `  [local]  ${u.name}: 本機版本 v${u.localVersion} 與 hub（${u.remoteVersion}）不同且非落後 — 有本機改動尚未回流，考慮走貢獻流程 push 回去`
        );
      }
    }
  }

  if (warnings.length) {
    if (lines.length) lines.push("");
    lines.push("警告（已略過、不影響其他結果）：");
    for (const w of warnings) lines.push(`  [warn]   ${w}`);
  }

  if (!updates.length && !newOnHub.length && !unpushed.length) {
    if (lines.length) lines.push("");
    lines.push("已是最新，無未回流改動。");
  }

  return lines.join("\n");
}

function printUsage() {
  console.error("Usage: node scripts/check-updates.mjs [--json]");
}

/** Parse CLI args into { json }. */
export function parseArgs(argv) {
  const out = { json: false };
  for (const a of argv) {
    if (a === "--json") {
      out.json = true;
    } else if (a === "-h" || a === "--help") {
      printUsage();
      process.exit(0);
    } else {
      console.error(`[fatal] unknown argument: ${a}`);
      printUsage();
      process.exit(1);
    }
  }
  return out;
}

function main() {
  const { json } = parseArgs(process.argv.slice(2));

  try {
    assertGitRepo(REPO_ROOT);
  } catch (err) {
    console.error(`[fatal] ${REPO_ROOT} is not a git repository: ${err.message}`);
    process.exit(1);
  }

  try {
    fetchOrigin(REPO_ROOT);
  } catch (err) {
    console.error(`[fatal] git fetch origin failed: ${err.message}`);
    process.exit(1);
  }

  const result = checkUpdates(REPO_ROOT);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatText(result));
  }

  process.exit(0);
}

// Only run when executed directly, not when imported by tests. Use
// pathToFileURL (not a raw `file://` template) so both sides percent-encode
// identically — see install-skill.mjs for the rationale.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
