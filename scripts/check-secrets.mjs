#!/usr/bin/env node
/**
 * check-secrets.mjs — staged-diff credential scan (advisory, non-blocking)
 *
 * Why this exists: the hub is a public repo, and a live credential pushed to a
 * public repo is compromised the moment it lands — history, forks, and scanner
 * bots see it before anyone can `git rm` it. Detecting it afterwards is too
 * late; the only real remediation is ROTATING the credential. So the one place
 * a check is worth anything is *before* the commit exists.
 *
 * Scope is deliberately narrow — only what is **structurally detectable**:
 * credentials with a fixed shape (`AKIA…`, `ghp_…`, `AccountKey=…`, PEM
 * blocks). It does NOT try to catch company proprietary nouns or internal
 * facts written in ordinary prose — those have no signature, so a scanner
 * either needs a denylist (which would itself be the most sensitive file in
 * the repo) or produces noise. Those stay a human-review concern.
 *
 * Advisory, never blocking: it warns and exits 0, always. This repo is
 * trust-based / no-PR with no CI gate (ADR-0006) — a hard gate here would
 * contradict that, and a hook that blocks gets disabled, which is worse than a
 * hook that nags. Same non-blocking spirit as check-version-bump.mjs.
 *
 * Usage:
 *   node scripts/check-secrets.mjs          # scan staged changes
 *   npm run check-secrets
 *   npm run hooks:install                   # wire it up as a pre-commit hook
 *
 * If the `gitleaks` binary is on PATH it is also run over the same staged
 * diff, for far broader rule coverage than the built-in set. It is optional on
 * purpose: contributors must not need to install anything for the hook to do
 * something useful.
 *
 * Exit codes:
 *   0 — always.
 */

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { runGit } from "./check-updates.mjs";

/**
 * Paths whose *content* is expected to contain credential-shaped strings:
 * this scanner's own rules, and its test fixtures. Without this, the scanner
 * flags itself on every commit that touches it.
 */
const SELF_PATHS = [
  "scripts/check-secrets.mjs",
  "scripts/__tests__/check-secrets.test.mjs",
];

/**
 * High-confidence credential shapes. Each rule's `group` (default 0) is the
 * capture group holding the secret value — used for placeholder filtering and
 * redacted reporting.
 */
export const RULES = [
  {
    id: "private-key",
    label: "PEM private key block",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
  },
  {
    id: "aws-access-key-id",
    label: "AWS access key ID",
    re: /\b(?:AKIA|ASIA|ABIA|ACCA|A3T[A-Z0-9])[A-Z0-9]{16}\b/g,
  },
  {
    id: "azure-storage-key",
    label: "Azure storage account key (connection string)",
    re: /AccountKey=([A-Za-z0-9+/=]{40,})/g,
    group: 1,
  },
  {
    id: "azure-sas-signature",
    label: "Azure SAS token signature",
    re: /[?&]sig=([A-Za-z0-9%+/=]{30,})/g,
    group: 1,
  },
  {
    id: "databricks-pat",
    label: "Databricks personal access token",
    re: /\bdapi[0-9a-f]{32}\b/g,
  },
  {
    id: "github-token",
    label: "GitHub token",
    re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  },
  {
    id: "anthropic-key",
    label: "Anthropic API key",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: "openai-key",
    label: "OpenAI API key",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g,
  },
  {
    id: "google-api-key",
    label: "Google API key",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "slack-token",
    label: "Slack token",
    re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  },
  {
    id: "jwt",
    label: "JWT (may carry identity/claims)",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  },
  {
    id: "db-connection-password",
    label: "password inside a connection string",
    re: /\b(?:Password|Pwd)=([^;\s"'<>]{6,})/gi,
    group: 1,
  },
  {
    id: "assigned-secret",
    label: "secret-looking assignment",
    re: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b["'\s]*[:=]\s*["']?([^\s"',;]{8,})/gi,
    group: 1,
  },
];

/**
 * True if a matched value is obviously not a real credential — docs,
 * templates, and CI YAML are full of these, and flagging them trains people
 * to ignore the hook.
 */
export function isPlaceholder(value) {
  if (!value) return true;
  // Shell/CI/template interpolation, or an angle-bracket fill-in-the-blank.
  if (/[${}<>]/.test(value)) return true;
  if (/^%[A-Za-z0-9_]+%$/.test(value)) return true;
  // Redaction / example markers anywhere in the value.
  if (/example|redact|placeholder|changeme|change-me|your[_-]?|dummy|sample|fake|todo|xxxx|\.\.\.|…/i.test(value)) {
    return true;
  }
  // Masked or single-character runs (****, aaaaaaaa, 00000000).
  if (/^(.)\1*$/.test(value)) return true;
  return false;
}

/** Report a match without reprinting the secret into terminal scrollback/logs. */
export function redact(value) {
  if (value.length <= 4) return `${"*".repeat(value.length)} (${value.length} chars)`;
  return `${value.slice(0, 4)}${"*".repeat(Math.min(8, value.length - 4))} (${value.length} chars)`;
}

/** Scan one line of text against RULES. Returns [{ruleId, label, value}]. */
export function scanLine(text) {
  const findings = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      const value = rule.group ? m[rule.group] : m[0];
      if (isPlaceholder(value)) continue;
      findings.push({ ruleId: rule.id, label: rule.label, value });
      if (m[0] === "") break; // paranoia: never loop on a zero-width match
    }
  }
  return findings;
}

/**
 * Parse a unified diff into the ADDED lines only, per file. Removed and
 * context lines are irrelevant — a secret being deleted is not a new leak, and
 * context lines would re-flag it on every neighbouring edit.
 *
 * Returns [{ file, lineNo, text }]. Line numbers come from the `+` side of
 * each hunk header, so they point at the post-commit file.
 */
export function parseAddedLines(diffText) {
  const out = [];
  let file = null;
  let lineNo = 0;
  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const path = raw.slice(4).trim();
      file = path === "/dev/null" ? null : path.replace(/^b\//, "");
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      lineNo = m ? Number(m[1]) : 0;
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      if (file) out.push({ file, lineNo, text: raw.slice(1) });
      lineNo += 1;
      continue;
    }
    if (raw.startsWith("-") || raw.startsWith("\\")) continue; // removed / "no newline"
    if (raw.startsWith(" ")) lineNo += 1; // context line advances the + side too
  }
  return out;
}

/** Scan a unified diff. Returns [{file, lineNo, ruleId, label, value}]. */
export function scanDiff(diffText, { skipPaths = SELF_PATHS } = {}) {
  const findings = [];
  for (const { file, lineNo, text } of parseAddedLines(diffText)) {
    if (skipPaths.includes(file)) continue;
    for (const f of scanLine(text)) findings.push({ file, lineNo, ...f });
  }
  return findings;
}

/** Optional deeper pass: gitleaks over the same staged diff, if installed. */
function runGitleaksIfPresent(cwd) {
  const probe = spawnSync("gitleaks", ["version"], { cwd, encoding: "utf8" });
  if (probe.error) return null; // not installed — expected, not an error
  const res = spawnSync("gitleaks", ["protect", "--staged", "--redact", "--no-banner"], {
    cwd,
    encoding: "utf8",
  });
  return { leaksFound: res.status !== 0, output: `${res.stdout ?? ""}${res.stderr ?? ""}`.trim() };
}

function main() {
  const cwd = process.cwd();
  let diff;
  try {
    diff = runGit(["diff", "--cached", "-U0", "--no-color", "--diff-filter=ACMR"], cwd);
  } catch (err) {
    console.error(`[check-secrets] could not read staged diff: ${err.message}`);
    process.exit(0); // advisory tool — never fail the caller's flow
  }

  const findings = scanDiff(diff);
  if (findings.length > 0) {
    console.error("");
    console.error("⚠️  [check-secrets] 疑似憑證出現在這次 staged 的變更裡：");
    for (const f of findings) {
      console.error(`  - ${f.file}:${f.lineNo}  [${f.ruleId}] ${f.label} → ${redact(f.value)}`);
    }
    console.error("");
    console.error("這是公開 repo：憑證一旦 push 出去就等於已洩漏（history / fork / 掃描 bot 都拿得到），");
    console.error("刪掉 commit 沒有用 —— 唯一有效的補救是「去把那把金鑰換掉（rotate）」。");
    console.error("請在 commit 前移除，改用環境變數 / secret store 引用。若是誤判，直接繼續 commit 即可。");
    console.error("");
  }

  const gitleaks = runGitleaksIfPresent(cwd);
  if (gitleaks?.leaksFound) {
    console.error("⚠️  [check-secrets] gitleaks 另外也有發現（規則覆蓋比內建更廣）：");
    console.error(gitleaks.output);
    console.error("");
  }

  if (findings.length === 0 && !gitleaks?.leaksFound) {
    const engine = gitleaks ? "內建規則 + gitleaks" : "內建規則（未安裝 gitleaks，可選）";
    console.error(`[check-secrets] staged 變更未發現憑證特徵（${engine}）。`);
  }

  process.exit(0); // advisory only — never blocks commit (ADR-0006, trust-based)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
