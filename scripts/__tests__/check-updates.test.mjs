import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  parseSemver,
  semverCompare,
  semverLevel,
  runGit,
  assertGitRepo,
  fetchOrigin,
  listLocalSkillNames,
  listRemoteSkillNames,
  parseFrontmatterVersion,
  checkUpdates,
  formatText,
  parseArgs,
} from "../check-updates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const SCRIPT = join(REPO_ROOT, "scripts", "check-updates.mjs");

// ---------------------------------------------------------------------------
// Test-repo fixture builder. Everything happens inside a per-test tmp dir:
//   <tmp>/hub.git   — bare "origin"
//   <tmp>/clone     — the working clone under test (what the script runs in)
//   <tmp>/other     — a second clone used to push changes as "someone else"
// This exercises real git (fetch, show, ls-tree) rather than mocking it —
// the script's whole job is comparing local vs. origin/main via git plumbing.
// ---------------------------------------------------------------------------

function sh(cmd, cwd) {
  const res = spawnSync("bash", ["-c", cmd], { cwd, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`cmd failed: ${cmd}\n${res.stdout}\n${res.stderr}`);
  }
  return res.stdout;
}

function skillMd({ name, version, extra = "" }) {
  return (
    `---\nname: ${name}\ndescription: d\ntype: skill\ncategory: development\n` +
    `tags: []\nversion: ${version}\nowner: "@me"\nupdated: 2026-07-13\n---\n\n` +
    `## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n${extra}`
  );
}

function initHub(tmp) {
  const bare = join(tmp, "hub.git");
  const seed = join(tmp, "seed");
  mkdirSync(bare);
  sh("git init --bare -q .", bare);

  mkdirSync(seed);
  sh("git init -q .", seed);
  sh('git config user.email "t@t.com" && git config user.name "T"', seed);
  mkdirSync(join(seed, "skills", "alpha"), { recursive: true });
  writeFileSync(join(seed, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.0.0" }));
  sh(`git remote add origin ${bare}`, seed);
  sh("git add -A && git commit -q -m init", seed);
  sh("git branch -M main", seed);
  sh("git push -q origin main", seed);

  return bare;
}

function cloneFrom(bare, dest) {
  sh(`git clone -q ${bare} ${dest}`);
  sh('git config user.email "t@t.com" && git config user.name "T"', dest);
  sh("git branch -M main", dest);
  return dest;
}

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "loomhub-checkupdates-test-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Pure helpers — semver parsing/compare/level
// ---------------------------------------------------------------------------
describe("parseSemver", () => {
  it("parses a valid x.y.z", () => {
    expect(parseSemver("1.2.3")).toEqual([1, 2, 3]);
  });
  it("rejects non-semver strings", () => {
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("v1.2.3")).toBeNull();
    expect(parseSemver(undefined)).toBeNull();
  });
});

describe("semverCompare / semverLevel", () => {
  it("compares major/minor/patch correctly", () => {
    expect(semverCompare([1, 0, 0], [2, 0, 0])).toBe(-1);
    expect(semverCompare([1, 2, 0], [1, 1, 0])).toBe(1);
    expect(semverCompare([1, 2, 3], [1, 2, 3])).toBe(0);
  });
  it("reports the highest-order differing segment", () => {
    expect(semverLevel([1, 0, 0], [2, 0, 0])).toBe("major");
    expect(semverLevel([1, 1, 0], [1, 2, 0])).toBe("minor");
    expect(semverLevel([1, 1, 1], [1, 1, 2])).toBe("patch");
    expect(semverLevel([1, 1, 1], [1, 1, 1])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseFrontmatterVersion
// ---------------------------------------------------------------------------
describe("parseFrontmatterVersion", () => {
  it("extracts version from a well-formed SKILL.md", () => {
    const out = parseFrontmatterVersion(skillMd({ name: "x", version: "1.2.3" }));
    expect(out.ok).toBe(true);
    expect(out.version).toBe("1.2.3");
  });
  it("fails gracefully with no frontmatter fence", () => {
    expect(parseFrontmatterVersion("no frontmatter").ok).toBe(false);
  });
  it("fails gracefully on malformed YAML", () => {
    expect(parseFrontmatterVersion("---\nname: [unterminated\n---\nbody\n").ok).toBe(false);
  });
  it("fails gracefully when version is missing", () => {
    expect(parseFrontmatterVersion("---\nname: x\n---\nbody\n").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// git plumbing helpers against a real (tiny) repo
// ---------------------------------------------------------------------------
describe("git plumbing helpers", () => {
  it("assertGitRepo does not throw inside a real repo", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    expect(() => assertGitRepo(clone)).not.toThrow();
  });

  it("assertGitRepo throws outside any git repo", () => {
    const notRepo = join(tmp, "not-a-repo");
    mkdirSync(notRepo);
    expect(() => assertGitRepo(notRepo)).toThrow();
  });

  it("runGit throws with a clean message on a bad git invocation", () => {
    const notRepo = join(tmp, "not-a-repo-2");
    mkdirSync(notRepo);
    expect(() => runGit(["status"], notRepo)).toThrow();
  });

  it("fetchOrigin succeeds against a real origin", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    expect(() => fetchOrigin(clone)).not.toThrow();
  });

  it("fetchOrigin throws when origin is unreachable", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    sh("git remote set-url origin /nonexistent/path/hub.git", clone);
    expect(() => fetchOrigin(clone)).toThrow();
  });

  it("listLocalSkillNames lists working-tree skills/ dirs", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    expect(listLocalSkillNames(clone)).toEqual(["alpha"]);
  });

  it("listRemoteSkillNames lists origin/main's skills/ tree after fetch", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    fetchOrigin(clone);
    expect(listRemoteSkillNames(clone)).toEqual(["alpha"]);
  });
});

// ---------------------------------------------------------------------------
// checkUpdates — the three scenarios called out in the task: local behind,
// new-on-hub, and local-unpushed-changes.
// ---------------------------------------------------------------------------
describe("checkUpdates", () => {
  it("reports no updates/new/unpushed on a freshly cloned, untouched repo", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.updates).toEqual([]);
    expect(result.newOnHub).toEqual([]);
    expect(result.unpushed).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("detects a minor update when origin/main bumps a skill's version", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));

    // Someone else bumps alpha 1.0.0 -> 1.1.0 and pushes.
    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.1.0" }));
    sh("git add -A && git commit -q -m bump", other);
    sh("git push -q origin main", other);

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.updates).toEqual([
      { name: "alpha", localVersion: "1.0.0", remoteVersion: "1.1.0", level: "minor" },
    ]);
    expect(result.unpushed).toEqual([]);
  });

  it("detects a major update level distinctly from minor/patch", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));

    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "2.0.0" }));
    sh("git add -A && git commit -q -m major", other);
    sh("git push -q origin main", other);

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.updates[0].level).toBe("major");
  });

  it("detects a brand-new skill that exists on origin/main but not locally", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));

    mkdirSync(join(other, "skills", "beta"), { recursive: true });
    writeFileSync(join(other, "skills", "beta", "SKILL.md"), skillMd({ name: "beta", version: "0.1.0" }));
    sh("git add -A && git commit -q -m addbeta", other);
    sh("git push -q origin main", other);

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.newOnHub).toEqual([{ name: "beta", version: "0.1.0" }]);
    expect(result.updates).toEqual([]);
  });

  it("detects a local unpushed *new* skill folder never sent to origin", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));

    mkdirSync(join(clone, "skills", "gamma"), { recursive: true });
    writeFileSync(join(clone, "skills", "gamma", "SKILL.md"), skillMd({ name: "gamma", version: "0.1.0" }));
    // Deliberately NOT committed/pushed.

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.unpushed).toEqual([{ name: "gamma", kind: "new", localVersion: "0.1.0" }]);
  });

  it("detects a local modification to an existing skill not yet pushed back (FR-6.3)", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));

    // Local edits alpha's body and bumps the patch version, but never pushes.
    writeFileSync(
      join(clone, "skills", "alpha", "SKILL.md"),
      skillMd({ name: "alpha", version: "1.0.1", extra: "local tweak\n" })
    );

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.unpushed).toEqual([
      { name: "alpha", kind: "modified", localVersion: "1.0.1", remoteVersion: "1.0.0" },
    ]);
    expect(result.updates).toEqual([]);
  });

  it("does not flag a local modification when only whitespace-irrelevant content matches (identical raw content short-circuits)", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    fetchOrigin(clone);
    // Rewrite with byte-identical content — must be a no-op.
    writeFileSync(join(clone, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.0.0" }));
    const result = checkUpdates(clone);
    expect(result.updates).toEqual([]);
    expect(result.unpushed).toEqual([]);
  });

  it("warns and skips (without throwing) a skill with unparsable local frontmatter", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    writeFileSync(join(clone, "skills", "alpha", "SKILL.md"), "no frontmatter at all");
    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.updates).toEqual([]);
    expect(result.unpushed).toEqual([]);
  });

  it("warns and skips a skill whose local/remote versions are not valid semver", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));

    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "not-semver" }));
    sh("git add -A && git commit -q -m badver", other);
    sh("git push -q origin main", other);

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.updates).toEqual([]);
    expect(result.unpushed).toEqual([]);
    expect(result.warnings.some((w) => w.includes("not valid semver"))).toBe(true);
  });

  it("handles a mixed scenario: one update, one new-on-hub, one local-unpushed together", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));

    // origin/main gains a bump to alpha AND a brand-new "beta" skill.
    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.2.0" }));
    mkdirSync(join(other, "skills", "beta"), { recursive: true });
    writeFileSync(join(other, "skills", "beta", "SKILL.md"), skillMd({ name: "beta", version: "0.1.0" }));
    sh("git add -A && git commit -q -m combo", other);
    sh("git push -q origin main", other);

    // Meanwhile the local clone has its own brand-new unpushed skill.
    mkdirSync(join(clone, "skills", "gamma"), { recursive: true });
    writeFileSync(join(clone, "skills", "gamma", "SKILL.md"), skillMd({ name: "gamma", version: "0.1.0" }));

    fetchOrigin(clone);
    const result = checkUpdates(clone);
    expect(result.updates).toEqual([
      { name: "alpha", localVersion: "1.0.0", remoteVersion: "1.2.0", level: "minor" },
    ]);
    expect(result.newOnHub).toEqual([{ name: "beta", version: "0.1.0" }]);
    expect(result.unpushed).toEqual([{ name: "gamma", kind: "new", localVersion: "0.1.0" }]);
  });
});

// ---------------------------------------------------------------------------
// formatText — output rendering
// ---------------------------------------------------------------------------
describe("formatText", () => {
  it("renders the all-clear message when nothing to report", () => {
    const text = formatText({ updates: [], newOnHub: [], unpushed: [], warnings: [] });
    expect(text).toBe("已是最新，無未回流改動。");
  });

  it("renders updates, new-on-hub, unpushed, and warnings sections when all present", () => {
    const text = formatText({
      updates: [{ name: "alpha", localVersion: "1.0.0", remoteVersion: "1.1.0", level: "minor" }],
      newOnHub: [{ name: "beta", version: "0.1.0" }],
      unpushed: [{ name: "gamma", kind: "new", localVersion: "0.1.0" }],
      warnings: ["delta: something went wrong"],
    });
    expect(text).toContain("有更新的 skill");
    expect(text).toContain("alpha: 1.0.0 -> 1.1.0 (minor)");
    expect(text).toContain("Hub 上新出現的 skill");
    expect(text).toContain("beta (v0.1.0)");
    expect(text).toContain("本機未回流的改動");
    expect(text).toContain("gamma");
    expect(text).toContain("警告");
    expect(text).toContain("delta: something went wrong");
  });
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  it("defaults to non-json", () => {
    expect(parseArgs([])).toEqual({ json: false });
  });
  it("parses --json", () => {
    expect(parseArgs(["--json"])).toEqual({ json: true });
  });
});

// ---------------------------------------------------------------------------
// End-to-end CLI tests (spawned subprocess), entirely inside tmp git repos —
// never touches this actual LoomHub-de repo's own git state.
// ---------------------------------------------------------------------------
describe("CLI end-to-end", () => {
  function runCli(cwd, args = []) {
    return spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf8" });
  }

  it("exits 0 and prints the all-clear message on an untouched clone", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const res = runCli(clone);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("已是最新，無未回流改動。");
  });

  it("exits 1 with a clean error message outside a git repo", () => {
    const notRepo = join(tmp, "not-a-repo");
    mkdirSync(notRepo);
    const res = runCli(notRepo);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/not a git repository|not inside a git working tree/);
  });

  it("exits 1 with a clean error message when git fetch fails (offline/bad remote)", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    sh("git remote set-url origin /nonexistent/path/hub.git", clone);
    const res = runCli(clone);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/git fetch origin failed/);
  });

  it("--json emits machine-readable output with the same shape as checkUpdates()", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));
    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.1.0" }));
    sh("git add -A && git commit -q -m bump", other);
    sh("git push -q origin main", other);

    const res = runCli(clone, ["--json"]);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.updates).toEqual([
      { name: "alpha", localVersion: "1.0.0", remoteVersion: "1.1.0", level: "minor" },
    ]);
  });

  it("rejects an unknown flag with exit code 1", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const res = runCli(clone, ["--bogus"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/unknown argument/);
  });

  it("finds updates correctly when invoked from a subdirectory of the clone", () => {
    const bare = initHub(tmp);
    const clone = cloneFrom(bare, join(tmp, "clone"));
    const other = cloneFrom(bare, join(tmp, "other"));
    writeFileSync(join(other, "skills", "alpha", "SKILL.md"), skillMd({ name: "alpha", version: "1.1.0" }));
    sh("git add -A && git commit -q -m bump", other);
    sh("git push -q origin main", other);

    const res = runCli(join(clone, "skills", "alpha"), ["--json"]);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.updates).toEqual([
      { name: "alpha", localVersion: "1.0.0", remoteVersion: "1.1.0", level: "minor" },
    ]);
  });
});
