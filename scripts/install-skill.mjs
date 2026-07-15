#!/usr/bin/env node
/**
 * install-skill.mjs — Spec §6 (安裝機制 / ADR-0002 / FR-5)
 *
 * One-click cross-vendor skill installer. Symlinks (default) or copies
 * (--copy fallback) a skill folder from skills/<name>/ into the local agent
 * skill dirs so Codex + Gemini (via ~/.agents/skills) and Claude Code
 * (via ~/.claude/skills) all pick it up.
 *
 * Usage:
 *   node scripts/install-skill.mjs <skill-name> [--copy] [--project <path>]
 *
 *   <skill-name>       folder under skills/ to install
 *   --copy             recursive copy instead of symlink (Spec §6 fallback:
 *                      symlink-following is not guaranteed on Codex/Gemini)
 *   --project <path>   install into <path>/.agents/skills & <path>/.claude/skills
 *                      instead of the USER-scope (~) dirs
 *
 * Idempotent: re-running never errors or duplicates. A target already pointing
 * at the right place reports "already installed"; a stale/broken/differing
 * target is replaced. Exit 0 on success, non-zero on real failure (skill not
 * found, or all installs failed).
 */

import {
  readFileSync,
  mkdirSync,
  statSync,
  lstatSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  cpSync,
  realpathSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");

// Required frontmatter fields — Spec §3.1 (kept in sync with build-index.mjs).
const REQUIRED_FIELDS = [
  "name",
  "description",
  "type",
  "category",
  "tags",
  "version",
  "owner",
  "updated",
];

// Frontmatter fence, same regex shape as build-index.mjs.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// Skill-name shape — kebab-case, same regex as build-index.mjs (Spec §2:
// name == folder name, kebab-case). Enforcing it EARLY also blocks path
// traversal (e.g. "../../evil") from ever reaching a filesystem op.
export const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Parse CLI args into { skillName, copy, project }. */
export function parseArgs(argv) {
  const out = { skillName: null, copy: false, project: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--copy") {
      out.copy = true;
    } else if (a === "--project") {
      out.project = argv[++i];
      if (!out.project || out.project.startsWith("--")) {
        fail("--project requires a <path> argument");
      }
    } else if (a === "-h" || a === "--help") {
      printUsage();
      process.exit(0);
    } else if (a.startsWith("--")) {
      fail(`unknown flag: ${a}`);
    } else if (out.skillName === null) {
      out.skillName = a;
    } else {
      fail(`unexpected extra argument: ${a}`);
    }
  }
  return out;
}

function printUsage() {
  console.error(
    "Usage: node scripts/install-skill.mjs <skill-name> [--copy] [--project <path>]"
  );
}

function fail(msg) {
  console.error(`[fatal] ${msg}`);
  printUsage();
  process.exit(1);
}

/**
 * Lightweight frontmatter check (Spec §6 step 1 — a warning, not a hard fail).
 * Verifies SKILL.md parses and carries the 8 required fields. Deep whitelist /
 * semver validation lives in build-index.mjs; we stay lightweight here.
 */
export function warnOnFrontmatter(skillMdPath, skillName) {
  let raw;
  try {
    raw = readFileSync(skillMdPath, "utf8");
  } catch {
    return; // existence already checked by caller
  }
  const m = raw.match(FRONTMATTER_RE);
  if (!m) {
    console.error(`[warn] ${skillName}: no YAML frontmatter fence (---)`);
    return;
  }
  let fm;
  try {
    fm = parseYaml(m[1]);
  } catch (err) {
    console.error(`[warn] ${skillName}: frontmatter YAML parse error: ${err.message}`);
    return;
  }
  if (fm == null || typeof fm !== "object" || Array.isArray(fm)) {
    console.error(`[warn] ${skillName}: frontmatter is not a mapping`);
    return;
  }
  const missing = REQUIRED_FIELDS.filter((f) => fm[f] === undefined || fm[f] === null);
  if (missing.length) {
    console.error(`[warn] ${skillName}: missing frontmatter field(s): ${missing.join(", ")}`);
  }
  if (fm.name !== undefined && fm.name !== skillName) {
    console.error(`[warn] ${skillName}: frontmatter name "${fm.name}" != folder name`);
  }
}

/**
 * Install `src` (absolute) into `target` (absolute) as a symlink or copy.
 * Idempotent. Returns a status string: "installed" | "already" | "replaced".
 * Throws on real filesystem failure.
 */
export function installOne(src, target, useCopy) {
  // Defense in depth: never operate on a target that resolves to the source.
  // A destructive rmSync on a shared path would delete the source folder.
  if (resolve(target) === resolve(src)) {
    throw new Error("target resolves to source; refusing to install onto itself");
  }

  mkdirSync(dirname(target), { recursive: true });

  // Inspect any existing target WITHOUT following the link (lstat).
  let existing = null;
  try {
    existing = lstatSync(target);
  } catch {
    existing = null; // nothing there
  }

  if (existing) {
    if (!useCopy && existing.isSymbolicLink()) {
      // Symlink present — does it already resolve to our source?
      let linkPath;
      try {
        linkPath = readlinkSync(target);
      } catch {
        linkPath = null;
      }
      // Resolve relative link targets against the link's own directory.
      const resolvedLink = linkPath
        ? resolve(dirname(target), linkPath)
        : null;
      let pointsHere = false;
      try {
        // realpathSync collapses symlink chains; guard against broken links.
        pointsHere = resolvedLink != null && realpathSync(target) === realpathSync(src);
      } catch {
        pointsHere = false; // broken/stale link
      }
      if (pointsHere && resolvedLink === src) {
        return "already";
      }
      rmSync(target, { recursive: true, force: true });
      symlinkSync(src, target);
      return "replaced";
    }

    if (useCopy && existing.isDirectory() && !existing.isSymbolicLink()) {
      // A copy already exists — refresh it so content stays in sync.
      rmSync(target, { recursive: true, force: true });
      cpSync(src, target, { recursive: true });
      return "refreshed";
    }

    // Any other pre-existing entry (wrong kind: symlink when copying, dir when
    // symlinking, plain file, broken link) — replace to converge to desired.
    rmSync(target, { recursive: true, force: true });
  }

  if (useCopy) {
    cpSync(src, target, { recursive: true });
  } else {
    symlinkSync(src, target);
  }
  return "installed";
}

function main() {
  const { skillName, copy, project } = parseArgs(process.argv.slice(2));

  if (!skillName) fail("missing <skill-name>");

  // Validate the name EARLY, before it touches any path. kebab-case only —
  // this rejects path traversal ("../../evil") and enforces Spec §2 naming.
  if (!KEBAB_RE.test(skillName)) {
    console.error(
      `[fatal] invalid skill name "${skillName}" — must be kebab-case (a-z, 0-9, hyphens; Spec §2)`
    );
    process.exit(1);
  }

  // Step 1: source skill folder must exist and contain SKILL.md.
  const srcDir = join(SKILLS_DIR, skillName);
  try {
    if (!statSync(srcDir).isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`[fatal] skill "${skillName}" not found at ${srcDir}`);
    process.exit(1);
  }
  const skillMdPath = join(srcDir, "SKILL.md");
  try {
    if (!statSync(skillMdPath).isFile()) throw new Error("not a file");
  } catch {
    console.error(`[fatal] ${srcDir} has no SKILL.md — not a valid skill folder`);
    process.exit(1);
  }

  // Absolute source path — required so symlinks into ~ don't break (§7).
  const srcAbs = resolve(srcDir);

  // Step 2: lightweight frontmatter check (warn only).
  warnOnFrontmatter(skillMdPath, skillName);

  // Step 3: resolve install base (USER scope ~ vs PROJECT scope).
  const base = project ? resolve(project) : homedir();
  const scopeLabel = project ? `project (${base})` : "user (~)";

  // Two vendor targets (Spec §6 step 2).
  const targets = [
    { vendor: "Codex + Gemini", target: join(base, ".agents", "skills", skillName) },
    { vendor: "Claude Code", target: join(base, ".claude", "skills", skillName) },
  ];

  const mode = copy ? "copy" : "symlink";
  console.error(`Installing "${skillName}" (${mode}, scope: ${scopeLabel})`);
  console.error(`  source: ${srcAbs}`);

  let okCount = 0;
  const results = [];
  for (const { vendor, target } of targets) {
    try {
      const status = installOne(srcAbs, target, copy);
      okCount++;
      const label =
        status === "already"
          ? "already installed"
          : status === "replaced"
            ? "replaced (differed)"
            : status === "refreshed"
              ? "refreshed (copy re-synced)"
              : "installed";
      results.push(`  [ok]   ${vendor}: ${label} → ${target}`);
    } catch (err) {
      results.push(`  [fail] ${vendor}: ${err.message} → ${target}`);
    }
  }

  for (const line of results) console.error(line);

  // Exit non-zero only if EVERY install failed (Spec §6 step 6).
  if (okCount === 0) {
    console.error(`\nInstall FAILED: no targets installed.`);
    process.exit(1);
  }
  const partial = okCount < targets.length ? ` (${targets.length - okCount} failed)` : "";
  console.error(`\nDone: ${okCount}/${targets.length} target(s) installed${partial}.`);
  process.exit(0);
}

// Only run when executed directly (`node scripts/install-skill.mjs ...`), not
// when imported by tests (`import * as installSkill from "./install-skill.mjs"`).
// Use pathToFileURL (not a raw `file://` template) so both sides percent-encode
// identically — a raw template silently mismatches (and thus silently skips
// main(), exiting 0 with nothing done) for any path containing spaces,
// non-ASCII characters, `#`, or `?`.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
