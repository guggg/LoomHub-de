#!/usr/bin/env node
/**
 * heartbeat.mjs — Spec §7.3 companion / upstream-update detector (MVP)
 *
 * `check-updates.mjs` watches the direction **hub ↔ local clone** (did the
 * contributor's machine fall behind/ahead of this hub's origin/main?).
 * `heartbeat.mjs` watches the OTHER direction — **upstream ↔ hub**: for
 * externally-collected assets (frontmatter has a structured `upstream`
 * block), did the ORIGINAL project release something newer than what we
 * pinned when we collected it? Two independent axes, two scripts.
 *
 * heartbeat NEVER touches the working tree and NEVER auto-applies an
 * update — it only detects a gap and opens a GitHub issue to notify the
 * asset's `owner` (see AGENTS.md — no CI gate, trust-based hub; this is a
 * notifier, not an enforcer).
 *
 * MVP scope (anything else is gracefully skipped + reported, never fatal):
 *   - `upstream.type: github` only (npm / url left to a future iteration).
 *   - `upstream.track: release` only (tag / commit left to a future
 *     iteration).
 *   - Compares `upstream.ref` (what we pinned) against the repo's latest
 *     GitHub Release tag_name. semver-parseable on both sides → major/
 *     minor/patch level via the same comparator as check-updates.mjs;
 *     otherwise "the strings differ" is still reported, just with
 *     level "unknown".
 *
 * Usage:
 *   node scripts/heartbeat.mjs             # scan + open/dedup issues
 *   node scripts/heartbeat.mjs --dry-run    # scan + print report only,
 *                                           # never calls the Issues API
 *
 * Exit codes: always 0 — this is an advisory notifier, same non-blocking
 * spirit as check-updates.mjs / build-index.mjs. A hard failure to even
 * read skills/ is the only thing that would exit non-zero.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { splitFrontmatter } from "./build-index.mjs";
import {
  listLocalSkillNames,
  readLocalSkillMd,
  parseSemver,
  semverCompare,
  semverLevel,
  runGit,
} from "./check-updates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Frontmatter scan → eligible upstream-tracked candidates
// ---------------------------------------------------------------------------

/** Strip a leading "v" (common GitHub tag convention: v1.2.3). */
function stripV(s) {
  return typeof s === "string" ? s.replace(/^v/, "") : s;
}

/**
 * Scan skills/<name>/SKILL.md and split into:
 *   - candidates: eligible for the MVP github+release check.
 *   - skipped: { name, reason } for anything gracefully out of scope
 *     (no `upstream` field, unsupported type/track, missing repo/ref, or
 *     unreadable/unparsable frontmatter).
 *
 * Mirrors check-updates.mjs's "one bad skill never aborts the run" contract.
 */
export function collectUpstreamCandidates(repoRoot) {
  const names = listLocalSkillNames(repoRoot);
  const candidates = [];
  const skipped = [];

  for (const name of names) {
    const raw = readLocalSkillMd(repoRoot, name);
    if (raw == null) {
      skipped.push({ name, reason: "SKILL.md unreadable" });
      continue;
    }
    const split = splitFrontmatter(raw);
    if (!split) {
      skipped.push({ name, reason: "no YAML frontmatter fence (---)" });
      continue;
    }
    let fm;
    try {
      fm = parseYaml(split.yaml);
    } catch (err) {
      skipped.push({ name, reason: `frontmatter YAML parse error: ${err.message}` });
      continue;
    }
    if (fm == null || typeof fm !== "object" || Array.isArray(fm)) {
      skipped.push({ name, reason: "frontmatter is not a mapping" });
      continue;
    }

    const upstream = fm.upstream;
    if (upstream == null || typeof upstream !== "object" || Array.isArray(upstream)) {
      skipped.push({ name, reason: "no `upstream` field — not tracked by heartbeat" });
      continue;
    }
    if (upstream.type !== "github") {
      skipped.push({
        name,
        reason: `upstream.type "${upstream.type}" not supported yet (MVP: github only)`,
      });
      continue;
    }
    const track = upstream.track ?? "release";
    if (track !== "release") {
      skipped.push({
        name,
        reason: `upstream.track "${track}" not supported yet (MVP: release only)`,
      });
      continue;
    }
    if (!upstream.repo) {
      skipped.push({ name, reason: "upstream.repo missing" });
      continue;
    }
    if (!upstream.ref) {
      skipped.push({ name, reason: "upstream.ref missing — nothing to compare against" });
      continue;
    }

    candidates.push({
      name,
      owner: fm.owner ?? null,
      sourceUrl: fm.source ?? null,
      upstream,
    });
  }

  return { candidates, skipped };
}

// ---------------------------------------------------------------------------
// GitHub Releases API (injectable fetch, so tests never hit the network)
// ---------------------------------------------------------------------------

function ghHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "loomhub-de-heartbeat",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * GET /repos/{repo}/releases/latest. Returns:
 *   { ok: true, tagName } on 2xx with a tag_name
 *   { ok: false, status }  on any non-2xx (404/401/403/5xx/etc.)
 * Throws only on network-level failure (fetchFn itself rejects) — the
 * caller turns both cases into a warning, never a crash.
 */
export async function fetchLatestRelease(repo, fetchFn, token) {
  const res = await fetchFn(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const json = await res.json();
  if (!json || typeof json.tag_name !== "string") {
    return { ok: false, status: res.status, reason: "no tag_name in response" };
  }
  return { ok: true, tagName: json.tag_name };
}

/**
 * Compare a pinned ref against the latest tag. Semver-parseable on both
 * sides (after stripping a leading "v") → real major/minor/patch level.
 * Otherwise: identical strings = no update; different strings = update,
 * level "unknown" (can't rank the gap, but it IS a gap).
 */
export function compareUpstreamRef(ref, latestTag) {
  if (ref === latestTag) return { hasUpdate: false };
  const a = parseSemver(stripV(ref));
  const b = parseSemver(stripV(latestTag));
  if (a && b) {
    if (semverCompare(a, b) >= 0) return { hasUpdate: false };
    return { hasUpdate: true, level: semverLevel(a, b) };
  }
  return { hasUpdate: true, level: "unknown" };
}

/**
 * Core check (Spec MVP). Never throws — a single candidate's API failure
 * becomes a `warnings` entry and the loop continues (check-updates.mjs
 * contract). `deps.fetchFn` defaults to global fetch; `deps.token` is an
 * optional GitHub token for higher rate limits (not required for public
 * read-only `releases/latest`).
 */
export async function checkHeartbeat(repoRoot, deps = {}) {
  const fetchFn = deps.fetchFn ?? fetch;
  const token = deps.token;

  const { candidates, skipped } = collectUpstreamCandidates(repoRoot);
  const updates = [];
  const warnings = [];

  for (const c of candidates) {
    const { name, upstream } = c;
    let result;
    try {
      result = await fetchLatestRelease(upstream.repo, fetchFn, token);
    } catch (err) {
      warnings.push(`${name}: GitHub releases API call for ${upstream.repo} failed: ${err.message}`);
      continue;
    }
    if (!result.ok) {
      warnings.push(
        `${name}: GitHub releases API for ${upstream.repo} returned HTTP ${result.status}${
          result.reason ? ` (${result.reason})` : ""
        } — skipped`
      );
      continue;
    }

    const cmp = compareUpstreamRef(upstream.ref, result.tagName);
    if (cmp.hasUpdate) {
      updates.push({
        name,
        repo: upstream.repo,
        ref: upstream.ref,
        latest: result.tagName,
        level: cmp.level,
        checkedAt: upstream.checked_at ?? null,
        sourceUrl: c.sourceUrl,
        owner: c.owner,
      });
    }
  }

  return { updates, skipped, warnings };
}

// ---------------------------------------------------------------------------
// Human-readable report
// ---------------------------------------------------------------------------

export function formatReport(result) {
  const { updates, skipped, warnings } = result;
  const lines = [];

  if (updates.length) {
    lines.push("偵測到上游更新：");
    for (const u of updates) {
      lines.push(`  [update] ${u.name}: ${u.ref} -> ${u.latest} (${u.level}) [${u.repo}]`);
    }
  } else {
    lines.push("沒有偵測到上游更新。");
  }

  if (skipped.length) {
    lines.push("");
    lines.push(`略過（不追蹤 / MVP 範圍外，共 ${skipped.length} 項）：`);
    for (const s of skipped) lines.push(`  [skip]   ${s.name}: ${s.reason}`);
  }

  if (warnings.length) {
    lines.push("");
    lines.push("警告（查詢失敗，已略過、不影響其他結果）：");
    for (const w of warnings) lines.push(`  [warn]   ${w}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// GitHub Issues API — dedup + create (injectable fetch)
// ---------------------------------------------------------------------------

/** Dedup marker embedded in an issue body — one per asset, per convention. */
export function dedupMarker(name) {
  return `<!-- heartbeat:asset=${name} -->`;
}

export function buildIssueTitle(u) {
  return `[heartbeat] ${u.name}:上游更新 ${u.ref} → ${u.latest} (${u.level})`;
}

export function buildIssueBody(u) {
  const compareUrl = `https://github.com/${u.repo}/compare/${u.ref}...${u.latest}`;
  const lines = [
    dedupMarker(u.name),
    "",
    `- **資產路徑**：\`skills/${u.name}/\``,
    u.sourceUrl ? `- **Source**：${u.sourceUrl}` : null,
    `- **目前 pin 版本**：\`${u.ref}\`（checked_at: ${u.checkedAt ?? "unknown"}）`,
    `- **上游現況**：\`${u.latest}\``,
    `- **落差層級**：${u.level}`,
    `- **Compare**：${compareUrl}`,
    "",
    "heartbeat 只偵測不自動套用；跟進後請更新 `upstream.ref` + `upstream.checked_at` 並關閉此 issue。",
    u.owner ? `\n${u.owner} 麻煩追蹤一下。` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/**
 * List open issues labeled `heartbeat` on the hub repo itself (NOT the
 * asset's upstream repo — the notification target). Used purely for dedup.
 */
export async function listOpenHeartbeatIssues(hubRepo, fetchFn, token) {
  const res = await fetchFn(
    `https://api.github.com/repos/${hubRepo}/issues?state=open&labels=heartbeat`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(`list issues failed: HTTP ${res.status}`);
  }
  return await res.json();
}

/** First open issue whose body contains this asset's dedup marker, or null. */
export function findExistingIssue(issues, name) {
  const marker = dedupMarker(name);
  return issues.find((i) => typeof i.body === "string" && i.body.includes(marker)) ?? null;
}

export async function createHeartbeatIssue(hubRepo, fetchFn, token, update) {
  const res = await fetchFn(`https://api.github.com/repos/${hubRepo}/issues`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: buildIssueTitle(update),
      body: buildIssueBody(update),
      labels: ["heartbeat", "upstream-update"],
    }),
  });
  if (!res.ok) {
    throw new Error(`create issue failed: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Resolve the HUB's own "owner/repo" slug (for the Issues API target, not
 * an asset's upstream repo). `GITHUB_REPOSITORY` is set automatically by
 * GitHub Actions; falls back to parsing `git remote get-url origin` for
 * local/manual runs.
 */
export function resolveHubRepoSlug(repoRoot, env = process.env) {
  if (env.GITHUB_REPOSITORY) return env.GITHUB_REPOSITORY;
  try {
    const url = runGit(["remote", "get-url", "origin"], repoRoot).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
    if (m) return m[1];
  } catch {
    // fall through to null
  }
  return null;
}

/**
 * Open (deduped) issues for every detected update. Skips (no-op, logs)
 * anything that can't be resolved — missing token, unresolvable hub repo
 * slug, or a failed dedup/create call for one specific update. Never
 * throws.
 */
export async function openHeartbeatIssues(hubRepo, updates, deps = {}) {
  const fetchFn = deps.fetchFn ?? fetch;
  const token = deps.token;
  const log = deps.log ?? (() => {});

  let existing = [];
  try {
    existing = await listOpenHeartbeatIssues(hubRepo, fetchFn, token);
  } catch (err) {
    log(`[warn] 無法列出既有 heartbeat issue，本輪略過去重（可能重開）：${err.message}`);
    existing = [];
  }

  const created = [];
  for (const u of updates) {
    const dup = findExistingIssue(existing, u.name);
    if (dup) {
      log(`[skip]    ${u.name}: 已有開放中的 heartbeat issue（#${dup.number}），不重開`);
      continue;
    }
    try {
      const issue = await createHeartbeatIssue(hubRepo, fetchFn, token, u);
      log(`[created] ${u.name}: issue #${issue.number}`);
      created.push(issue);
    } catch (err) {
      log(`[warn]    ${u.name}: 開 issue 失敗：${err.message}`);
    }
  }
  return created;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const result = await checkHeartbeat(REPO_ROOT, {});
  console.log(formatReport(result));

  if (dryRun) {
    console.log("\n[dry-run] 不會開任何 issue。");
    process.exit(0);
  }

  if (result.updates.length === 0) {
    process.exit(0);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("[warn] GITHUB_TOKEN 未設定 — 無法開 issue，僅顯示上方報告。");
    process.exit(0);
  }

  const hubRepo = resolveHubRepoSlug(REPO_ROOT);
  if (!hubRepo) {
    console.error("[warn] 無法解析 hub 自身的 GitHub repo slug — 無法開 issue。");
    process.exit(0);
  }

  await openHeartbeatIssues(hubRepo, result.updates, {
    token,
    log: (msg) => console.error(msg),
  });

  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
