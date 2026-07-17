#!/usr/bin/env node
/**
 * taxonomy.mjs — single source of truth bridge (AGENTS.md header claim / ADR-0003)
 *
 * Reads schema/skill.schema.json at load time and derives the taxonomy
 * constants that build-index.mjs and install-skill.mjs need. This replaces
 * the two scripts' previously hand-maintained, independently-drifting copies
 * of TYPE_WHITELIST / CATEGORY_WHITELIST / REQUIRED_FIELDS.
 *
 * If the schema's `type`/`category` enums or `required` array ever change,
 * these constants update automatically on next run — no manual sync needed.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SCHEMA_PATH = join(REPO_ROOT, "schema", "skill.schema.json");

function loadSchema() {
  let raw;
  try {
    raw = readFileSync(SCHEMA_PATH, "utf8");
  } catch (err) {
    throw new Error(`[taxonomy] cannot read schema at ${SCHEMA_PATH}: ${err.message}`);
  }
  let schema;
  try {
    schema = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[taxonomy] schema at ${SCHEMA_PATH} is not valid JSON: ${err.message}`);
  }
  return schema;
}

const schema = loadSchema();

const typeEnum = schema?.properties?.type?.enum;
if (!Array.isArray(typeEnum) || typeEnum.length === 0) {
  throw new Error("[taxonomy] schema.properties.type.enum missing or empty");
}
const categoryEnum = schema?.properties?.category?.enum;
if (!Array.isArray(categoryEnum) || categoryEnum.length === 0) {
  throw new Error("[taxonomy] schema.properties.category.enum missing or empty");
}
const required = schema?.required;
if (!Array.isArray(required) || required.length === 0) {
  throw new Error("[taxonomy] schema.required missing or empty");
}

/** `type` whitelist — derived from schema.properties.type.enum (Spec §4.1). */
export const TYPE_WHITELIST = [...typeEnum];

/** `category` whitelist — derived from schema.properties.category.enum (Spec §4.2). */
export const CATEGORY_WHITELIST = [...categoryEnum];

/** Required frontmatter fields — derived from schema.required (Spec §3.1). */
export const REQUIRED_FIELDS = [...required];
