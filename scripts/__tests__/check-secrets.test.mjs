import { describe, it, expect } from "vitest";
import {
  RULES,
  COMPANY_DENYLIST,
  isPlaceholder,
  redact,
  scanLine,
  parseAddedLines,
  scanDiff,
} from "../check-secrets.mjs";

// Every credential-shaped string below is synthetic — invented for this test,
// never a real key. The scanner skips its own test file (SELF_PATHS) so these
// fixtures don't make the hook flag itself.
//
// Fixtures are assembled via string concatenation (prefix + "" + suffix)
// rather than written as one contiguous literal. This is NOT about evading
// our own scanner (SELF_PATHS already exempts this file) — it's so GitHub's
// own push-protection secret scanner, which reads the raw file bytes, doesn't
// mistake a realistic-looking test fixture for a live credential and block
// the push.

const AWS_KEY = "AKIA" + "" + "IOSFODNN7SNTHETC";
const DATABRICKS_PAT = "dapi" + "" + "0123456789abcdef0123456789abcdef";
const GITHUB_TOKEN = "ghp_" + "" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SLACK_TOKEN = "xoxb-1234567890-" + "" + "nOtARealSlackToken";
const ANTHROPIC_KEY = "sk-ant-api03-" + "" + "nOtARealKeyJustATestFixture123456";
const OPENAI_KEY = "sk-proj-" + "" + "nOtARealOpenAiKeyJustATestFixture1234567890";
const GOOGLE_KEY = "AIzaSyD-" + "" + "nOtARealGoogleKey_TestFixture12";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0." + "" + "dBjftJeZ4CVPmB92K27uhbUJU1p1r";
const AZURE_ACCOUNT_KEY = "Zm9vYmFyYmF6cXV1eGNvcmdlZ3JhdWx0d2FsZG9mcmVkNTQzMjE9";

describe("scanLine", () => {
  it("catches an AWS access key ID", () => {
    const found = scanLine(`aws_access_key_id = ${AWS_KEY}`);
    expect(found.map((f) => f.ruleId)).toContain("aws-access-key-id");
  });

  it("catches a PEM private key header", () => {
    expect(scanLine("-----BEGIN RSA PRIVATE KEY-----")[0].ruleId).toBe("private-key");
  });

  it("catches an Azure storage AccountKey and reports only the value", () => {
    const found = scanLine(`DefaultEndpointsProtocol=https;AccountKey=${AZURE_ACCOUNT_KEY};`);
    const hit = found.find((f) => f.ruleId === "azure-storage-key");
    expect(hit.value).toBe(AZURE_ACCOUNT_KEY);
  });

  it("catches a Databricks PAT", () => {
    const found = scanLine(`DATABRICKS_TOKEN=${DATABRICKS_PAT}`);
    expect(found.map((f) => f.ruleId)).toContain("databricks-pat");
  });

  it("catches a GitHub token", () => {
    const found = scanLine(`token: ${GITHUB_TOKEN}`);
    expect(found.map((f) => f.ruleId)).toContain("github-token");
  });

  it("catches a password inside a connection string", () => {
    const found = scanLine("Server=x;User Id=sa;Password=hunter2hunter2;");
    expect(found.map((f) => f.ruleId)).toContain("db-connection-password");
  });

  it("ignores ordinary prose and code", () => {
    expect(scanLine("This skill documents the ETL go-live checklist.")).toEqual([]);
    expect(scanLine('const url = "https://github.com/langchain-ai/openwiki";')).toEqual([]);
  });

  it("finds every rule at least once across a combined fixture (no dead rules)", () => {
    const fixture = [
      "-----BEGIN PRIVATE KEY-----",
      AWS_KEY,
      `AccountKey=${AZURE_ACCOUNT_KEY}`,
      `https://acct.blob.core.windows.net/c/b?sv=2021&sig=aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789%2F`,
      DATABRICKS_PAT,
      GITHUB_TOKEN,
      ANTHROPIC_KEY,
      OPENAI_KEY,
      GOOGLE_KEY,
      SLACK_TOKEN,
      JWT,
      "Password=hunter2hunter2;",
      'client_secret: "nOtARealClientSecretValue123"',
      ...COMPANY_DENYLIST,
    ].join("\n");
    const seen = new Set(fixture.split("\n").flatMap((l) => scanLine(l)).map((f) => f.ruleId));
    for (const rule of RULES) expect(seen, `rule ${rule.id} never matched`).toContain(rule.id);
  });

  it("is stateless across calls (global regex lastIndex is reset)", () => {
    const line = `key: ${AWS_KEY}`;
    const first = scanLine(line);
    expect(scanLine(line)).toEqual(first);
    expect(scanLine(line)).toEqual(first);
  });
});

describe("company denylist", () => {
  it("flags every configured term at least once", () => {
    for (const term of COMPANY_DENYLIST) {
      const found = scanLine(`some text mentioning ${term} in passing`);
      expect(found.some((f) => f.ruleId === `company-name:${term}`), `term "${term}" not flagged`).toBe(true);
    }
  });

  it("marks company matches as non-sensitive (shown plainly, not redacted)", () => {
    const [hit] = scanLine("BRAND: Cathay green");
    expect(hit.sensitive).toBe(false);
  });

  it("is NOT filtered by the credential placeholder heuristic", () => {
    // "Cathay" would not normally look like a placeholder, but this asserts
    // company-denylist matches bypass isPlaceholder entirely (by design —
    // a company name is never a "fake example value").
    const found = scanLine("Cathay");
    expect(found.map((f) => f.ruleId)).toContain("company-name:Cathay");
  });

  it("does not match inside an unrelated longer word (ASCII terms are word-bounded)", () => {
    const found = scanLine("xCathayx and Cathayxyz are not the company name");
    expect(found.some((f) => f.ruleId === "company-name:Cathay")).toBe(false);
  });

  it("matches the Chinese company name without word boundaries (CJK has none)", () => {
    expect(scanLine("這是國泰的內部系統").some((f) => f.ruleId === "company-name:國泰")).toBe(true);
  });

  it("flows through scanDiff on an added line, reported unredacted", () => {
    const diff = [
      "+++ b/site/src/theme.css",
      "@@ -0,0 +1 @@",
      "+/* BRAND: 國泰金控 (Cathay Financial Holdings) */",
    ].join("\n");
    const hits = scanDiff(diff);
    expect(hits.some((f) => f.ruleId === "company-name:Cathay Financial Holdings")).toBe(true);
    expect(hits.some((f) => f.ruleId === "company-name:國泰金控")).toBe(true);
  });
});

describe("isPlaceholder", () => {
  it.each([
    "${AZURE_KEY}",
    "$DATABRICKS_TOKEN",
    "<your-key-here>",
    "%API_KEY%",
    "your-api-key",
    "changeme",
    "REDACTED",
    "example-secret-value",
    "********",
    "aaaaaaaa",
    "TODO",
  ])("treats %s as a placeholder", (v) => {
    expect(isPlaceholder(v)).toBe(true);
  });

  it("does not treat a realistic value as a placeholder", () => {
    expect(isPlaceholder("hunter2hunter2")).toBe(false);
    expect(isPlaceholder(AWS_KEY)).toBe(false);
  });

  it("filters placeholders out of scanLine results", () => {
    expect(scanLine("password: ${DB_PASSWORD}")).toEqual([]);
    expect(scanLine('api_key = "your-api-key-here"')).toEqual([]);
    expect(scanLine("DATABRICKS_CLIENT_SECRET: $(DATABRICKS_CLIENT_SECRET)")).toEqual([]);
  });
});

describe("redact", () => {
  it("shows only a 4-char prefix plus a length", () => {
    const out = redact(AWS_KEY);
    expect(out.startsWith("AKIA")).toBe(true);
    expect(out).not.toContain("IOSFODNN7SNTHETC");
    expect(out).toContain("(20 chars)");
  });

  it("fully masks very short values", () => {
    expect(redact("abc")).toBe("*** (3 chars)");
  });
});

describe("parseAddedLines", () => {
  const diff = [
    "diff --git a/skills/x/SKILL.md b/skills/x/SKILL.md",
    "--- a/skills/x/SKILL.md",
    "+++ b/skills/x/SKILL.md",
    "@@ -1,2 +1,3 @@",
    " context line",
    "-removed line",
    "+added line one",
    "+added line two",
  ].join("\n");

  it("returns only added lines, stripped of the + marker", () => {
    expect(parseAddedLines(diff).map((l) => l.text)).toEqual(["added line one", "added line two"]);
  });

  it("attributes lines to the right file with post-commit line numbers", () => {
    const [a, b] = parseAddedLines(diff);
    expect(a.file).toBe("skills/x/SKILL.md");
    expect(a.lineNo).toBe(2); // line 1 is the context line
    expect(b.lineNo).toBe(3);
  });

  it("skips a deleted file's /dev/null side", () => {
    const deleted = ["--- a/gone.txt", "+++ /dev/null", "@@ -1 +0,0 @@", "-bye"].join("\n");
    expect(parseAddedLines(deleted)).toEqual([]);
  });

  it("tracks line numbers across multiple hunks", () => {
    const multi = [
      "+++ b/f.txt",
      "@@ -1 +1 @@",
      "+first",
      "@@ -50,0 +90,2 @@",
      "+ninetieth",
      "+ninety-first",
    ].join("\n");
    expect(parseAddedLines(multi).map((l) => l.lineNo)).toEqual([1, 90, 91]);
  });
});

describe("scanDiff", () => {
  it("flags a secret on an added line with file and line", () => {
    const diff = [
      "+++ b/skills/x/SKILL.md",
      "@@ -0,0 +1 @@",
      `+export AWS_ACCESS_KEY_ID=${AWS_KEY}`,
    ].join("\n");
    const [hit] = scanDiff(diff);
    expect(hit.file).toBe("skills/x/SKILL.md");
    expect(hit.lineNo).toBe(1);
    expect(hit.ruleId).toBe("aws-access-key-id");
  });

  it("ignores a secret being REMOVED (deleting a leak is not a new leak)", () => {
    const diff = [
      "+++ b/skills/x/SKILL.md",
      "@@ -1 +0,0 @@",
      `-export AWS_ACCESS_KEY_ID=${AWS_KEY}`,
    ].join("\n");
    expect(scanDiff(diff)).toEqual([]);
  });

  it("ignores a secret sitting in an unchanged context line", () => {
    const diff = [
      "+++ b/skills/x/SKILL.md",
      "@@ -1,2 +1,2 @@",
      ` ${AWS_KEY}`,
      "+a harmless new line",
    ].join("\n");
    expect(scanDiff(diff)).toEqual([]);
  });

  it("skips the scanner's own files so it never flags itself", () => {
    const diff = [
      "+++ b/scripts/check-secrets.mjs",
      "@@ -0,0 +1 @@",
      "+  re: /\\b(?:AKIA)[A-Z0-9]{16}\\b/g,",
    ].join("\n");
    expect(scanDiff(diff)).toEqual([]);
  });

  it("returns nothing for an empty diff", () => {
    expect(scanDiff("")).toEqual([]);
  });
});
