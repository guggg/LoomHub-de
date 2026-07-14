import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
  lstatSync,
  readlinkSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  KEBAB_RE,
  parseArgs,
  installOne,
  warnOnFrontmatter,
} from "../install-skill.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const INSTALL_SCRIPT = join(REPO_ROOT, "scripts", "install-skill.mjs");

// All filesystem-touching tests operate exclusively inside a per-test temp
// dir under the OS tmpdir. NEVER point --project or any installOne() target
// at a real path under the user's home directory (~/.agents, ~/.claude).
let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "loomhub-install-test-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function runCli(args) {
  return spawnSync("node", [INSTALL_SCRIPT, ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// KEBAB_RE — the name-validation regex that doubles as the path-traversal
// guard (Spec §6 / §2). This is the highest-risk regex in the codebase.
// ---------------------------------------------------------------------------
describe("KEBAB_RE (name validation / path-traversal guard)", () => {
  it.each([
    "loom",
    "dbt-model-scaffold",
    "a",
    "a1-b2",
    "postgres-mcp-server",
  ])("accepts valid kebab-case name %s", (name) => {
    expect(KEBAB_RE.test(name)).toBe(true);
  });

  it.each([
    "../../etc",
    "../evil",
    "..",
    "loom/../../etc",
    "/etc/passwd",
    "a/b",
    "",
    "Foo-Bar",
    "FOO",
    "foo_bar",
    "foo--bar",
    "-foo",
    "foo-",
    "foo bar",
    "foo.bar",
    "~/etc",
    "foo\0bar",
  ])("rejects dangerous/invalid name %j", (name) => {
    expect(KEBAB_RE.test(name)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  it("parses a bare skill name", () => {
    expect(parseArgs(["loom"])).toEqual({ skillName: "loom", copy: false, project: null });
  });

  it("parses --copy flag", () => {
    expect(parseArgs(["loom", "--copy"])).toEqual({
      skillName: "loom",
      copy: true,
      project: null,
    });
  });

  it("parses --project <path>", () => {
    expect(parseArgs(["loom", "--project", "/tmp/x"])).toEqual({
      skillName: "loom",
      copy: false,
      project: "/tmp/x",
    });
  });

  it("parses --copy and --project together, either order", () => {
    expect(parseArgs(["loom", "--copy", "--project", "/tmp/x"])).toEqual({
      skillName: "loom",
      copy: true,
      project: "/tmp/x",
    });
    expect(parseArgs(["loom", "--project", "/tmp/x", "--copy"])).toEqual({
      skillName: "loom",
      copy: true,
      project: "/tmp/x",
    });
  });

  it("--project followed immediately by another flag fails loudly (not swallowing it as the path)", () => {
    // Guard: the token consumed after --project must not itself be a flag.
    // `install-skill loom --project --copy` (forgot the path) must be a usage
    // error (process.exit(1) via fail()), not a silent mkdir of a literal
    // "--copy" directory.
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    try {
      expect(() => parseArgs(["loom", "--project", "--copy"])).toThrow("exit:1");
    } finally {
      exit.mockRestore();
    }
  });

  it("--project at end of argv (no following token) fails loudly", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    try {
      expect(() => parseArgs(["loom", "--project"])).toThrow("exit:1");
    } finally {
      exit.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// installOne — the actual filesystem-mutating primitive. Every test targets
// paths inside the per-test tmp dir only.
// ---------------------------------------------------------------------------
describe("installOne", () => {
  it("throws instead of touching disk when target resolves to the same path as source", () => {
    const same = join(tmp, "src");
    mkdirSync(same);
    expect(() => installOne(same, same, false)).toThrow(/refusing to install onto itself/);
  });

  it("creates a fresh symlink when nothing exists at target", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    writeFileSync(join(src, "SKILL.md"), "hello");
    const target = join(tmp, "out", "skill");
    const status = installOne(src, target, false);
    expect(status).toBe("installed");
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
    expect(readlinkSync(target)).toBe(src);
  });

  it("is idempotent: re-running symlink install reports 'already'", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    installOne(src, target, false);
    const status = installOne(src, target, false);
    expect(status).toBe("already");
  });

  it("replaces a symlink pointing elsewhere (differing target)", () => {
    const src = join(tmp, "src");
    const otherSrc = join(tmp, "other-src");
    mkdirSync(src);
    mkdirSync(otherSrc);
    const target = join(tmp, "out", "skill");
    installOne(otherSrc, target, false);
    const status = installOne(src, target, false);
    expect(status).toBe("replaced");
    expect(readlinkSync(target)).toBe(src);
  });

  it("replaces a broken/stale symlink (target of the link no longer exists)", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(join(tmp, "does-not-exist"), target);
    const status = installOne(src, target, false);
    expect(status).toBe("replaced");
    expect(readlinkSync(target)).toBe(src);
  });

  it("creates a fresh copy when --copy is used and nothing exists at target", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    writeFileSync(join(src, "SKILL.md"), "hello");
    const target = join(tmp, "out", "skill");
    const status = installOne(src, target, true);
    expect(status).toBe("installed");
    expect(lstatSync(target).isDirectory()).toBe(true);
    expect(lstatSync(target).isSymbolicLink()).toBe(false);
  });

  it("is idempotent for copy mode: re-running refreshes rather than erroring", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    writeFileSync(join(src, "SKILL.md"), "v1");
    const target = join(tmp, "out", "skill");
    installOne(src, target, true);
    writeFileSync(join(src, "SKILL.md"), "v2");
    const status = installOne(src, target, true);
    expect(status).toBe("refreshed");
  });

  it("converges a copy to a symlink when switching modes without --copy", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    installOne(src, target, true); // copy first
    expect(lstatSync(target).isSymbolicLink()).toBe(false);
    const status = installOne(src, target, false); // now symlink mode
    expect(status).toBe("installed");
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
  });

  it("converges a symlink to a copy when switching to --copy", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    installOne(src, target, false); // symlink first
    const status = installOne(src, target, true); // now copy mode
    expect(status).toBe("installed");
    expect(lstatSync(target).isSymbolicLink()).toBe(false);
    expect(lstatSync(target).isDirectory()).toBe(true);
  });

  it("replaces a plain file blocking the target path", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, "not a skill, just a stray file");
    const status = installOne(src, target, false);
    expect(status).toBe("installed");
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
  });

  it("creates missing parent directories", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "deeply", "nested", "path", "skill");
    installOne(src, target, false);
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
  });

  it("recognizes a pre-existing RELATIVE symlink that resolves to src as 'already installed'", () => {
    const src = join(tmp, "src");
    mkdirSync(src);
    const target = join(tmp, "out", "skill");
    mkdirSync(dirname(target), { recursive: true });
    // Manually create a relative symlink whose string form differs from the
    // absolute src path but resolves (relative to target's own dir) to src.
    const relPath = relative(dirname(target), src);
    symlinkSync(relPath, target);
    const status = installOne(src, target, false);
    expect(status).toBe("already");
    // installOne must not have rewritten the link to an absolute path just
    // because it happened to match — confirm it left the relative link alone.
    expect(readlinkSync(target)).toBe(relPath);
  });
});

// ---------------------------------------------------------------------------
// warnOnFrontmatter — should only ever warn (console.error), never throw,
// regardless of how malformed the SKILL.md is.
// ---------------------------------------------------------------------------
describe("warnOnFrontmatter", () => {
  it("does not throw when the file does not exist", () => {
    expect(() => warnOnFrontmatter(join(tmp, "missing.md"), "x")).not.toThrow();
  });

  it("does not throw on a file with no frontmatter fence", () => {
    const p = join(tmp, "SKILL.md");
    writeFileSync(p, "# no frontmatter\nbody\n");
    expect(() => warnOnFrontmatter(p, "x")).not.toThrow();
  });

  it("does not throw on malformed YAML", () => {
    const p = join(tmp, "SKILL.md");
    writeFileSync(p, "---\nname: [unterminated\n---\nbody\n");
    expect(() => warnOnFrontmatter(p, "x")).not.toThrow();
  });

  it("does not throw when frontmatter parses to a non-mapping (list)", () => {
    const p = join(tmp, "SKILL.md");
    writeFileSync(p, "---\n- a\n- b\n---\nbody\n");
    expect(() => warnOnFrontmatter(p, "x")).not.toThrow();
  });

  it("does not throw on a fully valid file", () => {
    const p = join(tmp, "SKILL.md");
    writeFileSync(
      p,
      "---\nname: x\ndescription: d\ntype: skill\ncategory: development\ntags: []\nversion: 1.0.0\nowner: \"@me\"\nupdated: 2026-07-13\n---\nbody\n"
    );
    expect(() => warnOnFrontmatter(p, "x")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// End-to-end CLI tests (spawned subprocess). These exercise main()'s full
// path — argument parsing, existence checks, and both install targets —
// entirely inside --project <tmp dir>. NEVER touches ~/.agents or ~/.claude.
// ---------------------------------------------------------------------------
describe("CLI end-to-end (--project sandboxed)", () => {
  it("installs a real skill (loom) into both vendor targets under --project", () => {
    const res = runCli(["loom", "--project", tmp]);
    expect(res.status).toBe(0);
    expect(lstatSync(join(tmp, ".agents", "skills", "loom")).isSymbolicLink()).toBe(true);
    expect(lstatSync(join(tmp, ".claude", "skills", "loom")).isSymbolicLink()).toBe(true);
  });

  it("re-running the same install is idempotent (exit 0, reports 'already installed')", () => {
    runCli(["loom", "--project", tmp]);
    const res = runCli(["loom", "--project", tmp]);
    expect(res.status).toBe(0);
    expect(res.stderr).toContain("already installed");
  });

  it("--copy installs real directories, not symlinks", () => {
    const res = runCli(["loom", "--copy", "--project", tmp]);
    expect(res.status).toBe(0);
    const t = join(tmp, ".agents", "skills", "loom");
    expect(lstatSync(t).isSymbolicLink()).toBe(false);
    expect(lstatSync(t).isDirectory()).toBe(true);
  });

  it("rejects a path-traversal name with exit code 1 and does not touch the filesystem", () => {
    const res = runCli(["../../etc", "--project", tmp]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/invalid skill name/);
  });

  it("rejects a non-kebab-case name with exit code 1", () => {
    const res = runCli(["Not-Kebab", "--project", tmp]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/invalid skill name/);
  });

  it("fails with exit code 1 for a skill that does not exist in skills/", () => {
    const res = runCli(["totally-nonexistent-skill", "--project", tmp]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/not found/);
  });

  it("fails with exit code 1 when no skill name is given", () => {
    const res = runCli(["--project", tmp]);
    expect(res.status).toBe(1);
  });

  it("fails with exit code 1 when --project has no path argument", () => {
    const res = runCli(["loom", "--project"]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/--project requires a <path> argument/);
  });

  it("exits 0 even when one of the two vendor installs fails (partial success)", () => {
    // Make .agents unwritable so the Codex+Gemini target fails, while
    // .claude still succeeds — exercises the "okCount < targets.length" path.
    mkdirSync(join(tmp, ".agents"), { recursive: true });
    chmodSync(join(tmp, ".agents"), 0o500);
    const res = runCli(["loom", "--project", tmp]);
    chmodSync(join(tmp, ".agents"), 0o700); // restore for cleanup
    expect(res.status).toBe(0);
    expect(res.stderr).toMatch(/\[fail\]/);
    expect(res.stderr).toMatch(/1\/2 target\(s\) installed \(1 failed\)/);
  });
});
