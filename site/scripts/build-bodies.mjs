#!/usr/bin/env node
/**
 * build-bodies.mjs — site-side prebuild (runs before `vite dev` / `vite build`).
 *
 * WHY THIS EXISTS
 * ---------------
 * The catalog list is driven by site/public/index.json (produced by the
 * committed scripts/build-index.mjs — NOT touched by this script). But the
 * detail page (Spec §7.2.2) must render each skill's full SKILL.md *body*, and
 * the source SKILL.md files live in <repo>/skills/, which Vite does not serve
 * (Vite's static root is site/). Rather than modify the committed build-index
 * contract or copy whole skill folders, we emit ONE extra static data file:
 *
 *     site/public/skills.json  ->  {
 *       "<name>": {
 *         "body": "<markdown after frontmatter>",  // rendered on the detail page
 *         "raw":  "<full original SKILL.md>"         // served by the raw-view link
 *       }, ...
 *     }
 *
 * The app fetches it once at runtime. This is fully static: it ends up in the
 * `vite build` dist/ output and needs no server. If a skill has no body it is
 * simply omitted (the detail page falls back gracefully).
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(SITE_ROOT, "..");
const SKILLS_DIR = join(REPO_ROOT, "skills");
const OUT_FILE = join(SITE_ROOT, "public", "skills.json");

// Same frontmatter fence contract as scripts/build-index.mjs.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function bodyOf(raw) {
  const m = raw.match(FRONTMATTER_RE);
  return m ? (m[2] ?? "").trim() : raw.trim();
}

function main() {
  let dirents;
  try {
    dirents = readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`[fatal] cannot read skills dir at ${SKILLS_DIR}: ${err.message}`);
    process.exit(1);
  }

  const out = {};
  let count = 0;
  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const mdPath = join(SKILLS_DIR, d.name, "SKILL.md");
    try {
      if (!statSync(mdPath).isFile()) continue;
      const raw = readFileSync(mdPath, "utf8");
      // `body` = frontmatter-stripped (for rendering); `raw` = full original
      // SKILL.md incl. frontmatter (for the "view raw" link, Spec §7.2.2).
      out[d.name] = { body: bodyOf(raw), raw };
      count++;
    } catch {
      // no readable SKILL.md — skip.
    }
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.error(`build-bodies: wrote ${count} skill body/bodies -> site/public/skills.json`);
}

main();
