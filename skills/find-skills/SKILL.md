---
name: find-skills
description: 協助使用者搜尋、評估並安裝可擴充 AI agent 能力的 skills；當使用者詢問「如何做 X」、想找現成 skill、工具、模板或工作流程，或希望擴充 agent capabilities 時使用。Helps users discover, assess, and install agent skills from the open skills ecosystem.
type: skill
category: general
tags: [agent-skills, skill-discovery, skill-installation, skills-cli, 技能搜尋, 技能安裝, 能力擴充]
version: 0.1.0
owner: "@Ty"
updated: 2026-09-17
source: https://github.com/vercel-labs/skills/tree/main/skills/find-skills
license: MIT
upstream:
  type: github
  checked_at: 2026-09-17
  repo: vercel-labs/skills
  track: commit
  ref: 773fb2c7bbf16781670a3520affc4abd0c6151ae
  branch: main
  path: skills/find-skills/SKILL.md
---

# Find Skills

## 用途 / What

<!-- upstream-body:what:start -->
This skill helps you discover and install skills from the open agent skills ecosystem.
<!-- upstream-body:what:end -->

## 使用場景 / When

<!-- upstream-body:when:start -->
Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)
<!-- upstream-body:when:end -->

Use `find-skills` when a suitable reusable capability may already exist in the public ecosystem. Use `loom` when the current work should instead be authored and shared as a new team asset.

## 使用方式 / How

Follow these instructions when the skill is triggered:

```text
You help users discover, assess, and install reusable agent skills.

INPUT:
- The capability or task the user wants help with.
- Optional domain, framework, preferred source, or installation constraints.

OUTPUT:
- A short list of relevant skills with purpose, source, adoption signals, install command, and reference page.
- A clear recommendation when one option is materially stronger.
- An installation offer after the user chooses an option.

CONSTRAINTS:
- Check established or popular skills before broad search.
- Do not recommend a skill from search results alone; verify quality and source.
- Do not install anything until the user selects or approves an option.
- If no suitable skill exists, say so and offer to help directly.
- Treat the upstream `npx skills init` fallback as guidance for standalone or public-ecosystem skills; route assets intended for this team hub to `loom` instead.

Use the upstream guidance below for the detailed workflow.
```

<!-- upstream-body:how:start source=https://github.com/vercel-labs/skills/tree/main/skills/find-skills ref=773fb2c7bbf16781670a3520affc4abd0c6151ae -->
## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query] [--owner <owner>]` - Search for skills interactively or by keyword, optionally scoped to a GitHub owner
- `npx skills add <package>` - Install a skill from GitHub or other sources
- `npx skills update` - Update all installed skills

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists

### Step 2: Check the Leaderboard First

Before running a CLI search, check the [skills.sh leaderboard](https://skills.sh/) to see if a well-known skill already exists for the domain. The leaderboard ranks skills by total installs, surfacing the most popular and battle-tested options.

For example, top skills for web development include:

- `vercel-labs/agent-skills` — React, Next.js, web design (100K+ installs each)
- `anthropics/skills` — Frontend design, document processing (100K+ installs)

### Step 3: Search for Skills

If the leaderboard doesn't cover the user's need, run the find command:

```bash
npx skills find [query] [--owner <owner>]
```

For example:

- User asks "how do I make my React app faster?" → `npx skills find react performance`
- User asks "can you help me with PR reviews?" → `npx skills find pr review`
- User asks "I need to create a changelog" → `npx skills find changelog`

### Step 4: Verify Quality Before Recommending

**Do not recommend a skill based solely on search results.** Always verify:

1. **Install count** — Prefer skills with 1K+ installs. Be cautious with anything under 100.
2. **Source reputation** — Official sources (`vercel-labs`, `anthropics`, `microsoft`) are more trustworthy than unknown authors.
3. **GitHub stars** — Check the source repository. A skill from a repo with <100 stars should be treated with skepticism.

### Step 5: Present Options to the User

When you find relevant skills, present them to the user with:

1. The skill name and what it does
2. The install count and source
3. The install command they can run
4. A link to learn more at skills.sh

Example response:

```text
I found a skill that might help! The "react-best-practices" skill provides
React and Next.js performance optimization guidelines from Vercel Engineering.
(185K installs)

To install it:
npx skills add vercel-labs/agent-skills@react-best-practices

Learn more: https://skills.sh/vercel-labs/agent-skills/react-best-practices
```

### Step 6: Offer to Install

If the user wants to proceed, you can install the skill for them:

```bash
npx skills add <owner/repo@skill> -g -y
```

The `-g` flag installs globally (user-level) and `-y` skips confirmation prompts.

## Common Skill Categories

When searching, consider these common categories:

| Category        | Example Queries                          |
| --------------- | ---------------------------------------- |
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing         | testing, jest, playwright, e2e           |
| DevOps          | deploy, docker, kubernetes, ci-cd        |
| Documentation   | docs, readme, changelog, api-docs        |
| Code Quality    | review, lint, refactor, best-practices   |
| Design          | ui, ux, design-system, accessibility     |
| Productivity    | workflow, automation, git                |

## Tips for Effective Searches

1. **Use specific keywords**: "react testing" is better than just "testing"
2. **Try alternative terms**: If "deploy" doesn't work, try "deployment" or "ci-cd"
3. **Check popular sources**: Many skills come from `vercel-labs/agent-skills` or `ComposioHQ/awesome-claude-skills`

## When No Skills Are Found

If no relevant skills exist:

1. Acknowledge that no existing skill was found
2. Offer to help with the task directly using your general capabilities
3. Suggest the user could create their own skill with `npx skills init`

Example:

```text
I searched for skills related to "xyz" but didn't find any matches.
I can still help you with this task directly! Would you like me to proceed?

If this is something you do often, you could create your own skill:
npx skills init my-xyz-skill
```

<!-- upstream-body:how:end -->

> Team-hub qualification: use the upstream `npx skills init` guidance for standalone or public-ecosystem skills. If the asset is intended for this team hub, use `loom` and follow the hub authoring and validation workflow instead.

## Demo / 範例

```demo-conversation
user: Find a skill that can help review pull requests for security problems.

agent: I’ll identify the specific review needs, check established skills first, search for relevant alternatives if necessary, and verify each candidate’s source and adoption signals before recommending it.

result: The user receives a short comparison containing each relevant skill’s purpose, source, adoption indicators, installation command, and reference page. Installation occurs only after the user chooses an option.
```

## 來源 / 出處

這是一個協助 agent 搜尋、評估與安裝其他 skills 的能力。收錄後可在使用者詢問「有沒有現成 skill 能做某件事」或希望擴充 agent 能力時自動觸發。

- 公開目錄頁：`https://agenticskills.io/skills/find-skills`
- Canonical upstream：`https://github.com/vercel-labs/skills/tree/main/skills/find-skills`
- 原作者／維護者：Vercel Labs
- 授權：MIT
- 收錄方式：保留上游英文內容，新增 LoomHub-de frontmatter、必要的雙語小節、中文搜尋詞、agent 指令結構、Demo、來源導讀與安裝方式。

## 安裝 / Install

使用 repository installer：

```demo-terminal
$ node scripts/install-skill.mjs find-skills
```

手動安裝：

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ mkdir -p ~/.agents/skills
$ ln -s "$PWD/skills/find-skills" ~/.agents/skills/find-skills

# Claude Code
$ mkdir -p ~/.claude/skills
$ ln -s "$PWD/skills/find-skills" ~/.claude/skills/find-skills

# Fallback（若 symlink 不支援）
$ cp -R skills/find-skills ~/.agents/skills/
$ cp -R skills/find-skills ~/.claude/skills/
```
