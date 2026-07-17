import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  listChangedSkillNames,
  getSkillFolderDiff,
  getSkillMdDiff,
  diffAddsVersionAndUpdated,
  checkSkillVersionBump,
} from "../check-version-bump.mjs";

// Real git repo per test — this tool's whole job is reading `git diff HEAD`,
// so exercising real git (not mocking it) is what actually validates it.

function sh(cmd, cwd) {
  const res = spawnSync("bash", ["-c", cmd], { cwd, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`cmd failed: ${cmd}\n${res.stdout}\n${res.stderr}`);
  }
  return res.stdout;
}

function skillMd({ version, updated, extra = "" }) {
  return (
    `---\nname: alpha\ndescription: d\ntype: skill\ncategory: development\n` +
    `tags: []\nversion: ${version}\nowner: "@me"\nupdated: ${updated}\n---\n\n` +
    `## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n${extra}`
  );
}

let repo;
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "loomhub-versionbump-test-"));
  sh("git init -q .", repo);
  sh('git config user.email "t@t.com" && git config user.name "T"', repo);
  mkdirSync(join(repo, "skills", "alpha"), { recursive: true });
  writeFileSync(
    join(repo, "skills", "alpha", "SKILL.md"),
    skillMd({ version: "1.0.0", updated: "2026-07-01" })
  );
  sh("git add -A && git commit -q -m init", repo);
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe("listChangedSkillNames", () => {
  it("returns [] when nothing under skills/ changed", () => {
    expect(listChangedSkillNames(repo)).toEqual([]);
  });

  it("finds a skill whose SKILL.md was modified (unstaged)", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.1.0", updated: "2026-07-17" })
    );
    expect(listChangedSkillNames(repo)).toEqual(["alpha"]);
  });

  it("finds multiple changed skills, sorted", () => {
    mkdirSync(join(repo, "skills", "zeta"), { recursive: true });
    writeFileSync(join(repo, "skills", "zeta", "SKILL.md"), skillMd({ version: "0.1.0", updated: "2026-07-01" }));
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.1.0", updated: "2026-07-17" })
    );
    expect(listChangedSkillNames(repo)).toEqual(["alpha", "zeta"]);
  });

  it("ignores changes outside skills/", () => {
    writeFileSync(join(repo, "README.md"), "hello");
    expect(listChangedSkillNames(repo)).toEqual([]);
  });
});

describe("diffAddsVersionAndUpdated", () => {
  it("detects both added when version and updated lines changed", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.1.0", updated: "2026-07-17" })
    );
    const diff = getSkillMdDiff("alpha", repo);
    expect(diffAddsVersionAndUpdated(diff)).toEqual({ addedVersion: true, addedUpdated: true });
  });

  it("detects missing bump when only body text changed", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.0.0", updated: "2026-07-01", extra: "\nnew paragraph\n" })
    );
    const diff = getSkillMdDiff("alpha", repo);
    expect(diffAddsVersionAndUpdated(diff)).toEqual({ addedVersion: false, addedUpdated: false });
  });

  it("does not count an unchanged value merely present in diff context", () => {
    // Change body text far from frontmatter; context lines near the hunk
    // boundary could include "version:" only if the hunk window overlaps it.
    // Use a large body so the version/updated lines fall outside the hunk.
    const filler = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.0.0", updated: "2026-07-01", extra: `\n${filler}\nchanged line\n` })
    );
    const diff = getSkillMdDiff("alpha", repo);
    expect(diffAddsVersionAndUpdated(diff).addedVersion).toBe(false);
  });
});

describe("checkSkillVersionBump", () => {
  it("returns null when nothing changed for that skill", () => {
    expect(checkSkillVersionBump("alpha", repo)).toBeNull();
  });

  it("returns null when version and updated were both bumped", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.1.0", updated: "2026-07-17", extra: "\nnew paragraph\n" })
    );
    expect(checkSkillVersionBump("alpha", repo)).toBeNull();
  });

  it("flags a warning when body changed but version/updated did not", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.0.0", updated: "2026-07-01", extra: "\nnew paragraph\n" })
    );
    const result = checkSkillVersionBump("alpha", repo);
    expect(result).not.toBeNull();
    expect(result.skillName).toBe("alpha");
    expect(result.reason).toMatch(/version.*updated|updated.*version|version|updated/i);
  });

  it("flags a warning when only version bumped but not updated", () => {
    writeFileSync(
      join(repo, "skills", "alpha", "SKILL.md"),
      skillMd({ version: "1.1.0", updated: "2026-07-01" })
    );
    const result = checkSkillVersionBump("alpha", repo);
    expect(result).not.toBeNull();
    expect(result.reason).toContain("updated");
  });

  it("flags a warning when a non-SKILL.md file under the skill folder changed but SKILL.md did not", () => {
    mkdirSync(join(repo, "skills", "alpha", "scripts"), { recursive: true });
    writeFileSync(join(repo, "skills", "alpha", "scripts", "helper.sh"), "echo hi\n");
    const result = checkSkillVersionBump("alpha", repo);
    expect(result).not.toBeNull();
    expect(result.reason).toMatch(/SKILL\.md itself was not touched/);
  });

  it("getSkillFolderDiff is empty for an untouched skill", () => {
    expect(getSkillFolderDiff("alpha", repo).trim()).toBe("");
  });
});
