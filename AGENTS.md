# AGENTS.md — Commit-time self-check for LoomHub-de

> **邊界宣告（給 AI agent）：** `docs/` `schema/` `scripts/` `AGENTS.md` `README.md` `.github/`
> `install.sh` 這些是 hub 規則本身，歸維護者 **@Ty** 所有（見 `.github/CODEOWNERS`）。**AI agent
> 不得擅自修改這些路徑** —— 若任務看起來需要改到它們，先停下來、請使用者去聯繫 @Ty，不要自己動手。
> 你（agent）能自主做的只有新增/更新 `skills/<name>/` 底下的資產。這是軟治理（advisory，non-
> blocking，見 `.github/workflows/rule-guard.yml`），不是硬鎖，但仍請嚴格遵守。

> This file is the **pre-commit checklist** a contributor's AI agent runs before sharing or
> updating a skill. It is written for **Claude Code, Codex, and Gemini** agents alike
> (cross-vendor `AGENTS.md` convention). Source of the design: Spec §5 and ADR-0006.
>
> **Trust-based, no-PR:** once the hard self-check passes, the contributor commits and pushes
> directly to the main line. There is no CI gate and no required reviewer.
>
> **Machine-readable source of truth:** `schema/skill.schema.json` (JSON Schema draft 2020-12).
> `scripts/taxonomy.mjs` reads this file at load time and derives `TYPE_WHITELIST` /
> `CATEGORY_WHITELIST` / `REQUIRED_FIELDS` for `build-index.mjs` and `install-skill.mjs` — there
> is no hand-maintained copy in either script. The whitelists are restated inline below so you can
> run the check from this file alone, but if this file and the schema ever disagree, **the schema
> wins** (and the scripts will already reflect it).

---

## Taxonomy whitelists (restated from Spec §4)

### `type` — what the asset is / how it installs (§4.1)

| value | meaning |
|---|---|
| `skill` | agentskills.io standard SKILL.md capability |
| `prompt` | reusable prompt template |
| `mcp-server` | mountable MCP tool server (config + docs) |
| `workflow` | methodology / standard describing HOW work should be done — referenced/followed, not executed to produce a result |
| `tool` | fully external, standalone tool/CLI/app/service — not agent-installable content, not copyable text; referenced by link only |

(RAG / knowledge-base assets use `skill` or `workflow` with `tags: [rag, kb, …]` — there is no separate `kb-template` type.)

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
> the `version`/`updated` lines are unchanged, item 7 fails. `node scripts/check-version-bump.mjs`
> automates this check across all changed skills in one run (advisory warning only, same
> non-blocking spirit as `check-updates.mjs` — it never fails the commit, it just tells you what
> to look at).

> **憑證檢查（advisory）：** 這是**公開 repo**——憑證一旦 push 就等於已洩漏（history / fork /
> 掃描 bot 都拿得到），刪 commit 沒有用,唯一有效的補救是**去把那把金鑰 rotate 掉**。所以要在
> commit 前看：`node scripts/check-secrets.mjs`（掃 staged diff 的憑證特徵；裝了 `gitleaks`
> 會一併跑,沒裝也能用）。`npm run hooks:install` 可把它接成 pre-commit hook,和
> `check-version-bump.mjs` 一起自動跑。**兩者都只警告、永不阻擋 commit**（ADR-0006 trust-based）。
> 它只抓**有固定形狀**的東西(`AKIA…` / `ghp_…` / `AccountKey=…` / PEM);公司專有名詞、內部事實
> 寫成一般敘述時機器抓不到,那part靠人看——別把只有公司內部才看得懂的名詞、路徑、系統代號寫進資產。

**Optional fields for externally-collected assets:** if this asset was collected/adapted from
an external source (not team-original), add `source` (origin URL) and `license` (the original's
license, e.g. MIT), and a `## 來源 / 出處` body section explaining what was adapted. Confirm the
license permits internal team use before collecting. These fields are optional and only apply to
external assets.

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
2. **Before committing, run `git pull` on the local clone.** This is trust-based / no-PR, not
   no-sync — with multiple contributors pushing directly to main, a stale local clone risks a
   rejected non-fast-forward push, or (worse) missing a sibling skill that would have changed
   the §5.2 overlap verdict. Pull first, re-run §5.1/§5.2 if anything relevant changed, then
   proceed. `node scripts/check-updates.mjs` gives a more precise view before pulling — it
   diffs each skill's version against `origin/main` and flags any local skill whose content has
   diverged but not yet been pushed back.
3. Once **§5.1 fully passes** and any required §5.2 distinction is written, the contributor
   **commits and pushes directly to the main line** — no PR, no reviewer, no gate (trust-based,
   ADR-0006). This "fully open" trust applies ONLY to this contribution/push step — it does NOT
   mean skip confirmation steps elsewhere (e.g. install/onboarding flows still require explicit
   user confirmation before touching global config files; see README's AI-facing install section).
4. After push, the catalog index must be rebuilt to show the skill (deploy pipeline or local
   rebuild — this is a deploy step, not a gate).
