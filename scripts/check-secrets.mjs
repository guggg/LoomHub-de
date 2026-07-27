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
 * Scope is deliberately narrow — only what is **structurally detectable**
 * (credentials with a fixed shape: `AKIA…`, `ghp_…`, `AccountKey=…`, PEM
 * blocks) plus one closed, hand-maintained list: the company's own name and
 * domains (COMPANY_DENYLIST below). That list is intentionally small and
 * literal — it does NOT try to catch arbitrary business proprietary nouns or
 * internal facts written in ordinary prose. Those have no fixed signature, so
 * a scanner for them would either need an open-ended denylist (which would
 * itself become the most sensitive file in the repo) or produce constant
 * noise. Those stay a human-review concern (AGENTS.md §5.1 item 8).
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
 * The company's own name and domains. Deliberately closed and literal — this
 * is NOT the open-ended "proprietary noun" denylist the team already
 * concluded it can't compile (AGENTS.md §5.1 item 8); it is one small,
 * hand-maintained list of exact strings that identify who this hub belongs
 * to. Update this list if the company's name/domain set changes.
 */
export const COMPANY_DENYLIST = [
  "Cathay Financial Holdings",
  "Cathay",
  "國泰金控",
  "國泰",
  "cathayholdings.com.tw",
  "cathayholdings.com",
  "cathaylife.com.tw",
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Company-denylist rules, one per COMPANY_DENYLIST entry, ASCII terms word-bounded. */
function buildCompanyRules() {
  return COMPANY_DENYLIST.map((term) => {
    const isAscii = /^[\x00-\x7f]+$/.test(term);
    const escaped = escapeRegExp(term);
    return {
      id: `company-name:${term}`,
      label: `company-identifying term "${term}"`,
      sensitive: false, // not a secret to hide — show it plainly so the contributor sees what to remove
      re: new RegExp(isAscii ? `\\b${escaped}\\b` : escaped, "gi"),
    };
  });
}

/**
 * High-confidence credential shapes, plus the company denylist. Each rule's
 * `group` (default 0) is the capture group holding the matched value — used
 * for placeholder filtering and reporting. `sensitive` (default true) decides
 * whether the reported value is redacted (a real secret) or shown plainly (a
 * denylisted term — there's nothing to hide, the point is to show what to cut).
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
  ...buildCompanyRules(),
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

/** Scan one line of text against RULES. Returns [{ruleId, label, value, sensitive}]. */
export function scanLine(text) {
  const findings = [];
  for (const rule of RULES) {
    const sensitive = rule.sensitive !== false;
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      const value = rule.group ? m[rule.group] : m[0];
      if (sensitive && isPlaceholder(value)) continue;
      findings.push({ ruleId: rule.id, label: rule.label, value, sensitive });
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
  const secretFindings = findings.filter((f) => f.sensitive);
  const companyFindings = findings.filter((f) => !f.sensitive);

  if (secretFindings.length > 0) {
    console.error("");
    console.error("⚠️  [check-secrets] 疑似憑證出現在這次 staged 的變更裡：");
    for (const f of secretFindings) {
      console.error(`  - ${f.file}:${f.lineNo}  [${f.ruleId}] ${f.label} → ${redact(f.value)}`);
    }
    console.error("");
    console.error("這是公開 repo：憑證一旦 push 出去就等於已洩漏（history / fork / 掃描 bot 都拿得到），");
    console.error("刪掉 commit 沒有用 —— 唯一有效的補救是「去把那把金鑰換掉（rotate）」。");
    console.error("請在 commit 前移除，改用環境變數 / secret store 引用。若是誤判，直接繼續 commit 即可。");
    console.error("");
  }

  if (companyFindings.length > 0) {
    console.error("");
    console.error("⚠️  [check-secrets] 這次 staged 的變更裡出現了公司識別詞：");
    for (const f of companyFindings) {
      console.error(`  - ${f.file}:${f.lineNo}  ${f.label} → "${f.value}"`);
    }
    console.error("");
    console.error("這是公開 repo：公司名稱/網域一旦 push 出去就是永久曝光（history / fork 都留得住），");
    console.error("請在 commit 前移除或改成不具名描述。若是誤判，直接繼續 commit 即可。");
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
    console.error(`[check-secrets] staged 變更未發現憑證或公司識別詞特徵（${engine}）。`);
  }

  process.exit(0); // advisory only — never blocks commit (ADR-0006, trust-based)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
