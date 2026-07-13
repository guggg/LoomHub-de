# AGENTS.md — Commit-time self-check for skillsHub-de

> This file is the **pre-commit checklist** a contributor's AI agent runs before sharing or
> updating a skill. It is written for **Claude Code, Codex, and Gemini** agents alike
> (cross-vendor `AGENTS.md` convention). Source of the design: Spec §5 and ADR-0006.
>
> **Trust-based, no-PR:** once the hard self-check passes, the contributor commits and pushes
> directly to the main line. There is no CI gate and no required reviewer.
>
> **Machine-readable source of truth:** `schema/skill.schema.json` (JSON Schema draft 2020-12).
> The whitelists are restated inline below so you can run the check from this file alone, but
> if this file and the schema ever disagree, **the schema wins**.

---

## Taxonomy whitelists (restated from Spec §4)

### `type` — what the asset is / how it installs (§4.1)

| value | meaning |
|---|---|
| `skill` | agentskills.io standard SKILL.md capability |
| `prompt` | reusable prompt template |
| `mcp-server` | mountable MCP tool server (config + docs) |
| `workflow` | multi-step / multi-agent reusable process |
| `kb-template` | knowledge-base (RAG) build recipe / template |

### `category` — general work-activity stage (§4.2)

Domain words (aws / azure / etl / rag …) go in **`tags`**, never in `category`.

| value | meaning |
|---|---|
| `requirements` | requirements elicitation, interviews, spec shaping |
| `design` | system design, architecture, option evaluation |
| `development` | implementation, coding, refactoring |
| `testing` | testing, verification, code review |
| `ops` | operations, deployment, monitoring, troubleshooting |
| `docs` | documentation, notes, knowledge organization |
| `research` | research, exploration, data analysis |
| `general` | cross-activity / shared |

**Classification rule (§4.2):** classify a skill by the activity stage of its **primary
deliverable**. E.g. "build a RAG knowledge base" → the deliverable is a working system →
`development` (`tags: [rag, ai, knowledge-base]`); "ETL go-live SOP" → deployment/ops →
`ops` (`tags: [etl, azure]`). If it spans several stages, take the stage of the **final
deliverable**.

---

## §5.1 — Spec-compliance self-check (HARD gate — any failure must be fixed)

Validate the new/modified skill against `schema/skill.schema.json`, item by item. **If any of
these fail, do NOT commit; produce a problem list, the contributor fixes it, then re-run.**

1. **All 8 frontmatter fields present:** `name`, `description`, `type`, `category`, `tags`,
   `version`, `owner`, `updated`.
2. **`name` == folder name**, and `name` is kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 64 chars).
3. **`type` ∈ §4.1 whitelist** AND **`category` ∈ §4.2 whitelist** (see tables above).
4. **`version` is valid semver** `x.y.z` (`^\d+\.\d+\.\d+$`).
5. **`updated` is a valid date** `YYYY-MM-DD` (`^\d{4}-\d{2}-\d{2}$`).
6. **Body contains the three human-facing sections:** `## 用途 / What`, `## 使用場景 / When`,
   `## 使用方式 / How` must all exist. (`## Demo / 範例` and `## 安裝 / Install` are recommended
   but not hard-blocked.)
7. **Version / date sync (self-check focus):** if this skill's content changed relative to
   `git HEAD`, `version` **must** be bumped per semver rules (§3.3 — patch = fixes/no behavior
   change; minor = backward-compatible feature; major = breaking) **and** `updated` **must** be
   set to today's date. There is no CI to enforce this; skipping the bump breaks the hub's
   update detection (FR-6.2).

> How to check item 7: `git diff HEAD -- skills/<name>/` — if there is any content change and
> the `version`/`updated` lines are unchanged, item 7 fails.

---

## §5.2 — Overlap / dedup check (CLASSIFICATION-FIRST — advisory)

Do **not** scan every skill (safe but slow and token-heavy). Use the two-step
classification-first method:

1. **Classify first.** Determine the new skill's `category` using the §4.2 classification rule
   above. A stable, shared classification standard makes different agents categorize
   consistently and raises detection accuracy.
2. **Scan only that category.** Read **only the `description` of existing skills in that same
   `category`** and compare for overlap. (Concretely: read `schema`-valid frontmatter of
   `skills/*/SKILL.md`, filter to the matching `category`, compare descriptions.)

Output:

- Suspected overlap? (yes / no)
- If yes: the most similar skill in the same category + the points of similarity.

**Handling principle — coexistence is usually allowed.** When similarity is detected, **require
the contributor to write an explicit "與 X 的區別 / 適用場景 / 應用差異" (distinction vs X /
when-to-use / use-case difference)** into the new skill's body. Once that distinction is written,
the two may coexist. If the contributor judges it is genuinely the same thing, update the
existing skill (bump its version) instead of adding a new one.

---

## §5.3 — Output + submit (trust-based, NO-PR)

1. Produce a **human-readable conclusion** for the contributor to self-review:
   - §5.1 result: pass, or the itemized problem list.
   - §5.2 overlap verdict + the distinction text that still needs to be added (if any).
2. Once **§5.1 fully passes** and any required §5.2 distinction is written, the contributor
   **commits and pushes directly to the main line** — no PR, no reviewer, no gate (trust-based,
   ADR-0006). Startup permissions are fully open.
3. After push, the catalog index must be rebuilt to show the skill (deploy pipeline or local
   rebuild — this is a deploy step, not a gate).
