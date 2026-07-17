# Workflow Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-17 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: workflow` assets, and Loom (skill-authoring assistant) when drafting methodology / standard documents.
>
> **Shared rules live in [`docs/authoring/README.md`](./README.md) §3** (frontmatter 8 fields, common contributor checklist items, how Loom uses these guides, reference links) — this file only covers what's **specific to `type: workflow`**: the required section structure and — the load-bearing part of this guide — §7's principles/per-stage-standards table.

---

## 1. What Is a Workflow Asset?

**Definition:** A workflow asset (`type: workflow`) is a **methodology / standard / principle** describing HOW something should be done — what stages exist, what "done right" looks like, quality bars, review criteria. It is **not executed to produce a direct result**; it is **followed / referenced as guidance** while a person or agent does the actual work. Removing it doesn't make the work impossible — it just means there's no standard to follow, so the work could be done inconsistently.

**The real distinction from `skill` is executable capability vs. methodology — NOT step-count or people-count.**

- `skill` = an **executable** capability an agent runs to produce a direct result. "Do X" → it does X. It can have many internal steps (e.g. "triage this alert" runs several SQL queries in sequence) — still a skill, because it's one thing being **executed** to produce a result.
- `workflow` = **guidance** describing how work should be done, referenced while the work happens. A solo methodology ("when writing code: write the implementation, then write unit tests, then verify") is still `workflow` — it's guidance, not a runnable capability. Number of people/roles involved is irrelevant.

**Test question:** does this produce a result when executed, or does it describe/govern how work SHOULD be done? → executes to a result = `skill`; governs/standardizes how work is done = `workflow`.

**Because a workflow is by definition not an executable artifact, its final section is *always* 取用 / 套用 — never 安裝.** A "workflow with bundled executable scripts" doesn't exist under this definition: if it's executed to produce a result, it's a `skill`, full stop, no matter how many internal steps it has.

**When to use `type: workflow`:**

- You have a **standard / principle / quality bar** that governs how a piece of work should be done (e.g., "what makes a PR mergeable," "our code-review checklist," "our incident postmortem quality bar," "the RAG knowledge-base build methodology — what 'done right' means at each stage").
- It's meant to be **referenced/followed** while a person (or agent) does the actual work — not executed on its own to produce an output.
- It can apply to solo work (a personal SOP you follow) or team work (a shared review standard) — that distinction doesn't matter for classification.
- If in doubt, ask: "if I run this, does it produce a result — or does it just tell me what a good result looks like?" The former is `skill`; the latter is `workflow`.

**When NOT to use `type: workflow`** (use `skill` instead):

- The asset is a sequence of concrete actions that, when executed, directly produces a file / deployment / query result — even if it has many steps or a strict order (e.g., a scaffold script, a triage runbook that runs specific SQL). That's an executable multi-step **capability**, i.e. `skill`.

> For how `workflow` differs from `skill` / `prompt` / `mcp-server`, see also [`docs/authoring/README.md`](./README.md) §1.

---

## 2. Required Structure

Every workflow asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this methodology/standard solve? What does "done right" look like?
2. **使用場景 / When** — Concrete situations where someone would reach for this standard; what it's *not* for.
3. **使用方式 / How** — Brief overview of how someone applies/references this methodology (self-check while working, review checklist for others, etc.).
4. **前置條件 / Prerequisites** — What context or preconditions make this standard applicable.
5. **適用原則 / 各階段標準** — The principles, and for each applicable stage, what "done right" looks like (quality bar, review criteria).
6. **Demo / 範例** — A worked example showing the standard applied to a concrete case.
7. *(Optional)* **來源 / 出處** — If adapted from external sources.
8. **取用 / 套用 / Final Section** — Always **取用 / 套用** (copy the methodology and apply it) — never 安裝, because a workflow is guidance, not a runnable artifact.

> ✅ Spec §3.2 / §3.2.2 define core + type-specific sections. This guide elaborates the `workflow`-specific ones, especially **§4** (適用原則 / 各階段標準), which is the load-bearing section.

---

## 3. The Problem & Benefit (用途 / What)

Clearly state:

- **What does this standardize?** (e.g., "what a mergeable PR looks like," "how a solo contributor sequences test-writing vs. implementation," "the quality bar for a RAG knowledge-base build.")
- **What does "done right" look like at a glance?** (e.g., "every PR has passing tests, no unreviewed TODOs, and a changelog line.")
- **Why is standardizing this valuable?** (e.g., "reduces review back-and-forth," "keeps quality consistent across contributors," "prevents entire classes of regressions.")
- **Who follows/references this?** (the author themself, a reviewer, both.)

**Example:**

```markdown
## 用途 / What

This standard defines what makes a pull request mergeable on the DE team, and what
reviewers must check before approving. It exists so that review quality doesn't depend
on who happens to review — every PR is held to the same bar regardless of author or
reviewer.

A PR that meets this standard:
- Has tests covering the changed behavior (not just "it compiles").
- Has no unresolved TODOs that mask incomplete work.
- Has a commit message explaining *why*, not just *what*.
- Passes CI and has been run against a realistic scenario, not just unit-tested in isolation.

Following this consistently has cut post-merge regressions and review round-trips.
```

Also cover **使用場景 / When** (concrete use / non-use cases) and **前置條件 / Prerequisites** (what context makes the standard applicable, e.g. "applies once the PR is out of draft") — both brief, entry-point sections; see the worked example in §5 below for how they read end-to-end.

---

## 4. Principles & Per-Stage Standards (適用原則 / 各階段標準) — THE CRITICAL SECTION

This is the **heart of the workflow**. State the underlying principle, then break down what "done right" looks like per applicable stage/dimension. Each entry should be concrete enough that two different reviewers reach the same verdict.

### 4.1 The Rule: Principle → Concrete Criteria → How to Judge

For each stage/dimension, state:

- **Principle** — The one-sentence "why this matters."
- **Criteria** — What must be true for this dimension to pass.
- **How to judge** — What a reviewer/self-checker actually looks at (not vague — "check X in file/PR diff").

### 4.2 BAD Example (Anti-pattern)

| Dimension | Standard |
|---|---|
| Tests | Should have tests |
| Commits | Should be clean |
| Docs | Should be documented |

**Why this is bad:**

- No concrete criteria; "should have tests" doesn't say what counts as adequate coverage.
- No way to judge consistently — two reviewers could disagree on what "clean" means.
- Nothing tells the author *how* to self-check before requesting review.

### 4.3 GOOD Example (Pattern to follow)

| Dimension | Principle | Criteria (done right) | How to judge |
|---|---|---|---|
| Test coverage | Behavior changes must be provably correct, not just "it compiles" | New/changed logic has a test that fails without the change and passes with it | Temporarily revert the change locally; the new test should fail. If it doesn't, the test isn't actually covering the change. |
| Commit hygiene | History should explain *why*, not just *what*, for future debugging | Commit message states the motivation/root cause, not just a restatement of the diff | Read the message without looking at the diff — can you tell why this change was needed? |
| No masked TODOs | Incomplete work should never look finished | No `TODO` / `FIXME` that silently changes behavior (e.g., a stubbed error path) | Grep the diff for `TODO`/`FIXME`/`XXX`; each one must have a linked issue or be removed |
| PR size | Reviewable in one sitting, or it won't get a careful review | Diff is scoped to one logical change; unrelated refactors are split into separate PRs | If the diff mixes a rename/reformat with a behavior change, request a split |

**Why this is good:**

- Each dimension has a **principle** (the "why"), not just a rule to follow blindly.
- Criteria are **concrete**: a reviewer can check them without guessing.
- "How to judge" gives an **actual verification step**, not just a restatement of the criterion.
- A different reviewer applying this to the same PR should reach the same verdict.

### 4.4 Table Template

```markdown
| Dimension | Principle | Criteria (done right) | How to judge |
|---|---|---|---|
| [name] | [why this matters] | [what must be true] | [concrete check] |
| ... | ... | ... | ... |
```

---

## 5. Demo / 範例 — The Standard Applied

Show the standard applied to a concrete case — not a workflow executing, but a worked example of judgment: here's a PR/situation, here's how the standard evaluates it, here's the verdict.

### 5.1 GOOD Demo (Pattern to follow)

```demo-conversation
user: Can you review this PR against our merge standard? It adds a retry to the
payment webhook handler, diff is one function, no new tests, commit message is
"fix retry".

agent: Checking against §4:

- **Test coverage:** ✗ Fails. No test added; can't confirm the retry actually
  triggers on the failure case it's meant to handle. Revert-test: reverting the
  change wouldn't fail anything, because nothing exercises the new path.
- **Commit hygiene:** ✗ Fails. "fix retry" doesn't say why — was this a customer
  incident? A flaky third-party API? Future debugging needs that context.
- **No masked TODOs:** ✓ Passes. No TODO/FIXME in the diff.
- **PR size:** ✓ Passes. Single function, scoped change.

result: Request changes. Cite: (1) add a test that fails without the retry logic
and passes with it, (2) rewrite the commit message to state what triggered this
fix.
```

### 5.2 Rendering Note

Use `demo-conversation` for a review-style walkthrough (as above), or `demo-terminal` if the worked example is more naturally a checklist run against a file/log. Either is fine — pick whichever makes the worked example read most naturally; a workflow's demo is about **judgment applied to a case**, not commands executing.

---

## 6. Why Workflow Is Always 取用 / 套用 (Final Section)

A workflow's final section is **always** `取用 / 套用` — there is no decision tree here, unlike `skill` (always 安裝) or the old (incorrect) workflow definition that branched on "does it have bundled scripts."

**Why no branching is possible:** under the executable-capability-vs-methodology definition, a workflow is *by construction* not something you install or run. It's guidance a person (or agent) holds the actual work up against. If an asset *does* include runnable scripts/templates that get executed to produce output, that asset is a `skill` — regardless of how many steps it has, and regardless of whether the author originally thought of it as a "process." There is no valid case where a `type: workflow` asset needs an 安裝 section; if you find yourself wanting one, that's a signal the asset should be reclassified as `skill`.

### 6.1 Example: 取用 / 套用

```markdown
## 取用 / 套用

這是一份**方法論 / 審查標準**，沒有可安裝的檔案——直接**參照或複製本文的原則與各階段標準**：

1. 讀 §4 的「適用原則 / 各階段標準」。
2. 自己下筆時：對照每個維度自檢，落筆前先過一輪。
3. 審查他人時：逐維度核對，指出不符合的具體項目（而非模糊地說「感覺不夠好」）。
4. 若團隊實務有調整，直接更新本文並升版，不需另立分支。

這份標準本身不會被「執行」——它是你判斷「這個工作做得夠不夠好」時參照的基準。
```

---

## 7. Source / Attribution (來源 / 出處) — If Applicable

If this standard is adapted from an external source:

```markdown
## 來源 / 出處

- **Original source:** Inspired by Google's Engineering Practices "How to do a code review" guide (https://google.github.io/eng-practices/review/reviewer/).
- **Why we adapted it:** Team wanted a concrete, team-specific bar rather than general review advice.
- **What we changed:**
  1. Added the "revert-test" verification technique for test coverage.
  2. Added our own commit-message and PR-size criteria.
- **License:** CC-BY-3.0 (original); our adaptation is team-internal.
```

---

## 8. Frontmatter Example

**Example frontmatter** (field definitions are shared — see [`README.md`](./README.md) §3.1):
```yaml
---
name: pr-merge-standard
description: Team code-review quality bar defining what makes a PR mergeable—test coverage (revert-test technique), commit hygiene, no masked TODOs, PR size—applied by authors self-checking before review and reviewers evaluating PRs.
type: workflow
category: testing
tags: [code-review, standard, quality]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-16
---
```

---

## 9. Contributor Checklist (workflow-specific)

In addition to the shared checklist ([`README.md`](./README.md) §3.2), verify:

- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / 前置條件 / 適用原則 / 各階段標準 / Demo / (optional 來源 / 出處) / 取用 / 套用.
- [ ] **前置條件 / Prerequisites:** What context/preconditions make this standard applicable.
- [ ] **適用原則 / 各階段標準:** Table or list with each dimension showing principle (why it matters), criteria (what must be true), and how to judge (a concrete, repeatable check — not vague language).
- [ ] **Demo / 範例:** A worked example applying the standard to a concrete case, with a clear verdict.
- [ ] **Final section:** Is **取用 / 套用**, NOT 安裝 (workflow is never installed — see §6). If you find yourself wanting an 安裝 section, reclassify as `skill` instead.
- [ ] **Not actually a skill:** Re-check against §1's test question — does this produce a result when run, or does it govern how work should be done? If the former, this should be `type: skill`, not `workflow`.

---

## 10. Loom-Specific Note

Loom must read §4 (適用原則 / 各階段標準) carefully — each dimension needs a concrete principle, criteria, and a repeatable way to judge it; this is the critical section. Loom always uses 取用 / 套用 as the final section (§6) — there's no decision to make there. If unsure whether something is `workflow` or `skill`, Loom defaults to asking §1's test question rather than guessing from step-count. (Shared Loom workflow: [`README.md`](./README.md) §3.3.)

---

## 11. Reference

- **Existing Skill Sample (not workflow):** `/skills/dbt-model-scaffold/SKILL.md` was reclassified from `workflow` to `skill` (2026-07-17) — it's an executable scaffold checklist, not a methodology. Use the worked example in §5 above, not that file, as your `workflow` pattern to follow.
- Shared references (spec sections, schema, AGENTS.md, Loom): see [`docs/authoring/README.md`](./README.md) §3.5.
