# Tool Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-22 | **Owner:** DE Team

> **Audience:** Contributors collecting `type: tool` assets, and Loom (skill-authoring assistant) when a candidate is a fully external, standalone resource rather than agent-consumable content.
>
> **Shared rules live in [`docs/authoring/README.md`](./README.md) §3** (frontmatter 8 fields, common contributor checklist items, how Loom uses these guides, reference links) — this file only covers what's **specific to `type: tool`**: the required section structure and the 連結 / 前往 final section.

---

## 1. What Is a Tool Asset?

**Definition:** A tool asset (`type: tool`) is a **fully external, standalone resource** — a CLI, npm package, desktop app, or hosted service — that is AI-related but is **neither installable agent content nor a copyable text template**. It is not something an agent loads (that's `skill` / `mcp-server`), and not something a person copies and pastes (that's `prompt` / `workflow`). It is simply worth the team knowing about, so the hub records a link plus a short usage note.

**When to use `type: tool`:**
- The resource is a complete, independent product a person installs and runs on its own (e.g., `npm install -g openwiki`), not a folder that gets symlinked into an agent's skill directory.
- There is nothing to "copy and paste" — the value is the tool itself, run outside the hub's install mechanism.
- A teammate saw it online (GitHub repo, npm package, product page) and wants to shelve it here for the team to discover, without adapting it into a skill/prompt/mcp-server/workflow.

**When NOT to use `type: tool`:**
- It ships a config + tool definitions an agent can mount → `mcp-server`.
- It's a text template meant to be copied and filled in → `prompt`.
- It's a methodology/standard to reference, not a product to run → `workflow`.
- It's meant to be installed into an agent's skill directory and invoked by the agent → `skill`.

> For how `tool` differs from `skill` / `prompt` / `mcp-server` / `workflow`, see [`docs/authoring/README.md`](./README.md) §1 (decision step 0).

---

## 2. Required Structure

Every tool asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What does this external tool do, and why is it worth the team knowing about?
2. **使用場景 / When** — Concrete situations where someone would reach for it; what it's *not* for.
3. **使用方式 / How** — Brief, at-a-glance summary of what running/using it looks like (not a full manual — that lives upstream).
4. *(Optional)* **來源 / 出處** — Since a `tool` asset is by definition external, this section is almost always present: origin link, author/maintainer, license.
5. **連結 / 前往 / Final Section** — *Last section.* A link to the project plus a short install/usage note. **Not** an 安裝 (symlink) section, **not** a 複製/取用 (copy-the-text) section — the asset itself lives outside the hub.

> ✅ Spec §3.2 / §3.2.2 define core + type-specific sections. `tool` is the one type where the core three sections are usually sufficient on their own — there's no capability/instructions/principles table to author, since the actual thing being documented lives outside this repo.

---

## 3. Keeping It Short

A tool asset's job is to be a **pointer**, not a re-hosted manual. Don't:
- Copy the external project's full README into 使用方式 — link to it instead.
- Write a Demo / 範例 section — there's no agent invocation or methodology being demonstrated here.
- Invent an install script — the external tool's own install command (e.g., `npm install -g openwiki`) is enough.

**Example:**

```markdown
---
name: openwiki
description: External npm CLI that writes and maintains agent-readable wikis for a codebase, keeping docs in sync via `openwiki --update`. Recorded here as a pointer for the team; not installed into any agent.
type: tool
category: docs
tags: [docs, cli, external]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-22
source: https://github.com/langchain-ai/openwiki
license: MIT
---

## 用途 / What

OpenWiki is an external CLI that writes and maintains agent-readable wikis for a
codebase (or a personal knowledge base), keeping docs in sync via `openwiki --update`
and emitting `AGENTS.md` / `CLAUDE.md` files that point agents at the right docs.
Recording it here so the team knows it exists as an option for repo documentation.

## 使用場景 / When

Use when a repo's documentation keeps drifting from the code and you want an
automated, agent-friendly wiki instead of hand-maintained docs. Not a fit if you
already have a docs pipeline you're happy with, or want full control over doc prose.

## 使用方式 / How

Install globally, then `openwiki --init` in a repo to generate `openwiki/`, and
`openwiki --update` to refresh it. See the project's own README for provider setup
(OpenAI/Anthropic/Gemini/Bedrock) and CI integration.

## 來源 / 出處

- **Project:** https://github.com/langchain-ai/openwiki
- **License:** check the repo before relying on it for anything beyond personal use.

## 連結 / 前往

\```demo-terminal
$ npm install -g openwiki
$ openwiki --init
\```

前往 https://github.com/langchain-ai/openwiki 看完整說明與其他 provider 設定。
```

---

## 4. Final Section: 連結 / 前往

**Last section, always.** This is deliberately the smallest of the three "取用方式" endings (安裝 / 複製 / 連結):

```markdown
## 連結 / 前往

\```demo-terminal
$ npm install -g <package>
\```

前往 <project URL> 看完整安裝與使用說明。
```

**Key points:**
- One or two lines of install/usage command (if the project has one), wrapped in a `demo-terminal` fence so the site's copy-button still works.
- A link to the external project for anything beyond that — do not duplicate its docs here.
- No symlink commands (there's nothing in `skills/` to symlink), no "複製本文" language (there's no template text to copy).

---

## 5. Contributor Checklist (tool-specific)

In addition to the shared checklist ([`README.md`](./README.md) §3.2), verify:

- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / (optional 來源 / 出處) / 連結 / 前往.
- [ ] **`source` frontmatter field populated** — a `tool` asset is external almost by definition; fill `source` with the origin URL (and `license` if known).
- [ ] **No Demo / 範例 section** — there's no agent invocation or applied methodology to demonstrate.
- [ ] **Final section is 連結 / 前往**, not 安裝 or 複製/取用 — if you find yourself writing symlink commands or "copy this text," reclassify as `skill`/`mcp-server` or `prompt`/`workflow` instead.
- [ ] **Kept short:** 使用方式 is a summary, not a re-hosted manual; link out for details.

---

## 6. Loom-Specific Note

When Loom's decision tree (README §1, step 0) lands on "this is a fully external, standalone tool/service — not agent-installable content, not copyable text," draft it as `type: tool` with a terse 連結 / 前往 final section. Loom should resist the temptation to pad out a Demo or Install section that doesn't apply — a `tool` asset is a pointer, and the checklist above exists specifically to keep it from ballooning into a duplicate of the external project's own docs. (Shared Loom workflow: [`README.md`](./README.md) §3.3.)

---

## 7. Reference

- **Motivating example:** `https://github.com/langchain-ai/openwiki` — an external npm CLI that prompted this type's addition; see §3 above for how it would be recorded.
- Shared references (spec sections, schema, AGENTS.md, Loom): see [`docs/authoring/README.md`](./README.md) §3.5.
