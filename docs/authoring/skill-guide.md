# Skill Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-14 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: skill` assets, and Loom (skill-authoring assistant) when drafting skills that agents will install. This guide is referenced by §3.2.2 of the main spec.

---

## 1. What Is a Skill Asset?

**Definition:** A skill asset (`type: skill`) is an **installed capability** that an agent can call directly after installation. It is **not** a template you copy; it lives in the agent's skill directory and the agent discovers it automatically.

| Aspect | Skill | Prompt | Workflow |
|---|---|---|---|
| **What it is** | Installed capability (agent discovers and can call it) | Template text with `{{variables}}` to copy | Multi-step process, often cross-agent |
| **How you use it** | Agent calls it by name; already installed | Copy the template, fill variables, paste | Execute the steps; may use installed skills |
| **Installation** | Symlink into agent's skill dir (§6) | None — it's just text | Depends on content; may be text-only |
| **Final section** | 安裝 / Install (install-skill.mjs) | 複製 / 取用 (copy the template) | 取用 / 套用 (may vary) |

**When to use `type: skill`:**
- You have a reusable **capability or procedure** that agents will call repeatedly by name (e.g., "use the code-review skill," "invoke the rag-builder").
- The skill provides **agent-executable instructions** — not just text to read, but a prompt the agent follows to perform work.
- Multiple team members / projects will want the agent to have this capability installed.
- Installation via symlink (or copy) to agent directories makes sense.

---

## 2. Required Structure

Every skill asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this skill solve? Why install it into your agent?
2. **使用場景 / When** — Concrete situations where your agent would use it; what it's *not* for.
3. **使用方式 / How** — The actual agent-facing **instructions** in a fenced code block. This is the capability; write it for the agent to follow.
4. **Demo / 範例** — One or more real or realistic walkthroughs showing the agent invoking the skill and the outcome.
5. **安裝 / Install** — *Last section*. Symlink or copy instructions for three vendors (Claude Code, Codex, Gemini).

> ✅ §3.2 and §3.2.2 of the spec define core + type-specific sections. This guide elaborates the `skill`-specific sections, especially §3 (**使用方式**, the agent instructions) and §4 (**Demo**), which demonstrate the skill in action.

---

## 3. The Agent Instructions (使用方式 / How)

### 3.1 What Goes Here

The **使用方式** section contains the **actual instruction prompt** that the agent will load and follow. This is not a description of what the skill does — it **IS** the skill's executable logic.

```markdown
## 使用方式 / How

[Brief explanation of what the agent will do with this skill]

\```
[Agent instruction prompt — the agent reads and follows this]
\```
```

### 3.2 Instruction Best Practices

- **Agent role & authority:** Start with your mandate: `You are a [role]. Your job is to [task]. You have access to [tools/context].`
- **Clear inputs:** List every input the agent might receive (parameters, context, or pre-requisites). Label them clearly.
- **Explicit output structure:** Say exactly what the agent must produce: format, sections, order, and level of detail.
- **Constraints & guardrails:** State what the agent must / must not do (e.g., "only use provided facts," "no shortcuts," "verify before committing").
- **Fallback steps:** If the agent hits edge cases (e.g., "if file not found, ask user for path"; "if permissions denied, recommend fallback approach").
- **Reference external context:** If the skill uses external files, configs, or APIs, name them clearly so the agent knows where to look.

**Example (good structure):**
```
You are a code-review specialist. Your job is to review a pull request diff and identify:
1. Bugs (logic errors, off-by-one, null checks missing, race conditions).
2. Security issues (hardcoded credentials, SQL injection, XSS, broken auth).
3. Performance red flags (N+1 queries, unbounded loops, missing indexes).
4. Code quality (missing tests, poor naming, duplication).

INPUT:
- Diff: [the code changes as context]
- Language: [Python / TypeScript / Go / other]
- Project context: [brief description of what the service does]

OUTPUT:
Structure your review as:
- **Blockers** (must fix before merge): each with line number, severity (critical/high/medium), explanation, fix suggestion
- **Suggestions** (nice-to-have): same format
- **Overall risk level** (low/medium/high/critical)
- **Test coverage gaps** (what's not tested that should be)

Be specific: name the exact function, quote the line, explain the risk.
Do not approve without addressing all blockers.
```

---

## 4. Demo / 範例 — Showing the Skill in Action

The demo section shows your skill being **invoked and used** by an agent. It's a walkthrough that proves the instructions work as intended.

### 4.1 Demo Types (choose one or more)

- **`demo-conversation`:** Agent is asked to use the skill, and you show the request + agent response + outcome. Reads like a dialogue.
  - Use this when the skill's workflow is interactive or conversational (e.g., code review, design feedback, triage).
  
- **`demo-terminal`:** Agent runs the skill as a procedural / command-line task. Show input commands, output, results.
  - Use this when the skill is more procedural or command-driven (e.g., a data export, a build task, a migration).

- **Multiple demos:** If the skill has distinct modes or use cases, include 2–3 demos covering them.

### 4.2 GOOD Demo (Pattern to follow)

```demo-conversation
user: Review this PR diff for bugs and security issues:

\```python
def authenticate_user(username, password):
    user = User.query.filter(username == username).first()  # BUG: typo
    if user.password == password:  # BUG: no hashing check
        return user
    return None

def export_data(format):
    filename = f"/tmp/{format}_export.csv"  # SECURITY: no sanitization
    return open(filename, 'w')
\```

Language: Python. This is a user authentication & data export module.

agent: **Blockers**
- Line 2: Parameter name collision — `filter(username == username)` always true, so it returns first user in DB. Fix: rename param or use `filter(User.username == username)`.
  - Severity: **CRITICAL**. Allows login as any user.
- Line 3: Password comparison in plaintext — compares raw input to stored password. If password is hashed, this fails; if stored plaintext, it's a security breach.
  - Severity: **CRITICAL**. Fix: use hashing library (e.g., bcrypt) to hash input and compare.
- Line 7: Unvalidated format in filename — `format` directly interpolates into path. Attacker passes `../../../etc/passwd` and overwrites system files.
  - Severity: **CRITICAL**. Fix: whitelist allowed formats (`'csv'`, `'json'`) and reject others.

**Suggestions**
- Missing input validation: no check for empty `username`, `password`, or `format`.
- No error handling: `User.query` might raise, no try-catch.
- Test coverage: no tests shown; add unit tests for success + failure cases.

**Overall risk:** CRITICAL — ship-blocking security issues. Do not merge until all blockers fixed.

**Test gaps:** missing tests for auth failure, format injection, plaintext storage.
```

**Why this is good:**
- Demo INPUT shows actual code + context.
- Demo OUTPUT shows **exactly** what the skill instructions produce: specific line numbers, severity levels, fix suggestions, structured sections.
- Readers can validate that your skill does what you claim.

### 4.3 Rendering: Demo Block Syntax

Demo content is plain Markdown + fenced code blocks with special prefixes:

- **`demo-conversation`:** Lines prefixed `user:`, `agent:`, `result:` are parsed as dialogue turns.
  ```demo-conversation
  user: here's my question
  agent: here's my response
  result: final outcome
  ```

- **`demo-terminal`:** Lines starting with `$` are commands; others are output.
  ```demo-terminal
  $ node scripts/install-skill.mjs my-skill
  ✓ Installed to ~/.agents/skills/my-skill
  $ ls -la ~/.agents/skills/my-skill
  SKILL.md
  ```

- **Combination:** Use narrative + multiple demo blocks if the demo is complex (e.g., step 1 in a terminal block, then the agent's interpretation in conversation block).

---

## 5. Frontmatter Checklist

Every skill asset must have these **8 required fields** (§3.1 of spec):

| 欄位 | 值 / 說明 |
|---|---|
| `name` | kebab-case, ≤ 64 chars, equals folder name (e.g., `code-review-pr`) |
| `description` | What + when; rich keywords; ≤ 1024 chars |
| `type` | **`skill`** (not `prompt`, not `mcp-server`) |
| `category` | One of: `requirements` / `design` / `development` / `testing` / `ops` / `docs` / `research` / `general` (see spec §4.2) |
| `tags` | Array of lowercase kebab-case labels (e.g., `[code-review, security, ai]`) |
| `version` | semver starting at `0.1.0` |
| `owner` | Maintainer handle (e.g., `@Ty`) |
| `updated` | Today's date in `YYYY-MM-DD` format |
| `source` *(optional)* | URL if adapted from external asset |
| `license` *(optional)* | License string if adapted from external asset |

**Example frontmatter:**
```yaml
---
name: code-review-pr
description: Installed skill for an AI agent to review pull request diffs — identifies bugs, security issues, performance red flags, and test gaps; outputs a structured audit with blockers vs. suggestions and overall risk level.
type: skill
category: testing
tags: [code-review, security, ci-cd, testing]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-14
---
```

---

## 6. Demo in 使用方式 vs. Standalone Demo Section

**Key distinction:**

- **Demo blocks in 使用方式** (the instruction section itself): Show **how the agent reads and follows** the instructions. Usually not needed; the instructions are self-explanatory.
  
- **Separate Demo / 範例 section**: Shows the skill being **invoked in context** (user asks for code review → agent uses the skill → output shown). This is what you want most of the time.

**Recommendation:** Put actual walkthroughs in the separate **Demo / 範例** section (§4 above). Keep **使用方式** focused on the instructions themselves.

---

## 7. Final Section: 安裝 / Install

**Last section.** This explains how to install the skill into each of the three vendors' agent environments.

```markdown
## 安裝 / Install

\```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/code-review-pr" ~/.agents/skills/code-review-pr

# Claude Code
$ ln -s "$PWD/skills/code-review-pr" ~/.claude/skills/code-review-pr

# Fallback（若 symlink 不支援）：改用 copy
$ cp -R skills/code-review-pr ~/.agents/skills/
$ cp -R skills/code-review-pr ~/.claude/skills/
\```

**或使用安裝腳本（推薦）：**

\```demo-terminal
$ node scripts/install-skill.mjs code-review-pr
✓ Installed to ~/.agents/skills/code-review-pr
✓ Installed to ~/.claude/skills/code-review-pr
\```

安裝完後，你的 agent 會自動發現並可開始使用這個 skill。
```

**Key points:**
- Show symlink commands for all three vendors (Claude Code, Codex, Gemini).
- Show fallback copy commands in case symlink is not supported.
- Mention the `install-skill.mjs` script as a convenience (§6 of spec).
- Explain that after installation, the agent automatically discovers the skill.

---

## 8. Folder & File Structure

```
skills/my-skill/
├── SKILL.md                           # ★ 必要。正文、Demo、安裝指令
├── scripts/                           # 選用
│   └── my-helper.sh
├── references/                        # 選用
│   ├── template.md
│   └── checklist.txt
└── assets/                            # 選用
    └── diagram.png
```

- **SKILL.md:** Frontmatter + 用途 / 使用場景 / 使用方式 / Demo / 安裝.
- **scripts/:** Optional helper scripts the agent might reference or use.
- **references/:** Optional supporting docs (templates, checklists, background).
- **assets/:** Optional images, diagrams, or other files.

**Naming:**
- Folder name = `name` field in kebab-case.
- Main file is always `SKILL.md` (agentskills.io standard).

---

## 9. Contributor Checklist

Before submitting a skill asset, verify:

- [ ] **Frontmatter:** All 8 required fields present; `type: skill`; valid category; semver format.
- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / Demo / 安裝.
- [ ] **Instructions (使用方式):** Code block present; clear role + mandate; lists inputs & outputs; states constraints & guardrails; references external context if any.
- [ ] **Demo / 範例:** Shows the skill being invoked; realistic walkthrough; shows agent's output.
  - [ ] Demo clearly maps to the instructions (reader can trace: "agent read this instruction → produced this output").
  - [ ] Uses `demo-conversation` or `demo-terminal` as appropriate.
  - [ ] If complex, multiple demos are OK (different use cases).
- [ ] **Install section:** Symlink commands for Claude Code + Codex + Gemini; fallback copy commands; optional `install-skill.mjs` mention.
- [ ] **Naming & path:** Folder name = `name` field in kebab-case; file is `SKILL.md`.
- [ ] **Optional files:** scripts/ / references/ / assets/ only if used; nothing extraneous.

---

## 10. Loom-Specific Notes

If Loom is drafting your skill:

- Loom will **detect** that the work is a candidate for `type: skill` (a reusable agent capability, not a one-off prompt or process).
- Loom will **read** `schema/skill.schema.json` and this guide (§8–10) to fill frontmatter, structure, and Demo correctly.
- **For 使用方式**, Loom **must** write clear agent instructions — the role, mandate, inputs, outputs, constraints. This is the **single most important part** of a skill.
- **For Demo**, Loom should show a realistic end-to-end walthrough of the agent using the skill. The demo must make the instructions concrete.
- Loom will call the existing §5 (AGENTS.md) checks afterward to validate the skill before handing it to you for submission.

---

## 11. Reference

- **Main Spec:** `/docs/03-spec.md` — §3.2 (section structure), §3.2.1 (demo blocks), §3.2.2 (type-specific sections for `skill`), §6 (install mechanism).
- **Existing Skill Sample:** `/skills/dbt-model-scaffold/SKILL.md` — exemplifies a full workflow skill with demo.
- **Loom:** `/skills/loom/SKILL.md` — uses this guide + schema when drafting skills.
