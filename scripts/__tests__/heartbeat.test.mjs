import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectUpstreamCandidates,
  compareUpstreamRef,
  fetchLatestRelease,
  fetchLatestCommit,
  compareUpstreamCommit,
  checkHeartbeat,
  formatReport,
  dedupMarker,
  buildIssueTitle,
  buildIssueBody,
  findExistingIssue,
  listOpenHeartbeatIssues,
  createHeartbeatIssue,
  openHeartbeatIssues,
  resolveHubRepoSlug,
  parseArgs,
} from "../heartbeat.mjs";

// ---------------------------------------------------------------------------
// Fixture helpers — a tmp "repo" that's just a skills/ dir; heartbeat's scan
// step only ever reads the local working tree (never git plumbing), so no
// real git repo is needed here (unlike check-updates.test.mjs).
// ---------------------------------------------------------------------------

function skillMd(name, frontmatterExtra = "") {
  return (
    `---\nname: ${name}\ndescription: d\ntype: skill\ncategory: development\n` +
    `tags: []\nversion: 1.0.0\nowner: "@me"\nupdated: 2026-07-13\n${frontmatterExtra}---\n\n` +
    `## 用途 / What\nx\n## 使用場景 / When\ny\n## 使用方式 / How\nz\n`
  );
}

function writeSkill(repoRoot, name, frontmatterExtra = "") {
  mkdirSync(join(repoRoot, "skills", name), { recursive: true });
  writeFileSync(join(repoRoot, "skills", name, "SKILL.md"), skillMd(name, frontmatterExtra));
}

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "loomhub-heartbeat-test-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// collectUpstreamCandidates — frontmatter filtering + graceful-skip matrix
// ---------------------------------------------------------------------------
describe("collectUpstreamCandidates", () => {
  it("skips a skill with no upstream field", () => {
    writeSkill(tmp, "alpha");
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped).toEqual([{ name: "alpha", reason: expect.stringContaining("no `upstream`") }]);
  });

  it("picks up a well-formed github+release candidate", () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  track: release\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(skipped).toEqual([]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      name: "beta",
      upstream: expect.objectContaining({ repo: "acme/beta", ref: "v1.0.0" }),
    });
  });

  it("defaults track to release when omitted", () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(skipped).toEqual([]);
    expect(candidates).toHaveLength(1);
  });

  it("picks up a well-formed github+commit candidate", () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  track: commit\n  path: foo.md\n  branch: main\n  ref: ${"a".repeat(40)}\n  checked_at: "2026-01-01"\n`
    );
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(skipped).toEqual([]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      name: "beta",
      upstream: expect.objectContaining({ track: "commit", path: "foo.md", branch: "main" }),
    });
  });

  it("gracefully skips type=npm (MVP: github only)", () => {
    writeSkill(tmp, "gamma", `upstream:\n  type: npm\n  package: foo\n  checked_at: "2026-01-01"\n`);
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("not supported yet");
  });

  it("gracefully skips track=tag (MVP: release only)", () => {
    writeSkill(
      tmp,
      "delta",
      `upstream:\n  type: github\n  repo: acme/delta\n  track: tag\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("not supported yet");
  });

  it("gracefully skips when upstream.repo is missing", () => {
    writeSkill(tmp, "epsilon", `upstream:\n  type: github\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`);
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("upstream.repo missing");
  });

  it("gracefully skips when upstream.ref is missing", () => {
    writeSkill(tmp, "zeta", `upstream:\n  type: github\n  repo: acme/zeta\n  checked_at: "2026-01-01"\n`);
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("upstream.ref missing");
  });

  it("gracefully skips unparsable frontmatter without throwing", () => {
    mkdirSync(join(tmp, "skills", "broken"), { recursive: true });
    writeFileSync(join(tmp, "skills", "broken", "SKILL.md"), "no frontmatter at all");
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("no YAML frontmatter fence");
  });

  it("gracefully skips malformed YAML without throwing", () => {
    mkdirSync(join(tmp, "skills", "badyaml"), { recursive: true });
    writeFileSync(join(tmp, "skills", "badyaml", "SKILL.md"), "---\nname: [unterminated\n---\nbody\n");
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates).toEqual([]);
    expect(skipped[0].reason).toContain("YAML parse error");
  });

  it("handles a mix of tracked, untracked, and out-of-scope skills together", () => {
    writeSkill(tmp, "alpha"); // no upstream
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    writeSkill(tmp, "gamma", `upstream:\n  type: npm\n  package: foo\n  checked_at: "2026-01-01"\n`);
    const { candidates, skipped } = collectUpstreamCandidates(tmp);
    expect(candidates.map((c) => c.name)).toEqual(["beta"]);
    expect(skipped.map((s) => s.name).sort()).toEqual(["alpha", "gamma"]);
  });
});

// ---------------------------------------------------------------------------
// compareUpstreamRef — semver-level diffing + non-semver fallback
// ---------------------------------------------------------------------------
describe("compareUpstreamRef", () => {
  it("reports no update when refs are identical", () => {
    expect(compareUpstreamRef("v1.0.0", "v1.0.0")).toEqual({ hasUpdate: false });
  });
  it("detects a minor bump ignoring the leading v", () => {
    expect(compareUpstreamRef("v1.0.0", "v1.1.0")).toEqual({ hasUpdate: true, level: "minor" });
  });
  it("detects a major bump", () => {
    expect(compareUpstreamRef("v1.0.0", "v2.0.0")).toEqual({ hasUpdate: true, level: "major" });
  });
  it("reports no update when pinned ref is already ahead-or-equal", () => {
    expect(compareUpstreamRef("v2.0.0", "v1.0.0")).toEqual({ hasUpdate: false });
  });
  it("falls back to level unknown when either side isn't semver", () => {
    expect(compareUpstreamRef("release-42", "release-43")).toEqual({ hasUpdate: true, level: "unknown" });
  });
  it("reports no update for identical non-semver strings", () => {
    expect(compareUpstreamRef("release-42", "release-42")).toEqual({ hasUpdate: false });
  });
});

// ---------------------------------------------------------------------------
// compareUpstreamCommit — full-SHA equality + prefix tolerance
// ---------------------------------------------------------------------------
describe("compareUpstreamCommit", () => {
  const shaA = "a".repeat(40);
  const shaB = "b".repeat(40);

  it("reports no update when SHAs are identical", () => {
    expect(compareUpstreamCommit(shaA, shaA)).toEqual({ hasUpdate: false });
  });

  it("reports an update, level commit, when SHAs differ", () => {
    expect(compareUpstreamCommit(shaA, shaB)).toEqual({ hasUpdate: true, level: "commit" });
  });

  it("treats a pinned short SHA that prefixes the latest full SHA as no update", () => {
    const short = shaA.slice(0, 7);
    expect(compareUpstreamCommit(short, shaA)).toEqual({ hasUpdate: false });
  });

  it("treats a latest short SHA that prefixes the pinned full SHA as no update", () => {
    const short = shaA.slice(0, 7);
    expect(compareUpstreamCommit(shaA, short)).toEqual({ hasUpdate: false });
  });

  it("does not treat an unrelated same-length prefix collision as a match", () => {
    expect(compareUpstreamCommit("aaaaaaa" + "0".repeat(33), shaB)).toEqual({
      hasUpdate: true,
      level: "commit",
    });
  });
});

// ---------------------------------------------------------------------------
// fetchLatestRelease — injected fetch, no real network
// ---------------------------------------------------------------------------
describe("fetchLatestRelease", () => {
  it("returns ok+tagName on a 2xx response with tag_name", async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ tag_name: "v1.2.3" }),
    });
    const result = await fetchLatestRelease("acme/foo", fetchFn);
    expect(result).toEqual({ ok: true, tagName: "v1.2.3" });
  });

  it("returns ok:false on 404", async () => {
    const fetchFn = async () => ({ ok: false, status: 404 });
    const result = await fetchLatestRelease("acme/missing", fetchFn);
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("returns ok:false on 401/403", async () => {
    const fetchFn = async () => ({ ok: false, status: 403 });
    expect(await fetchLatestRelease("acme/private", fetchFn)).toEqual({ ok: false, status: 403 });
  });

  it("returns ok:false on 5xx", async () => {
    const fetchFn = async () => ({ ok: false, status: 502 });
    expect(await fetchLatestRelease("acme/flaky", fetchFn)).toEqual({ ok: false, status: 502 });
  });

  it("returns ok:false when response has no tag_name", async () => {
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({}) });
    const result = await fetchLatestRelease("acme/weird", fetchFn);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchLatestCommit — injected fetch, no real network
// ---------------------------------------------------------------------------
describe("fetchLatestCommit", () => {
  it("returns ok+sha on a 2xx response with a non-empty commit array", async () => {
    const fetchFn = async (url) => {
      expect(url).toContain("acme/foo/commits");
      expect(url).toContain("path=foo.md");
      expect(url).toContain("sha=main");
      return { ok: true, status: 200, json: async () => [{ sha: "deadbeef".padEnd(40, "0") }] };
    };
    const result = await fetchLatestCommit("acme/foo", "foo.md", "main", fetchFn);
    expect(result).toEqual({ ok: true, sha: "deadbeef".padEnd(40, "0") });
  });

  it("omits the path param when path is not given", async () => {
    const fetchFn = async (url) => {
      expect(url).not.toContain("path=");
      return { ok: true, status: 200, json: async () => [{ sha: "a".repeat(40) }] };
    };
    await fetchLatestCommit("acme/foo", undefined, "main", fetchFn);
  });

  it("omits the sha (branch) param when branch is not given", async () => {
    const fetchFn = async (url) => {
      expect(url).not.toContain("sha=");
      return { ok: true, status: 200, json: async () => [{ sha: "a".repeat(40) }] };
    };
    await fetchLatestCommit("acme/foo", "foo.md", undefined, fetchFn);
  });

  it("returns ok:false on an empty array (e.g. path doesn't exist upstream)", async () => {
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => [] });
    const result = await fetchLatestCommit("acme/foo", "missing.md", "main", fetchFn);
    expect(result.ok).toBe(false);
  });

  it("returns ok:false on a non-2xx response", async () => {
    const fetchFn = async () => ({ ok: false, status: 404 });
    const result = await fetchLatestCommit("acme/missing", undefined, undefined, fetchFn);
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it("throws only on a network-level fetch rejection", async () => {
    const fetchFn = async () => {
      throw new Error("ECONNRESET");
    };
    await expect(fetchLatestCommit("acme/foo", "foo.md", "main", fetchFn)).rejects.toThrow("ECONNRESET");
  });
});

// ---------------------------------------------------------------------------
// checkHeartbeat — end-to-end with injected fetchFn
// ---------------------------------------------------------------------------
describe("checkHeartbeat", () => {
  it("reports an update for a candidate whose latest release is ahead", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ tag_name: "v1.2.0" }) });
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([
      expect.objectContaining({ name: "beta", ref: "v1.0.0", latest: "v1.2.0", level: "minor" }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("reports no updates when pinned ref matches latest", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ tag_name: "v1.0.0" }) });
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([]);
  });

  it("turns an API failure into a warning, not a thrown error", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => ({ ok: false, status: 404 });
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("404");
  });

  it("turns a network-level throw into a warning, not a crash", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => {
      throw new Error("ECONNRESET");
    };
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("ECONNRESET");
  });

  it("continues checking remaining candidates after one fails", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    writeSkill(
      tmp,
      "cappa",
      `upstream:\n  type: github\n  repo: acme/cappa\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async (url) => {
      if (url.includes("acme/beta")) return { ok: false, status: 500 };
      return { ok: true, status: 200, json: async () => ({ tag_name: "v2.0.0" }) };
    };
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.warnings.length).toBe(1);
    expect(result.updates).toEqual([
      expect.objectContaining({ name: "cappa", level: "major" }),
    ]);
  });

  it("reports a commit-tracked update via the commits API branch", async () => {
    const pinnedSha = "a".repeat(40);
    const latestSha = "b".repeat(40);
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  track: commit\n  path: foo.md\n  branch: main\n  ref: ${pinnedSha}\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async (url) => {
      expect(url).toContain("acme/beta/commits");
      return { ok: true, status: 200, json: async () => [{ sha: latestSha }] };
    };
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([
      expect.objectContaining({
        name: "beta",
        ref: pinnedSha,
        latest: latestSha.slice(0, 7),
        latestFull: latestSha,
        level: "commit",
      }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("reports no update when the commit-tracked pinned sha matches latest", async () => {
    const sha = "c".repeat(40);
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  track: commit\n  ref: ${sha}\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => ({ ok: true, status: 200, json: async () => [{ sha }] });
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([]);
  });

  it("turns a commit-tracked API failure into a warning, not a thrown error", async () => {
    writeSkill(
      tmp,
      "beta",
      `upstream:\n  type: github\n  repo: acme/beta\n  track: commit\n  ref: ${"a".repeat(40)}\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async () => ({ ok: false, status: 500 });
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("500");
  });

  it("handles a mix of release-tracked and commit-tracked candidates together", async () => {
    const pinnedSha = "a".repeat(40);
    const latestSha = "b".repeat(40);
    writeSkill(
      tmp,
      "rel",
      `upstream:\n  type: github\n  repo: acme/rel\n  ref: v1.0.0\n  checked_at: "2026-01-01"\n`
    );
    writeSkill(
      tmp,
      "cmt",
      `upstream:\n  type: github\n  repo: acme/cmt\n  track: commit\n  ref: ${pinnedSha}\n  checked_at: "2026-01-01"\n`
    );
    const fetchFn = async (url) => {
      if (url.includes("acme/rel")) {
        return { ok: true, status: 200, json: async () => ({ tag_name: "v1.1.0" }) };
      }
      return { ok: true, status: 200, json: async () => [{ sha: latestSha }] };
    };
    const result = await checkHeartbeat(tmp, { fetchFn });
    expect(result.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "rel", level: "minor" }),
        expect.objectContaining({ name: "cmt", level: "commit" }),
      ])
    );
    expect(result.updates).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// formatReport — plain-text rendering
// ---------------------------------------------------------------------------
describe("formatReport", () => {
  it("renders the all-clear message when nothing found", () => {
    const text = formatReport({ updates: [], skipped: [], warnings: [] });
    expect(text).toContain("沒有偵測到上游更新");
  });

  it("renders updates/skipped/warnings sections when all present", () => {
    const text = formatReport({
      updates: [{ name: "beta", ref: "v1.0.0", latest: "v1.1.0", level: "minor", repo: "acme/beta" }],
      skipped: [{ name: "alpha", reason: "no upstream" }],
      warnings: ["cappa: HTTP 500"],
    });
    expect(text).toContain("beta: v1.0.0 -> v1.1.0 (minor)");
    expect(text).toContain("alpha: no upstream");
    expect(text).toContain("cappa: HTTP 500");
  });
});

// ---------------------------------------------------------------------------
// Issue body/title + dedup marker
// ---------------------------------------------------------------------------
describe("issue construction", () => {
  const update = {
    name: "beta",
    repo: "acme/beta",
    ref: "v1.0.0",
    latest: "v1.1.0",
    level: "minor",
    checkedAt: "2026-01-01",
    sourceUrl: "https://github.com/acme/beta",
    owner: "@ty",
  };

  it("builds a title following the spec's exact shape", () => {
    expect(buildIssueTitle(update)).toBe("[heartbeat] beta:上游更新 v1.0.0 → v1.1.0 (minor)");
  });

  it("embeds the dedup marker as the first line of the body", () => {
    const body = buildIssueBody(update);
    expect(body.split("\n")[0]).toBe(dedupMarker("beta"));
  });

  it("body mentions asset path, source, pin, latest, level, compare link, owner", () => {
    const body = buildIssueBody(update);
    expect(body).toContain("skills/beta/");
    expect(body).toContain("https://github.com/acme/beta");
    expect(body).toContain("v1.0.0");
    expect(body).toContain("v1.1.0");
    expect(body).toContain("minor");
    expect(body).toContain("compare/v1.0.0...v1.1.0");
    expect(body).toContain("@ty");
    expect(body).toContain("只偵測不自動套用");
  });
});

describe("issue construction — commit-tracked updates", () => {
  const pinnedSha = "a".repeat(40);
  const latestSha = "b".repeat(40);
  const update = {
    name: "cmt",
    repo: "acme/cmt",
    ref: pinnedSha,
    latest: latestSha.slice(0, 7),
    latestFull: latestSha,
    level: "commit",
    checkedAt: "2026-01-01",
    sourceUrl: "https://github.com/acme/cmt",
    owner: "@ty",
  };

  it("title shows the short (7-char) pinned sha, not the full 40-char sha", () => {
    const title = buildIssueTitle(update);
    expect(title).toContain(pinnedSha.slice(0, 7));
    expect(title).not.toContain(pinnedSha);
  });

  it("body's compare link uses the full 40-char SHAs, not the short display form", () => {
    const body = buildIssueBody(update);
    expect(body).toContain(`compare/${pinnedSha}...${latestSha}`);
  });
});

// ---------------------------------------------------------------------------
// Dedup logic against a list of existing open issues
// ---------------------------------------------------------------------------
describe("findExistingIssue", () => {
  it("finds an issue whose body contains the asset's marker", () => {
    const issues = [
      { number: 1, body: `${dedupMarker("alpha")}\nfoo` },
      { number: 2, body: `${dedupMarker("beta")}\nbar` },
    ];
    const found = findExistingIssue(issues, "beta");
    expect(found.number).toBe(2);
  });

  it("returns null when no issue matches", () => {
    const issues = [{ number: 1, body: `${dedupMarker("alpha")}\nfoo` }];
    expect(findExistingIssue(issues, "beta")).toBeNull();
  });

  it("tolerates issues with a null/missing body", () => {
    const issues = [{ number: 1, body: null }, { number: 2 }];
    expect(findExistingIssue(issues, "beta")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listOpenHeartbeatIssues / createHeartbeatIssue — injected fetch
// ---------------------------------------------------------------------------
describe("GitHub Issues API wrappers", () => {
  it("listOpenHeartbeatIssues returns the parsed JSON array on success", async () => {
    const fetchFn = async (url) => {
      expect(url).toContain("state=open");
      expect(url).toContain("labels=heartbeat");
      return { ok: true, json: async () => [{ number: 1 }] };
    };
    const issues = await listOpenHeartbeatIssues("acme/hub", fetchFn);
    expect(issues).toEqual([{ number: 1 }]);
  });

  it("listOpenHeartbeatIssues throws a clean error on failure", async () => {
    const fetchFn = async () => ({ ok: false, status: 500 });
    await expect(listOpenHeartbeatIssues("acme/hub", fetchFn)).rejects.toThrow(/500/);
  });

  it("createHeartbeatIssue POSTs with title/body/labels and returns the created issue", async () => {
    const update = {
      name: "beta",
      repo: "acme/beta",
      ref: "v1.0.0",
      latest: "v1.1.0",
      level: "minor",
      checkedAt: "2026-01-01",
      sourceUrl: null,
      owner: null,
    };
    let capturedBody;
    const fetchFn = async (url, opts) => {
      expect(url).toBe("https://api.github.com/repos/acme/hub/issues");
      expect(opts.method).toBe("POST");
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ number: 42 }) };
    };
    const issue = await createHeartbeatIssue("acme/hub", fetchFn, "tok", update);
    expect(issue).toEqual({ number: 42 });
    expect(capturedBody.labels).toEqual(["heartbeat", "upstream-update"]);
    expect(capturedBody.title).toContain("beta");
  });

  it("createHeartbeatIssue throws a clean error on failure", async () => {
    const fetchFn = async () => ({ ok: false, status: 422 });
    await expect(
      createHeartbeatIssue("acme/hub", fetchFn, "tok", {
        name: "x",
        repo: "acme/x",
        ref: "1",
        latest: "2",
        level: "unknown",
      })
    ).rejects.toThrow(/422/);
  });
});

// ---------------------------------------------------------------------------
// openHeartbeatIssues — orchestration: dedup-then-create, never throws
// ---------------------------------------------------------------------------
describe("openHeartbeatIssues", () => {
  const update = {
    name: "beta",
    repo: "acme/beta",
    ref: "v1.0.0",
    latest: "v1.1.0",
    level: "minor",
    checkedAt: "2026-01-01",
    sourceUrl: null,
    owner: "@ty",
  };

  it("creates a new issue when no existing open issue matches", async () => {
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push({ url, method: opts?.method ?? "GET" });
      if (opts?.method === "POST") return { ok: true, json: async () => ({ number: 7 }) };
      return { ok: true, json: async () => [] };
    };
    const created = await openHeartbeatIssues("acme/hub", [update], { fetchFn });
    expect(created).toEqual([{ number: 7 }]);
    expect(calls.some((c) => c.method === "POST")).toBe(true);
  });

  it("skips creating when an open issue for the same asset already exists", async () => {
    const fetchFn = async (url, opts) => {
      if (opts?.method === "POST") throw new Error("should not POST");
      return { ok: true, json: async () => [{ number: 3, body: dedupMarker("beta") }] };
    };
    const created = await openHeartbeatIssues("acme/hub", [update], { fetchFn });
    expect(created).toEqual([]);
  });

  it("does not throw when listing existing issues fails — proceeds to attempt creation", async () => {
    const fetchFn = async (url, opts) => {
      if (opts?.method === "POST") return { ok: true, json: async () => ({ number: 9 }) };
      return { ok: false, status: 500 };
    };
    const created = await openHeartbeatIssues("acme/hub", [update], { fetchFn, log: () => {} });
    expect(created).toEqual([{ number: 9 }]);
  });

  it("does not throw when creation fails for one update, and still returns the others created", async () => {
    const update2 = { ...update, name: "gamma" };
    const fetchFn = async (url, opts) => {
      if (opts?.method === "POST") {
        const body = JSON.parse(opts.body);
        if (body.title.includes("beta")) return { ok: false, status: 500 };
        return { ok: true, json: async () => ({ number: 11 }) };
      }
      return { ok: true, json: async () => [] };
    };
    const created = await openHeartbeatIssues("acme/hub", [update, update2], { fetchFn, log: () => {} });
    expect(created).toEqual([{ number: 11 }]);
  });
});

// ---------------------------------------------------------------------------
// resolveHubRepoSlug
// ---------------------------------------------------------------------------
describe("resolveHubRepoSlug", () => {
  it("prefers GITHUB_REPOSITORY from env when present", () => {
    expect(resolveHubRepoSlug(tmp, { GITHUB_REPOSITORY: "acme/hub" })).toBe("acme/hub");
  });

  it("returns null outside a git repo with no env var", () => {
    expect(resolveHubRepoSlug(tmp, {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  it("defaults to non-dry-run", () => {
    expect(parseArgs([])).toEqual({ dryRun: false });
  });
  it("parses --dry-run", () => {
    expect(parseArgs(["--dry-run"])).toEqual({ dryRun: true });
  });
});
