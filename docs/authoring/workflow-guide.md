# Workflow Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-16 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: workflow` assets, and Loom (skill-authoring assistant) when drafting methodology / standard documents. This guide is referenced by §3.2.2 of the main spec.

---

## 1. What Is a Workflow Asset?

**Definition:** A workflow asset (`type: workflow`) is a **methodology / standard / principle** describing HOW something should be done — what stages exist, what "done right" looks like, quality bars, review criteria. It is **not executed to produce a direct result**; it is **followed / referenced as guidance** while a person or agent does the actual work. Removing it doesn't make the work impossible — it just means there's no standard to follow, so the work could be done inconsistently.

**The real distinction from `skill` is executable capability vs. methodology — NOT step-count or people-count.**

- `skill` = an **executable** capability an agent runs to produce a direct result. "Do X" → it does X. It can have many internal steps (e.g. "triage this alert" runs several SQL queries in sequence) — still a skill, because it's one thing being **executed** to produce a result.
- `workflow` = **guidance** describing how work should be done, referenced while the work happens. A solo methodology ("when writing code: write the implementation, then write unit tests, then verify") is still `workflow` — it's guidance, not a runnable capability. Number of people/roles involved is irrelevant.

**Test question:** does this produce a result when executed, or does it describe/govern how work SHOULD be done? → executes to a result = `skill`; governs/standardizes how work is done = `workflow`.

| Aspect | Workflow | Skill | Prompt |
|---|---|---|---|
| **What it is** | Methodology / standard describing how work should be done | Installed, executable capability that produces a direct result | Single template to copy |
| **How you use it** | Follow/reference it while doing the work (yourself, or judging others' work) | Agent calls it by name to execute | Copy, fill, and use |
| **Installation** | None — it's guidance, not a runnable artifact | Symlink to agent skill dir | None — text only |
| **Final section** | 取用 / 套用 (copy the methodology; always, never installed) | 安裝 / Install (symlink) | 複製 / 取用 (copy text) |

**Because a workflow is by definition not an executable artifact, its final section is *always* 取用 / 套用 — never 安裝.** A "workflow with bundled executable scripts" doesn't exist under this definition: if it's executed to produce a result, it's a `skill`, full stop, no matter how many internal steps it has.

**When to use `type: workflow`:**

- You have a **standard / principle / quality bar** that governs how a piece of work should be done (e.g., "what makes a PR mergeable," "our code-review checklist," "our incident postmortem quality bar," "the RAG knowledge-base build methodology — what 'done right' means at each stage").
- It's meant to be **referenced/followed** while a person (or agent) does the actual work — not executed on its own to produce an output.
- It can apply to solo work (a personal SOP you follow) or team work (a shared review standard) — that distinction doesn't matter for classification.
- If in doubt, ask: "if I run this, does it produce a result — or does it just tell me what a good result looks like?" The former is `skill`; the latter is `workflow`.

**When NOT to use `type: workflow`** (use `skill` instead):

- The asset is a sequence of concrete actions that, when executed, directly produces a file / deployment / query result — even if it has many steps or a strict order (e.g., a scaffold script, a triage runbook that runs specific SQL). That's an executable multi-step **capability**, i.e. `skill`.

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

> ✅ §3.2 and §3.2.2 of the spec define core + type-specific sections. This guide elaborates the `workflow`-specific sections, especially **§5** (適用原則 / 各階段標準), which is the load-bearing section.

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

---

## 4. Use Cases & Constraints (使用場景 / When)

List concrete scenarios:

**When to use:**

- Reviewing a PR and deciding whether it's ready to merge.
- Writing a PR yourself and self-checking before requesting review.
- Onboarding a new contributor to the team's quality bar.

**When NOT to use:**

- Judging a work-in-progress / draft PR that isn't seeking review yet.
- One-off spike/throwaway code explicitly marked as such.
- As a substitute for the actual review — this is the *bar*, not a replacement for judgment on edge cases the bar doesn't cover.

---

## 5. How to Apply It (使用方式 / How)

Keep this brief — it's an entry point, not the full standard. Just say:

- **Who applies it:** "The PR author self-checks before requesting review" / "The reviewer runs through this checklist before approving."
- **When in the process:** "Before requesting review" / "During review, before approving."
- **What happens if it's not met:** "Request changes citing the specific criterion not met."

**Example:**

```markdown
## 使用方式 / How

**As the author:** Before requesting review, self-check your PR against §5 below. Fix
anything that doesn't meet the bar — don't rely on the reviewer to catch it.

**As the reviewer:** Walk through §5 for the PR's stage (e.g., "test coverage,"
"commit hygiene"). If a criterion isn't met, request changes and cite which one —
don't approve "informally" and mention it in a comment after the fact.

This isn't a tool you run — it's a checklist you hold the work up against.
```

---

## 6. Prerequisites (前置條件)

List **what context makes this standard applicable:**

- Preconditions for the standard to make sense (e.g., "applies to PRs targeting `main`," "applies once code has left draft/spike stage").
- Any shared understanding assumed (e.g., "assumes familiarity with the team's testing conventions").
- Tools or access needed to actually check compliance (e.g., "CI must be green before this checklist applies").

**Example:**

```markdown
## 前置條件 / Prerequisites

This standard applies once:

- ✅ The PR is out of draft and explicitly requesting review (not a WIP/spike).
- ✅ CI has run at least once (a red CI PR fails §5.3 automatically — no need to review further).
- ✅ The reviewer has access to run the project locally, in case a claim needs verifying.
```

---

## 7. Principles & Per-Stage Standards (適用原則 / 各階段標準) — THE CRITICAL SECTION

This is the **heart of the workflow**. State the underlying principle, then break down what "done right" looks like per applicable stage/dimension. Each entry should be concrete enough that two different reviewers reach the same verdict.

### 7.1 The Rule: Principle → Concrete Criteria → How to Judge

For each stage/dimension, state:

- **Principle** — The one-sentence "why this matters."
- **Criteria** — What must be true for this dimension to pass.
- **How to judge** — What a reviewer/self-checker actually looks at (not vague — "check X in file/PR diff").

### 7.2 BAD Example (Anti-pattern)

| Dimension | Standard |
|---|---|
| Tests | Should have tests |
| Commits | Should be clean |
| Docs | Should be documented |

**Why this is bad:**

- No concrete criteria; "should have tests" doesn't say what counts as adequate coverage.
- No way to judge consistently — two reviewers could disagree on what "clean" means.
- Nothing tells the author *how* to self-check before requesting review.

### 7.3 GOOD Example (Pattern to follow)

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

### 7.4 Table Template

```markdown
| Dimension | Principle | Criteria (done right) | How to judge |
|---|---|---|---|
| [name] | [why this matters] | [what must be true] | [concrete check] |
| ... | ... | ... | ... |
```

---

## 8. Demo / 範例 — The Standard Applied

Show the standard applied to a concrete case — not a workflow executing, but a worked example of judgment: here's a PR/situation, here's how the standard evaluates it, here's the verdict.

### 8.1 GOOD Demo (Pattern to follow)

```demo-conversation
user: Can you review this PR against our merge standard? It adds a retry to the
payment webhook handler, diff is one function, no new tests, commit message is
"fix retry".

agent: Checking against §7:

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

### 8.2 Rendering Note

Use `demo-conversation` for a review-style walkthrough (as above), or `demo-terminal` if the worked example is more naturally a checklist run against a file/log. Either is fine — pick whichever makes the worked example read most naturally; a workflow's demo is about **judgment applied to a case**, not commands executing.

---

## 9. Source / Attribution (來源 / 出處) — If Applicable

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

## 10. Why Workflow Is Always 取用 / 套用 (Final Section)

A workflow's final section is **always** `取用 / 套用` — there is no decision tree here, unlike `skill` (always 安裝) or the old (incorrect) workflow definition that branched on "does it have bundled scripts."

**Why no branching is possible:** under the executable-capability-vs-methodology definition, a workflow is *by construction* not something you install or run. It's guidance a person (or agent) holds the actual work up against. If an asset *does* include runnable scripts/templates that get executed to produce output, that asset is a `skill` — regardless of how many steps it has, and regardless of whether the author originally thought of it as a "process." There is no valid case where a `type: workflow` asset needs an 安裝 section; if you find yourself wanting one, that's a signal the asset should be reclassified as `skill`.

### 10.1 Example: 取用 / 套用

```markdown
## 取用 / 套用

這是一份**方法論 / 審查標準**，沒有可安裝的檔案——直接**參照或複製本文的原則與各階段標準**：

1. 讀 §7 的「適用原則 / 各階段標準」。
2. 自己下筆時：對照每個維度自檢，落筆前先過一輪。
3. 審查他人時：逐維度核對，指出不符合的具體項目（而非模糊地說「感覺不夠好」）。
4. 若團隊實務有調整，直接更新本文並升版，不需另立分支。

這份標準本身不會被「執行」——它是你判斷「這個工作做得夠不夠好」時參照的基準。
```

---

## 11. Frontmatter Checklist

Every workflow asset must have these **8 required fields** (§3.1 of spec):

| 欄位 | 值 / 說明 |
|---|---|
| `name` | kebab-case, ≤ 64 chars, equals folder name (e.g., `pr-merge-standard`) |
| `description` | What + when; rich keywords; ≤ 1024 chars |
| `type` | **`workflow`** (not `skill`, not `prompt`) |
| `category` | One of: `requirements` / `design` / `development` / `testing` / `ops` / `docs` / `research` / `general` (see spec §4.2) |
| `tags` | Array of lowercase kebab-case labels (e.g., `[code-review, standard, quality]`) |
| `version` | semver starting at `0.1.0` |
| `owner` | Maintainer handle (e.g., `@Ty`) |
| `updated` | Today's date in `YYYY-MM-DD` format |
| `source` *(optional)* | URL if adapted from external source |
| `license` *(optional)* | License string if adapted from external source |

---

## 12. Contributor Checklist

Before submitting a workflow asset, verify:

- [ ] **Frontmatter:** All 8 required fields present; `type: workflow`; valid category; semver format.
- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / 前置條件 / 適用原則 / 各階段標準 / Demo / (optional 來源 / 出處) / 取用 / 套用.
- [ ] **用途 / What:** Clear statement of what's being standardized; what "done right" looks like; why standardize; who applies it.
- [ ] **使用場景 / When:** Concrete use cases and non-use cases.
- [ ] **前置條件 / Prerequisites:** What context/preconditions make this standard applicable.
- [ ] **適用原則 / 各階段標準:** Table or list with each dimension showing:
  - [ ] Principle (why it matters).
  - [ ] Criteria (what must be true).
  - [ ] How to judge (a concrete, repeatable check — not vague language).
- [ ] **Demo / 範例:** A worked example applying the standard to a concrete case, with a clear verdict.
- [ ] **來源 / 出處** (if applicable): Original source, why adapted, what changed, license.
- [ ] **Final section:** Is **取用 / 套用**, NOT 安裝 (workflow is never installed — see §10). If you find yourself wanting an 安裝 section, reclassify as `skill` instead.
- [ ] **Naming & path:** Folder name = `name` field in kebab-case; file is `SKILL.md`.
- [ ] **Not actually a skill:** Re-check against §1's test question — does this produce a result when run, or does it govern how work should be done? If the former, this should be `type: skill`, not `workflow`.

---

## 13. Loom-Specific Notes

If Loom is drafting your workflow asset:

- Loom will **detect** that the work is a methodology/standard — guidance referenced while work happens — rather than something executed to produce a result. See §1's test question; Loom applies it before drafting.
- Loom will **read** §7 (適用原則 / 各階段標準) carefully — each dimension must have a concrete principle, criteria, and a repeatable way to judge it. This is the critical section.
- Loom will **generate a demo block** showing the standard applied to a worked example, with a clear verdict.
- Loom will **always** use 取用 / 套用 as the final section — there is no decision to make here (see §10).
- Loom will **not** invent new sections; structure must match spec §3.2.2.
- If Loom is unsure whether something is `workflow` or `skill`, it defaults to asking the test question in §1 rather than guessing from step-count.

---

## 14. Reference

- **Main Spec:** `/docs/03-spec.md` — §3.2 (section structure), §3.2.2 (type-specific sections for `workflow`), §6 (install mechanism, for contrast with `skill`).
- **Loom:** `/skills/loom/SKILL.md` — uses this guide + schema when drafting workflow assets.

> **Note on `skills/dbt-model-scaffold/SKILL.md`:** that asset predates this definition and is `type: workflow`, but under the current definition it reads as an executable scaffold checklist (a `skill`) rather than a methodology. It has been intentionally left as-is (known inconsistency, not a template to copy for new `workflow` assets) — use the demo in §8 above, not that file, as your pattern to follow.
