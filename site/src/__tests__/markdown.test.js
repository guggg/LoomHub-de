import { describe, it, expect } from "vitest";
import { splitInstall, toParts, parseInstall, installIntro } from "../markdown.js";

// ---------------------------------------------------------------------------
// splitInstall
// ---------------------------------------------------------------------------
describe("splitInstall", () => {
  it("splits body at the Install heading", () => {
    const body = "## 用途 / What\nx\n## 安裝 / Install\n```demo-terminal\n$ a\n```\n";
    const { before, install } = splitInstall(body);
    expect(before).toBe("## 用途 / What\nx\n");
    expect(install).toBe("## 安裝 / Install\n```demo-terminal\n$ a\n```\n");
  });

  it("returns install: '' when there is no Install heading at all", () => {
    const body = "## 用途 / What\nx\n";
    expect(splitInstall(body)).toEqual({ before: body, install: "" });
  });

  it("matches heading depths h1 through h6", () => {
    for (const hashes of ["#", "##", "###", "######"]) {
      const body = `${hashes} 安裝 / Install\ntext`;
      const { install } = splitInstall(body);
      expect(install).toBe(body);
    }
  });

  it("matches the alternate '安裝 / 啟動' heading (mcp-server variant, spec §3.2.2)", () => {
    // The mcp-server type's closing section is titled "安裝 / 啟動" per spec
    // §3.2.2. splitInstall must recognize it too (not only "安裝 / Install"),
    // otherwise a spec-compliant mcp-server SKILL.md renders zero install UI.
    const body = "## 安裝 / 啟動\n```demo-terminal\n$ a\n```\n";
    const { before, install } = splitInstall(body);
    expect(before).toBe("");
    expect(install).toBe(body);
  });

  it("does not match a heading with extra trailing text on the same line", () => {
    const body = "## 安裝 / Install（三家 agent）\ntext";
    const { install } = splitInstall(body);
    expect(install).toBe(""); // regex requires end-of-line right after "Install"
  });

  it("splits at the FIRST Install heading when multiple exist", () => {
    const body =
      "## 安裝 / Install\nfirst\n## 用途 / What\nx\n## 安裝 / Install\nsecond\n";
    const { before, install } = splitInstall(body);
    expect(before).toBe("");
    expect(install.startsWith("## 安裝 / Install\nfirst")).toBe(true);
  });

  it("handles an empty body", () => {
    expect(splitInstall("")).toEqual({ before: "", install: "" });
  });
});

// ---------------------------------------------------------------------------
// toParts
// ---------------------------------------------------------------------------
describe("toParts", () => {
  it("returns [] for an empty string", () => {
    expect(toParts("")).toEqual([]);
  });

  it("returns a single markdown part for plain markdown with no demo fences", () => {
    const parts = toParts("# hello\ntext");
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe("markdown");
    expect(parts[0].html).toContain("hello");
  });

  it("extracts a demo-terminal fence as its own part", () => {
    const parts = toParts("```demo-terminal\n$ foo\n```");
    expect(parts).toEqual([{ type: "terminal", text: "$ foo" }]);
  });

  it("extracts a demo-conversation fence as its own part", () => {
    const parts = toParts("```demo-conversation\nuser: hi\n```");
    expect(parts).toEqual([{ type: "conversation", text: "user: hi" }]);
  });

  it("interleaves markdown and demo fences in document order", () => {
    const md = "before\n```demo-terminal\n$ a\n```\nmiddle\n```demo-conversation\nuser: b\n```\nafter";
    const parts = toParts(md);
    expect(parts.map((p) => p.type)).toEqual([
      "markdown",
      "terminal",
      "markdown",
      "conversation",
      "markdown",
    ]);
    expect(parts[1]).toEqual({ type: "terminal", text: "$ a" });
    expect(parts[3]).toEqual({ type: "conversation", text: "user: b" });
  });

  it("drops whitespace-only markdown chunks between adjacent fences", () => {
    const md = "```demo-terminal\n$ a\n```\n   \n```demo-terminal\n$ b\n```";
    const parts = toParts(md);
    expect(parts).toEqual([
      { type: "terminal", text: "$ a" },
      { type: "terminal", text: "$ b" },
    ]);
  });

  it("strips exactly one trailing newline from fence content, preserving interior blank lines", () => {
    const parts = toParts("```demo-terminal\n$ a\n\n$ b\n```");
    expect(parts[0].text).toBe("$ a\n\n$ b");
  });

  it("does not treat an unknown fence type (e.g. ```bash) as a demo block", () => {
    const parts = toParts("```bash\necho hi\n```");
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe("markdown");
    expect(parts[0].html).toContain("echo");
  });

  it("is safe to call repeatedly on the same input (no shared regex-lastIndex leakage)", () => {
    const md = "```demo-terminal\n$ a\n```\ntext";
    const first = toParts(md);
    const second = toParts(md);
    expect(second).toEqual(first);
  });

  it("handles a fence with a language-tag suffix on the opening line (e.g. extra text after demo-terminal)", () => {
    const parts = toParts("```demo-terminal ignored-suffix\n$ a\n```");
    expect(parts).toEqual([{ type: "terminal", text: "$ a" }]);
  });
});

// ---------------------------------------------------------------------------
// parseInstall
// ---------------------------------------------------------------------------
describe("parseInstall", () => {
  it("returns [] for an empty/falsy install section", () => {
    expect(parseInstall("")).toEqual([]);
    expect(parseInstall(null)).toEqual([]);
    expect(parseInstall(undefined)).toEqual([]);
  });

  it("returns [] when there is no fenced block at all", () => {
    expect(parseInstall("## 安裝 / Install\njust prose, no fence")).toEqual([]);
  });

  it("groups commands under their preceding #-header line", () => {
    const install = [
      "## 安裝 / Install",
      "```demo-terminal",
      "# Codex + Gemini",
      "$ ln -s a b",
      "$ ln -s c d",
      "# Claude Code",
      "$ ln -s e f",
      "```",
      "",
    ].join("\n");
    expect(parseInstall(install)).toEqual([
      { label: "Codex + Gemini", commands: ["ln -s a b", "ln -s c d"] },
      { label: "Claude Code", commands: ["ln -s e f"] },
    ]);
  });

  it("falls back to a default '指令 / Commands' label when there is no # header before the first $ command", () => {
    const install = "## 安裝 / Install\n```demo-terminal\n$ npm install foo\n```\n";
    expect(parseInstall(install)).toEqual([
      { label: "指令 / Commands", commands: ["npm install foo"] },
    ]);
  });

  it("filters out header groups that end up with zero commands", () => {
    const install = [
      "## 安裝 / Install",
      "```demo-terminal",
      "# Empty Group",
      "# Another Group",
      "$ real cmd",
      "```",
    ].join("\n");
    expect(parseInstall(install)).toEqual([{ label: "Another Group", commands: ["real cmd"] }]);
  });

  it("only reads the FIRST demo-terminal fence, ignoring any subsequent ones", () => {
    const install = [
      "## 安裝 / Install",
      "```demo-terminal",
      "# Group A",
      "$ first fence command",
      "```",
      "```demo-terminal",
      "# Group B",
      "$ second fence command",
      "```",
    ].join("\n");
    const groups = parseInstall(install);
    expect(groups).toEqual([{ label: "Group A", commands: ["first fence command"] }]);
  });

  it("ignores output lines that don't start with # or $", () => {
    const install = [
      "## 安裝 / Install",
      "```demo-terminal",
      "# Group",
      "$ echo hi",
      "hi   <- this is captured stdout, not a command",
      "```",
    ].join("\n");
    expect(parseInstall(install)).toEqual([{ label: "Group", commands: ["echo hi"] }]);
  });

  it("does not misinterpret a $ appearing mid-line (only leading $ marks a command)", () => {
    const install = [
      "## 安裝 / Install",
      "```demo-terminal",
      "# Group",
      "$ echo hi",
      "cost is $5 not a command",
      "```",
    ].join("\n");
    expect(parseInstall(install)).toEqual([{ label: "Group", commands: ["echo hi"] }]);
  });

  it("handles CRLF line endings inside the fence", () => {
    const install = "## 安裝 / Install\r\n```demo-terminal\r\n# Group\r\n$ foo\r\n```\r\n";
    const groups = parseInstall(install);
    expect(groups).toEqual([{ label: "Group", commands: ["foo"] }]);
  });

  it("trims whitespace from header labels and commands", () => {
    const install = "## 安裝 / Install\n```demo-terminal\n#   Spacey Header  \n$   spacey cmd  \n```";
    expect(parseInstall(install)).toEqual([
      { label: "Spacey Header", commands: ["spacey cmd"] },
    ]);
  });

  it("skips blank lines inside the fence without breaking grouping", () => {
    const install = "## 安裝 / Install\n```demo-terminal\n# Group\n\n$ a\n\n$ b\n```";
    expect(parseInstall(install)).toEqual([{ label: "Group", commands: ["a", "b"] }]);
  });

  it("realistic mcp-server fixture: multi-vendor install block", () => {
    const install = [
      "## 安裝 / Install",
      "",
      "```demo-terminal",
      "# Codex + Gemini（共用 ~/.agents/skills）",
      '$ ln -s "$PWD/skills/my-mcp-server" ~/.agents/skills/my-mcp-server',
      "# Claude Code",
      '$ ln -s "$PWD/skills/my-mcp-server" ~/.claude/skills/my-mcp-server',
      "# 若該 agent 不支援 symlink，改用 copy 作為 fallback（兩處都裝）",
      "$ cp -R skills/my-mcp-server ~/.agents/skills/",
      "$ cp -R skills/my-mcp-server ~/.claude/skills/",
      "```",
      "",
    ].join("\n");
    const groups = parseInstall(install);
    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe("Codex + Gemini（共用 ~/.agents/skills）");
    expect(groups[0].commands).toHaveLength(1);
    expect(groups[2].commands).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// installIntro
// ---------------------------------------------------------------------------
describe("installIntro", () => {
  it("returns '' for an empty/falsy install section", () => {
    expect(installIntro("")).toBe("");
    expect(installIntro(null)).toBe("");
    expect(installIntro(undefined)).toBe("");
  });

  it("returns '' when there is no prose before the fence (heading directly followed by fence)", () => {
    const install = "## 安裝 / Install\n```demo-terminal\n$ a\n```";
    expect(installIntro(install)).toBe("");
  });

  it("renders leading prose between the heading and the first fence as HTML", () => {
    const install = "## 安裝 / Install\n\nSome intro text.\n\n```demo-terminal\n$ a\n```";
    const html = installIntro(install);
    expect(html).toContain("<p>Some intro text.</p>");
  });

  it("returns rendered HTML for prose even when there is no fence at all", () => {
    const install = "## 安裝 / Install\nJust prose, no fence.";
    const html = installIntro(install);
    expect(html).toContain("Just prose, no fence.");
  });

  it("strips the Install heading itself out of the intro", () => {
    const install = "## 安裝 / Install\n\nIntro para.\n\n```demo-terminal\n$ a\n```";
    const html = installIntro(install);
    expect(html).not.toContain("安裝 / Install");
  });

  it("real skill fixture: loom's multi-paragraph install intro before the fence", () => {
    const install = [
      "## 安裝 / Install",
      "",
      "Loom 走標準安裝機制裝進你的 agent；**裝好後 Loom 會自動 bootstrap**。",
      "",
      "```demo-terminal",
      "$ ln -s a b",
      "```",
    ].join("\n");
    const html = installIntro(install);
    expect(html).toContain("Loom 走標準安裝機制");
    expect(html).not.toContain("```");
  });
});

// ---------------------------------------------------------------------------
// Composition: splitInstall -> parseInstall / installIntro, as Detail.jsx
// actually chains them. Exercises real-file-shaped end-to-end behavior.
// ---------------------------------------------------------------------------
describe("splitInstall + parseInstall + installIntro composed (mirrors Detail.jsx)", () => {
  it("full skill body: before/install split correctly and install parses to groups", () => {
    const body = [
      "## 用途 / What",
      "does a thing",
      "",
      "## 安裝 / Install",
      "",
      "intro prose",
      "",
      "```demo-terminal",
      "# Vendor A",
      "$ install-a",
      "```",
    ].join("\n");
    const { before, install } = splitInstall(body);
    expect(before).toContain("用途 / What");
    expect(parseInstall(install)).toEqual([{ label: "Vendor A", commands: ["install-a"] }]);
    expect(installIntro(install)).toContain("intro prose");
  });

  it("a body with no Install section at all produces empty groups and empty intro", () => {
    const body = "## 用途 / What\nx\n";
    const { install } = splitInstall(body);
    expect(parseInstall(install)).toEqual([]);
    expect(installIntro(install)).toBe("");
  });
});
