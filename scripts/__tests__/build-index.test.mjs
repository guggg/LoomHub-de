import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  splitFrontmatter,
  isValidDate,
  hasRequiredHeadings,
  checkCompliance,
  toIndexEntry,
  TYPE_WHITELIST,
  CATEGORY_WHITELIST,
} from "../build-index.mjs";

// ---------------------------------------------------------------------------
// splitFrontmatter — the YAML fence regex. This is the single riskiest regex
// in the file: everything downstream depends on it correctly separating
// frontmatter from body, including across CRLF line endings and bodies that
// themselves contain "---" (markdown horizontal rules).
// ---------------------------------------------------------------------------
describe("splitFrontmatter", () => {
  it("splits a well-formed LF frontmatter fence", () => {
    const raw = "---\nname: foo\n---\n\n## body\ntext\n";
    const out = splitFrontmatter(raw);
    expect(out).toEqual({ yaml: "name: foo", body: "\n## body\ntext\n" });
  });

  it("splits a CRLF frontmatter fence", () => {
    const raw = "---\r\nname: foo\r\n---\r\n\r\n## body\r\ntext\r\n";
    const out = splitFrontmatter(raw);
    expect(out.yaml).toBe("name: foo");
    expect(out.body).toContain("## body");
  });

  it("does not stop at a body that itself contains a --- horizontal rule", () => {
    const raw = "---\nname: foo\n---\n\n## 用途 / What\nx\n\n---\n\n## 使用場景 / When\ny\n";
    const out = splitFrontmatter(raw);
    expect(out.yaml).toBe("name: foo");
    // The body should retain the horizontal rule; only the FIRST closing
    // fence terminates frontmatter because the yaml capture is non-greedy
    // but anchored to the immediately-following closing fence line.
    expect(out.body).toContain("---");
    expect(out.body).toContain("使用場景 / When");
  });

  it("returns null when there is no frontmatter fence at all", () => {
    expect(splitFrontmatter("# just a heading\nbody text\n")).toBeNull();
  });

  it("returns null for a completely empty (blank) frontmatter fence", () => {
    // `---\n---\nbody` has no content line between the fences, so the
    // regex (which requires \n before the closing ---) cannot match at all.
    // This is a real gap: a contributor who leaves frontmatter totally blank
    // gets "no YAML frontmatter fence" instead of a more specific error.
    expect(splitFrontmatter("---\n---\nbody\n")).toBeNull();
  });

  it("matches an frontmatter fence with only a blank line as content", () => {
    const raw = "---\n\n---\nbody\n";
    const out = splitFrontmatter(raw);
    expect(out).toEqual({ yaml: "", body: "body\n" });
  });

  it("handles a missing trailing newline after the closing fence", () => {
    const raw = "---\nname: foo\n---";
    const out = splitFrontmatter(raw);
    expect(out.yaml).toBe("name: foo");
    expect(out.body).toBe("");
  });

  it("does not match a fence that isn't anchored at the very start of file", () => {
    const raw = "\n---\nname: foo\n---\nbody\n";
    expect(splitFrontmatter(raw)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidDate
// ---------------------------------------------------------------------------
describe("isValidDate", () => {
  it("accepts a real calendar date", () => {
    expect(isValidDate("2026-07-13")).toBe(true);
  });

  it("accepts a leap-year Feb 29", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("rejects a non-leap-year Feb 29", () => {
    expect(isValidDate("2023-02-29")).toBe(false);
  });

  it("rejects an out-of-range month", () => {
    expect(isValidDate("2026-13-01")).toBe(false);
  });

  it("rejects an out-of-range day (rolls over via Date, caught by the re-check)", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
  });

  it("rejects wrong shape (single-digit month/day)", () => {
    expect(isValidDate("2026-7-13")).toBe(false);
  });

  it("rejects non-string input (e.g. YAML parsed a bare date as something else)", () => {
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate(20260713)).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });

  it("rejects a date with a time component appended", () => {
    expect(isValidDate("2026-07-13T00:00:00Z")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasRequiredHeadings
// ---------------------------------------------------------------------------
describe("hasRequiredHeadings", () => {
  const FULL_BODY = "## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n";

  it("returns [] (no missing headings) when all three exist", () => {
    expect(hasRequiredHeadings(FULL_BODY)).toEqual([]);
  });

  it("reports every missing heading by label", () => {
    expect(hasRequiredHeadings("no headings here")).toEqual([
      "用途 / What",
      "使用場景 / When",
      "使用方式 / How",
    ]);
  });

  it("matches h1 through h6 heading depths", () => {
    expect(hasRequiredHeadings("# 用途\n### 使用場景\n###### 使用方式\n")).toEqual([]);
  });

  it("matches even without a space after the heading marker", () => {
    expect(hasRequiredHeadings("##用途\n##使用場景\n##使用方式\n")).toEqual([]);
  });

  it("does NOT match heading text that isn't preceded by a # marker", () => {
    expect(hasRequiredHeadings("用途 / What (plain text, no heading)\n")).toEqual([
      "用途 / What",
      "使用場景 / When",
      "使用方式 / How",
    ]);
  });

  it("partial match: only some headings missing", () => {
    expect(hasRequiredHeadings("## 用途\ntext\n## 使用方式\ntext\n")).toEqual([
      "使用場景 / When",
    ]);
  });
});

// ---------------------------------------------------------------------------
// checkCompliance — the §5.1 hard-check-item generator (build-index emits
// these as non-blocking warnings; AGENTS.md treats the same items as blocking).
// ---------------------------------------------------------------------------
describe("checkCompliance", () => {
  const GOOD_FM = {
    name: "foo-bar",
    description: "d",
    type: "skill",
    category: "development",
    tags: ["a"],
    version: "1.0.0",
    owner: "@me",
    updated: "2026-07-13",
  };
  const GOOD_BODY = "## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n";

  it("returns [] for a fully compliant skill", () => {
    expect(checkCompliance(GOOD_FM, "foo-bar", GOOD_BODY)).toEqual([]);
  });

  it("flags each missing required field individually", () => {
    const fm = { name: "foo-bar" };
    const warnings = checkCompliance(fm, "foo-bar", GOOD_BODY);
    for (const f of ["description", "type", "category", "tags", "version", "owner", "updated"]) {
      expect(warnings.some((w) => w.includes(`\`${f}\``))).toBe(true);
    }
  });

  it("flags name != folder name", () => {
    const warnings = checkCompliance({ ...GOOD_FM, name: "other-name" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes('name "other-name" != folder name "foo-bar"'))).toBe(
      true
    );
  });

  it("flags a non-kebab-case name even if it matches the folder", () => {
    const warnings = checkCompliance({ ...GOOD_FM, name: "Foo_Bar" }, "Foo_Bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes("not kebab-case"))).toBe(true);
  });

  it("flags type not in whitelist", () => {
    const warnings = checkCompliance({ ...GOOD_FM, type: "kb-template" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes('type "kb-template" not in whitelist'))).toBe(true);
  });

  it("flags category not in whitelist", () => {
    const warnings = checkCompliance({ ...GOOD_FM, category: "aws" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes('category "aws" not in whitelist'))).toBe(true);
  });

  it("flags invalid semver (missing patch segment)", () => {
    const warnings = checkCompliance({ ...GOOD_FM, version: "1.0" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes("not valid semver"))).toBe(true);
  });

  it("flags invalid semver (v-prefixed)", () => {
    const warnings = checkCompliance({ ...GOOD_FM, version: "v1.0.0" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes("not valid semver"))).toBe(true);
  });

  it("accepts a YAML-parsed numeric-looking version because it is coerced via String()", () => {
    // yaml.parse('version: 1.0.0') keeps it a string (three segments isn't a
    // valid number literal), so this is the realistic case — still exercise
    // the String() coercion path directly for a non-string input.
    const warnings = checkCompliance({ ...GOOD_FM, version: 1.0 }, "foo-bar", GOOD_BODY);
    // String(1.0) === "1" -> fails the x.y.z pattern; must be flagged, not silently accepted.
    expect(warnings.some((w) => w.includes("not valid semver"))).toBe(true);
  });

  it("flags an invalid updated date", () => {
    const warnings = checkCompliance({ ...GOOD_FM, updated: "13-07-2026" }, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.includes("not a valid YYYY-MM-DD date"))).toBe(true);
  });

  it("flags missing body headings", () => {
    const warnings = checkCompliance(GOOD_FM, "foo-bar", "no headings at all");
    expect(warnings.some((w) => w.includes("missing body heading(s)"))).toBe(true);
    expect(warnings.some((w) => w.includes("用途 / What"))).toBe(true);
  });

  it("does NOT flag missing optional source/license fields", () => {
    // source/license are optional per schema — checkCompliance must never
    // treat their absence as a violation.
    const warnings = checkCompliance(GOOD_FM, "foo-bar", GOOD_BODY);
    expect(warnings.some((w) => w.toLowerCase().includes("source"))).toBe(false);
    expect(warnings.some((w) => w.toLowerCase().includes("license"))).toBe(false);
  });

  it("never throws on a completely malformed frontmatter object", () => {
    expect(() => checkCompliance({}, "folder", "")).not.toThrow();
    expect(() => checkCompliance({ tags: { weird: true } }, "folder", "")).not.toThrow();
  });

  it("accumulates every distinct violation in a single pass (multi-error skill)", () => {
    const badFm = {
      name: "not-matching-folder",
      description: "d",
      type: "nonsense",
      category: "nonsense2",
      tags: "not-an-array-but-tags-is-not-checked-here",
      version: "v1.0",
      owner: "@me",
      updated: "13-07-2026",
    };
    const warnings = checkCompliance(badFm, "bad-one", "no headings");
    // name-mismatch + type + category + version + updated + missing-headings = 6
    expect(warnings.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// toIndexEntry
// ---------------------------------------------------------------------------
describe("toIndexEntry", () => {
  it("emits exactly the documented field set, in order, plus path", () => {
    const fm = {
      name: "foo",
      description: "d",
      type: "skill",
      category: "development",
      tags: ["a", "b"],
      version: "1.0.0",
      owner: "@me",
      updated: "2026-07-13",
    };
    const entry = toIndexEntry(fm, "skills/foo");
    expect(Object.keys(entry)).toEqual([
      "name",
      "description",
      "type",
      "category",
      "tags",
      "version",
      "owner",
      "updated",
      "source",
      "license",
      "path",
    ]);
    expect(entry.source).toBeNull();
    expect(entry.license).toBeNull();
    expect(entry.path).toBe("skills/foo");
  });

  it("carries through source/license when present (externally-collected asset)", () => {
    const fm = { source: "https://example.com/x", license: "MIT" };
    const entry = toIndexEntry(fm, "skills/x");
    expect(entry.source).toBe("https://example.com/x");
    expect(entry.license).toBe("MIT");
  });

  it("normalizes a missing tags field to an empty array, not null", () => {
    const entry = toIndexEntry({}, "skills/x");
    expect(entry.tags).toEqual([]);
  });

  it("wraps a scalar tags value into a single-element array instead of preserving type", () => {
    // Documents the current (arguably wrong) behavior for fm.tags being a
    // bare string rather than an array — the §5.1 checker never validates
    // tags' *type*, only its presence, so this shape can reach the index.
    const entry = toIndexEntry({ tags: "not-an-array" }, "skills/x");
    expect(entry.tags).toEqual(["not-an-array"]);
  });

  it("does not throw when tags is an object (fully malformed frontmatter)", () => {
    expect(() => toIndexEntry({ tags: { weird: true } }, "skills/x")).not.toThrow();
  });

  it("defaults every other missing field to null rather than undefined", () => {
    const entry = toIndexEntry({}, "skills/x");
    for (const f of ["name", "description", "type", "category", "version", "owner", "updated"]) {
      expect(entry[f]).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Whitelists — must stay in sync with schema/skill.schema.json (Spec §4).
// This test locks the values so a silent edit to one but not the other is
// caught immediately.
// ---------------------------------------------------------------------------
describe("whitelists match the schema contract", () => {
  it("TYPE_WHITELIST matches schema/skill.schema.json's type enum", () => {
    expect(TYPE_WHITELIST).toEqual(["skill", "prompt", "mcp-server", "workflow"]);
  });

  it("CATEGORY_WHITELIST matches schema/skill.schema.json's category enum", () => {
    expect(CATEGORY_WHITELIST).toEqual([
      "requirements",
      "design",
      "development",
      "testing",
      "ops",
      "docs",
      "research",
      "general",
    ]);
  });
});

// ---------------------------------------------------------------------------
// End-to-end sanity: parseYaml + splitFrontmatter + checkCompliance composed
// the same way main() composes them, over a handful of realistic SKILL.md
// bodies, to prove the "parse -> warn -> never crash" pipeline holds.
// ---------------------------------------------------------------------------
describe("full frontmatter pipeline (mirrors main()'s per-file logic)", () => {
  function process(raw, folderName) {
    const split = splitFrontmatter(raw);
    if (!split) return { skipped: true, reason: "no fence" };
    let fm;
    try {
      fm = parseYaml(split.yaml);
    } catch (err) {
      return { skipped: true, reason: "yaml parse error: " + err.message };
    }
    if (fm == null || typeof fm !== "object" || Array.isArray(fm)) {
      return { skipped: true, reason: "not a mapping" };
    }
    const warnings = checkCompliance(fm, folderName, split.body);
    return { skipped: false, warnings, entry: toIndexEntry(fm, `skills/${folderName}`) };
  }

  it("valid skill: no warnings, entry produced", () => {
    const raw =
      "---\nname: ok\ndescription: d\ntype: skill\ncategory: development\ntags: []\nversion: 1.0.0\nowner: \"@me\"\nupdated: 2026-07-13\n---\n\n## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n";
    const result = process(raw, "ok");
    expect(result.skipped).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("missing frontmatter fence: skipped, not crashed", () => {
    const result = process("# no frontmatter\nbody\n", "no-fm");
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("no fence");
  });

  it("malformed YAML: skipped with a parse-error reason, not crashed", () => {
    // Unterminated flow sequence -> yaml throws.
    const raw = "---\nname: [unterminated\n---\nbody\n";
    const result = process(raw, "bad-yaml");
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/yaml parse error/);
  });

  it("frontmatter that parses to a YAML list (not a mapping): skipped, not crashed", () => {
    const raw = "---\n- a\n- b\n---\nbody\n";
    const result = process(raw, "list-fm");
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("not a mapping");
  });

  it("frontmatter that parses to a bare scalar (not a mapping): skipped, not crashed", () => {
    const raw = "---\njust a string\n---\nbody\n";
    const result = process(raw, "scalar-fm");
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("not a mapping");
  });

  it("CRLF file with fully valid frontmatter parses and produces an entry", () => {
    const raw =
      "---\r\nname: crlf-ok\r\ndescription: d\r\ntype: skill\r\ncategory: development\r\ntags: []\r\nversion: 1.0.0\r\nowner: \"@me\"\r\nupdated: 2026-07-13\r\n---\r\n\r\n## 用途 / What\r\nx\r\n## 使用場景 / When\r\ny\r\n## 使用方式 / How\r\nz\r\n";
    const result = process(raw, "crlf-ok");
    expect(result.skipped).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("body containing a markdown horizontal rule (---) still parses correctly", () => {
    const raw =
      "---\nname: hr-ok\ndescription: d\ntype: skill\ncategory: development\ntags: []\nversion: 1.0.0\nowner: \"@me\"\nupdated: 2026-07-13\n---\n\n## 用途 / What\nx\n\n---\n\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n";
    const result = process(raw, "hr-ok");
    expect(result.skipped).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it("multi-violation skill: every violation surfaces, still produces an entry (non-blocking)", () => {
    const raw =
      "---\nname: mismatched\ndescription: d\ntype: bogus\ncategory: bogus2\nversion: v1\nowner: \"@me\"\nupdated: bad-date\n---\nno headings\n";
    const result = process(raw, "real-folder-name");
    expect(result.skipped).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.entry).toBeTruthy(); // non-blocking: still indexed despite warnings
  });
});
