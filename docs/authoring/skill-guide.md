# Skill Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-17 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: skill` assets, and Loom (skill-authoring assistant) when drafting skills that agents will install.
>
> **Shared rules live in [`docs/authoring/README.md`](./README.md) §3** (frontmatter 8 fields, common contributor checklist items, how Loom uses these guides, reference links) — this file only covers what's **specific to `type: skill`**: the required section structure, the agent-instructions section, and a worked demo.

---

## 1. What Is a Skill Asset?

**Definition:** A skill asset (`type: skill`) is an **installed capability** that an agent can call directly after installation. It is **not** a template you copy; it lives in the agent's skill directory and the agent discovers it automatically.

**When to use `type: skill`:**
- You have a reusable **capability or procedure** that agents will call repeatedly by name (e.g., "use the code-review skill," "invoke the rag-builder").
- The skill provides **agent-executable instructions** — not just text to read, but a prompt the agent follows to perform work.
- Multiple team members / projects will want the agent to have this capability installed.
- Installation via symlink (or copy) to agent directories makes sense.

> For how `skill` differs from `prompt` / `mcp-server` / `workflow`, see [`docs/authoring/README.md`](./README.md) §1.

---

## 2. Required Structure

Every skill asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this skill solve? Why install it into your agent?
2. **使用場景 / When** — Concrete situations where your agent would use it; what it's *not* for.
3. **使用方式 / How** — The actual agent-facing **instructions** in a fenced code block. This is the capability; write it for the agent to follow.
4. **Demo / 範例** — One or more real or realistic walkthroughs showing the agent invoking the skill and the outcome.
5. **安裝 / Install** — *Last section*. Symlink or copy instructions for three vendors (Claude Code, Codex, Gemini).

> ✅ Spec §3.2 / §3.2.2 define core + type-specific sections. This guide elaborates the `skill`-specific ones, especially §3 (**使用方式**, the agent instructions) and §4 (**Demo**), which demonstrate the skill in action.

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

Demo content is plain Markdown + fenced code blocks with special prefixes (see Spec §3.2.1 for the full convention):

- **`demo-conversation`:** Lines prefixed `user:`, `agent:`, `result:` are parsed as dialogue turns.
- **`demo-terminal`:** Lines starting with `$` are commands; others are output.
- **Combination:** Use narrative + multiple demo blocks if the demo is complex (e.g., step 1 in a terminal block, then the agent's interpretation in conversation block).

### 4.4 Demo in 使用方式 vs. Standalone Demo Section

- **Demo blocks in 使用方式** (the instruction section itself): Show **how the agent reads and follows** the instructions. Usually not needed; the instructions are self-explanatory.
- **Separate Demo / 範例 section**: Shows the skill being **invoked in context** (user asks for code review → agent uses the skill → output shown). This is what you want most of the time.

**Recommendation:** Put actual walkthroughs in the separate **Demo / 範例** section above. Keep **使用方式** focused on the instructions themselves.

---

## 5. Final Section: 安裝 / Install

**Last section.** This explains how to install the skill into each of the three vendors' agent environments.

```markdown
## 安裝 / Install

\```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/my-skill" ~/.agents/skills/my-skill

# Claude Code
$ ln -s "$PWD/skills/my-skill" ~/.claude/skills/my-skill

# Fallback（若 symlink 不支援）：改用 copy
$ cp -R skills/my-skill ~/.agents/skills/
$ cp -R skills/my-skill ~/.claude/skills/
\```

**或使用安裝腳本（推薦）：**

\```demo-terminal
$ node scripts/install-skill.mjs my-skill
✓ Installed to ~/.agents/skills/my-skill
✓ Installed to ~/.claude/skills/my-skill
\```

安裝完後，你的 agent 會自動發現並可開始使用這個 skill。
```

**Key points:**
- Show symlink commands for all three vendors (Claude Code, Codex, Gemini).
- Show fallback copy commands in case symlink is not supported.
- Mention the `install-skill.mjs` script as a convenience (Spec §6).
- Explain that after installation, the agent automatically discovers the skill.

---

## 6. Folder & File Structure

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

---

## 7. Contributor Checklist (skill-specific)

In addition to the shared checklist ([`README.md`](./README.md) §3.2), verify:

- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / Demo / 安裝.
- [ ] **Instructions (使用方式):** Code block present; clear role + mandate; lists inputs & outputs; states constraints & guardrails; references external context if any.
- [ ] **Demo / 範例:** Shows the skill being invoked; realistic walkthrough; shows agent's output.
  - [ ] Demo clearly maps to the instructions (reader can trace: "agent read this instruction → produced this output").
  - [ ] Uses `demo-conversation` or `demo-terminal` as appropriate.
- [ ] **Install section:** Symlink commands for Claude Code + Codex + Gemini; fallback copy commands; optional `install-skill.mjs` mention.
- [ ] **Optional files:** scripts/ / references/ / assets/ only if used; nothing extraneous.

---

## 8. Loom-Specific Note

The single most important thing for Loom to get right when drafting a `skill`: **使用方式** must be clear, executable agent instructions (role, mandate, inputs, outputs, constraints) — not a description of the skill. The Demo must make those instructions concrete with a realistic end-to-end walkthrough. (Shared Loom workflow: [`README.md`](./README.md) §3.3.)

---

## 9. Reference

- **Existing Skill Sample:** Currently the hub's only skill is `loom`, but as the hub's own authoring assistant it's atypical and not representative as a generic example — see the structural requirements above instead.
- Shared references (spec sections, schema, AGENTS.md, Loom): see [`docs/authoring/README.md`](./README.md) §3.5.
