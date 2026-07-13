#!/usr/bin/env node
/**
 * build-index.mjs — Spec §7.1
 *
 * Scans skills/<name>/SKILL.md, parses YAML frontmatter, and emits
 * site/public/index.json (array of catalog entries). Also runs the §5.1
 * spec-compliance check per skill and PRINTS warnings to stderr — warnings
 * do NOT block index generation ("發現不合規印警告，不阻斷產生", §7.1).
 *
 * Exit codes:
 *   0  — index produced (even if there were compliance warnings)
 *   1  — hard failure that prevented producing the index at all
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const OUT_DIR = join(REPO_ROOT, "site", "public");
const OUT_FILE = join(OUT_DIR, "index.json");

// Whitelists — kept in sync with schema/skill.schema.json (Spec §4.1 / §4.2).
// Hardcoded here so the builder has zero coupling to a JSON-schema validator;
// if the schema changes, update these two arrays.
const TYPE_WHITELIST = ["skill", "prompt", "mcp-server", "workflow"];
const CATEGORY_WHITELIST = [
  "requirements",
  "design",
  "development",
  "testing",
  "ops",
  "docs",
  "research",
  "general",
];

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

// The 9 catalog fields written to index.json (Spec §7.1). `path` is derived.
const INDEX_FIELDS = [
  "name",
  "description",
  "type",
  "category",
  "tags",
  "version",
  "owner",
  "updated",
  // Optional (null when absent): present for externally-collected assets.
  "source",
  "license",
];

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Frontmatter: leading `---` fence, body, closing `---` fence, then markdown.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Split a SKILL.md into { frontmatter (raw yaml string), body }. */
function splitFrontmatter(raw) {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return null;
  return { yaml: m[1], body: m[2] ?? "" };
}

/** True if `updated` is both YYYY-MM-DD shaped AND a real calendar date. */
function isValidDate(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, mo, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/** Body must contain the three required headings (Spec §5.1 item 6). */
function hasRequiredHeadings(body) {
  const checks = [
    { label: "用途 / What", re: /^#{1,6}\s*用途/m },
    { label: "使用場景 / When", re: /^#{1,6}\s*使用場景/m },
    { label: "使用方式 / How", re: /^#{1,6}\s*使用方式/m },
  ];
  return checks.filter((c) => !c.re.test(body)).map((c) => c.label);
}

/**
 * Run the §5.1 hard-check items against one skill. Returns an array of
 * human-readable warning strings (empty === compliant).
 *
 * NOTE: §5.1 item 7 (version-bump / date-sync vs git HEAD) is intentionally
 * skipped here. It is a contributor commit-time self-check that requires a git
 * diff against the working tree; the index builder scans a static snapshot and
 * cannot meaningfully assess whether a bump was *warranted*. It belongs to the
 * AGENTS.md pre-commit flow, not to catalog generation.
 */
function checkCompliance(fm, folderName, body) {
  const warnings = [];

  // 1. all 8 required frontmatter fields present.
  for (const f of REQUIRED_FIELDS) {
    if (fm[f] === undefined || fm[f] === null) {
      warnings.push(`missing required field \`${f}\``);
    }
  }

  // 2. name == folder name AND kebab-case.
  if (fm.name !== undefined) {
    if (fm.name !== folderName) {
      warnings.push(`name "${fm.name}" != folder name "${folderName}"`);
    }
    if (typeof fm.name !== "string" || !KEBAB_RE.test(fm.name)) {
      warnings.push(`name "${fm.name}" is not kebab-case`);
    }
  }

  // 3. type / category in whitelists.
  if (fm.type !== undefined && !TYPE_WHITELIST.includes(fm.type)) {
    warnings.push(`type "${fm.type}" not in whitelist (${TYPE_WHITELIST.join(", ")})`);
  }
  if (fm.category !== undefined && !CATEGORY_WHITELIST.includes(fm.category)) {
    warnings.push(
      `category "${fm.category}" not in whitelist (${CATEGORY_WHITELIST.join(", ")})`
    );
  }

  // 4. version valid semver.
  if (fm.version !== undefined && !SEMVER_RE.test(String(fm.version))) {
    warnings.push(`version "${fm.version}" is not valid semver x.y.z`);
  }

  // 5. updated valid YYYY-MM-DD.
  if (fm.updated !== undefined && !isValidDate(String(fm.updated))) {
    warnings.push(`updated "${fm.updated}" is not a valid YYYY-MM-DD date`);
  }

  // 6. body contains the 3 required headings.
  const missingHeadings = hasRequiredHeadings(body);
  if (missingHeadings.length) {
    warnings.push(`missing body heading(s): ${missingHeadings.join(", ")}`);
  }

  // 7. version/date sync vs git HEAD — intentionally skipped (see doc comment).

  return warnings;
}

/** Build the index entry with exactly the Spec §7.1 fields, in order. */
function toIndexEntry(fm, relPath) {
  const entry = {};
  for (const f of INDEX_FIELDS) {
    if (f === "tags") {
      entry.tags = Array.isArray(fm.tags) ? fm.tags : fm.tags == null ? [] : [fm.tags];
    } else {
      entry[f] = fm[f] ?? null;
    }
  }
  entry.path = relPath;
  return entry;
}

function main() {
  // List one-level skill folders. A missing skills/ dir is a hard failure.
  let dirents;
  try {
    dirents = readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`[fatal] cannot read skills dir at ${SKILLS_DIR}: ${err.message}`);
    process.exit(1);
  }

  const skillDirs = dirents
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const index = [];
  let totalWarnings = 0;
  let indexed = 0;
  let skipped = 0;

  for (const folderName of skillDirs) {
    const skillMdPath = join(SKILLS_DIR, folderName, "SKILL.md");
    const relPath = `skills/${folderName}`;

    // A folder without SKILL.md is not a skill entry point — skip silently
    // unless it looks like one should exist.
    let raw;
    try {
      if (!statSync(skillMdPath).isFile()) throw new Error("not a file");
      raw = readFileSync(skillMdPath, "utf8");
    } catch {
      console.error(`[warn] ${relPath}: no readable SKILL.md — skipped`);
      skipped++;
      continue;
    }

    // Parse frontmatter. A malformed file warns + is skipped, never crashes.
    const split = splitFrontmatter(raw);
    if (!split) {
      console.error(`[warn] ${relPath}: no YAML frontmatter fence (---) — skipped`);
      totalWarnings++;
      skipped++;
      continue;
    }

    let fm;
    try {
      fm = parseYaml(split.yaml);
    } catch (err) {
      console.error(`[warn] ${relPath}: frontmatter YAML parse error: ${err.message} — skipped`);
      totalWarnings++;
      skipped++;
      continue;
    }
    if (fm == null || typeof fm !== "object" || Array.isArray(fm)) {
      console.error(`[warn] ${relPath}: frontmatter is not a mapping — skipped`);
      totalWarnings++;
      skipped++;
      continue;
    }

    // §5.1 compliance check — print warnings, do NOT block.
    const warnings = checkCompliance(fm, folderName, split.body);
    if (warnings.length) {
      totalWarnings += warnings.length;
      console.error(`[warn] ${relPath}: ${warnings.length} compliance issue(s):`);
      for (const w of warnings) console.error(`         - ${w}`);
    }

    // Include in the index regardless of warnings (non-blocking generation).
    index.push(toIndexEntry(fm, relPath));
    indexed++;
  }

  // Write the index. Failure to write is a hard failure.
  try {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(index, null, 2) + "\n", "utf8");
  } catch (err) {
    console.error(`[fatal] cannot write index to ${OUT_FILE}: ${err.message}`);
    process.exit(1);
  }

  // Clean summary.
  const rel = OUT_FILE.slice(REPO_ROOT.length + 1);
  console.error("");
  console.error(
    `Indexed ${indexed} skill(s)` +
      (skipped ? `, skipped ${skipped}` : "") +
      `, ${totalWarnings} warning(s) → ${rel}`
  );

  process.exit(0);
}

main();
