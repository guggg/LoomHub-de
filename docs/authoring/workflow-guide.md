# Workflow Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-14 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: workflow` assets, and Loom (skill-authoring assistant) when drafting multi-step processes. This guide is referenced by §3.2.2 of the main spec.

---

## 1. What Is a Workflow Asset?

**Definition:** A workflow asset (`type: workflow`) is a **multi-step, multi-agent reusable process** or procedure documented for teams to follow (and potentially execute). It sits between a single `prompt` (one-off template) and a `skill` (installed agent capability) — it orchestrates multiple steps and may involve cross-agent handoffs.

| Aspect                   | Workflow                                                      | Skill                      | Prompt                  |
| ------------------------ | ------------------------------------------------------------- | -------------------------- | ----------------------- |
| **What it is**     | Multi-step procedure (text-based steps or bundled executable) | Installed agent capability | Single template to copy |
| **How you use it** | Follow the steps; may copy flow or install bundled scripts    | Agent calls it by name     | Copy, fill, and use     |
| **Installation**   | Depends: pure steps → copy; bundled files → symlink or copy | Symlink to agent skill dir | None — text only       |
| **Final section**  | 依內容而定 (copy steps OR install bundled files)              | 安裝 / Install (symlink)   | 複製 / 取用 (copy text) |

**When to use `type: workflow`:**

- You have a **repeatable multi-step process** that teams follow (e.g., "how to onboard a new data source," "RAG knowledge-base build recipe," "incident response SOP").
- The process may involve **multiple people, agents, or tools** working in sequence.
- It produces **artifacts** (built models, indexed documents, deployed services) rather than just analysis.
- Team members will want to **reference the steps** and potentially **automate** them (symlink into agent, or copy as a runbook).

---

## 2. Required Structure

Every workflow asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this workflow solve? What is the end goal?
2. **使用場景 / When** — Concrete situations where a team would execute this; what it's *not* for.
3. **使用方式 / How** — Brief overview of how to initiate and execute the workflow.
4. **前置條件 / Prerequisites** — What must exist or be configured before starting.
5. **步驟總覽 / Step Overview** — Table or numbered list of each stage: what it does, inputs, outputs.
6. **Demo / 範例** — Walkthrough showing the workflow in action (or key stages).
7. *(Optional)* **來源 / 出處** — If adapted from external sources.
8. **依內容而定 / Final Section** — Either **安裝** (if workflow includes installable scripts/tools) or **取用 / 套用** (if it's pure steps to follow).

> ✅ §3.2 and §3.2.2 of the spec define core + type-specific sections. This guide elaborates the `workflow`-specific sections, especially **§5** (步驟總覽) and **§8** (the decision tree for final section), which are the load-bearing sections.

---

## 3. The Problem & Benefit (用途 / What)

Clearly state:

- **What end-to-end process does this describe?** (e.g., "building a RAG knowledge base from raw documents," "onboarding a new Postgres data source into the warehouse," "incident triage and mitigation").
- **What is the **end goal?** (e.g., "runnable, tested dbt models; production-ready marts").
- **Why is standardizing this workflow valuable?** (e.g., "ensures consistent naming, quality, documentation across data sources," "reduces time to onboard," "lowers defect rate").
- **Who does this?** (data engineer, ML engineer, ops engineer, etc.).

**Example:**

```markdown
## 用途 / What

This workflow standardizes how the team ingests a new data source and builds it into our warehouse. It takes raw SQL tables (or APIs) and produces dbt staging → intermediate → mart layers, complete with dbt tests and documentation.

By following this workflow, every source is:
- Named consistently (stg_source__table, int_*, fct_*).
- Tested (unique, not_null, relationships checks).
- Documented (column descriptions, lineage).
- Runnable as a single `dbt build` command.

This reduces onboarding time from 1–2 days to 2–3 hours and ensures every model meets quality bar.
```

---

## 4. Use Cases & Constraints (使用場景 / When)

List concrete scenarios:

**When to use:**

- Ingesting a new data source that needs full dbt treatment (raw → staging → marts).
- Onboarding a new analyst who needs to build their first model layer.
- Standardizing existing ad-hoc models into the consistent three-layer structure.

**When NOT to use:**

- Just fixing a typo in an existing model (direct edit, no workflow needed).
- One-off analysis that will never be reused.
- Models already conforming to the structure; just need minor edits.

---

## 5. How to Execute (使用方式 / How)

Keep this brief — it's an entry point, not a full guide. Just say:

- **Where to start:** "Tell your agent: 'Run dbt-model-scaffold for raw.orders…'" or "Follow Step 1 in the steps below."
- **Who orchestrates:** "Agent drives the workflow" OR "Human follows the manual steps."
- **Output:** "Expect these artifacts at the end."

**Example:**

```markdown
## 使用方式 / How

**Automated (if agent has workflow installed):**
Tell your agent: "Execute dbt-model-scaffold for the new raw.customers table. Primary key: customer_id. Build fct_customers in the finance mart."

Agent will step through 1–6 below, creating files and running tests.

**Manual (following the steps):**
Follow the 步驟總覽 below in order. Each stage produces files; move to the next stage once the previous one succeeds.

Expected output: Three dbt model files + one schema.yml + green dbt build output.
```

---

## 6. Prerequisites (前置條件)

List **what must exist before starting:**

- Software/tools that must be installed (dbt, git, etc.).
- Configuration (database connections, profiles, credentials).
- Existing data or resources (source tables, S3 buckets, API access).
- Permissions (who can create tables, push code, etc.).

**Example:**

```markdown
## 前置條件 / Prerequisites

Before starting this workflow:

- ✅ **dbt installed** — `dbt --version` works; profile configured for warehouse access.
- ✅ **Warehouse access** — Can query raw schema; can create staging/marts.
- ✅ **Git setup** — Can clone/pull/push to the dbt repo.
- ✅ **Source table exists** — Raw data table (e.g., raw.orders) is queryable and has a primary key.
- ✅ **Know the primary key** — Identify which column(s) uniquely identify each row (e.g., order_id).
- ✅ **Basic SQL & dbt** — Familiarity with SELECT, dbt macros, YAML structure helpful (not required if agent-guided).
```

---

## 7. Step-by-Step Breakdown (步驟總覽) — THE CRITICAL SECTION

This is the **heart of the workflow**. Each step must be clear, testable, and producible.

### 7.1 The Rule: Concrete Inputs → Outputs

For each stage, state:

- **What it does** — One-sentence action.
- **Input** — What exists before this step.
- **Output** — What is produced (file, query result, deployment, etc.).
- **How to verify** — How do you know it succeeded?

### 7.2 BAD Example (Anti-pattern)

| Step | Do This       |
| ---- | ------------- |
| 1    | Set up source |
| 2    | Build staging |
| 3    | Build marts   |
| 4    | Test          |

**Why this is bad:**

- No input/output details; reader doesn't know what "set up source" means concretely.
- No verification; how do you know if staging is correct?
- Missing intermediate step (no mention of intermediate models or how they differ from staging).
- Too terse; could mean many different things.

### 7.3 GOOD Example (Pattern to follow)

| Step | What                               | Input                                                        | Output                                                                                                                                                | Verify                                                                                               |
| ---- | ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1    | Register source in`_sources.yml` | Source table name & primary key (e.g., raw.orders, order_id) | `models/staging/orders/_orders__sources.yml` with source + columns                                                                                  | `dbt list --select source:orders` shows the source                                                 |
| 2    | Build staging model                | Source registered; understand column mappings                | `models/staging/orders/stg_orders__orders.sql` (SELECT * + EXCEPT secrets; rename columns; type-cast)                                               | `dbt build --select stg_orders__orders` passes dbt compile & tests                                 |
| 3    | Build intermediate (optional)      | Staging model; identify business logic needed                | `models/intermediate/int_orders_enriched.sql` (add calculated fields, join with other tables)                                                       | `dbt build --select int_orders_enriched` passes; row counts match expectations                     |
| 4    | Build mart                         | Intermediate or staging ready; know end-user query patterns  | `models/marts/finance/fct_orders.sql` (SELECT final columns; join dims if needed)                                                                   | `dbt build --select fct_orders` passes; user can query `SELECT * FROM marts.fct_orders LIMIT 10` |
| 5    | Add tests to schema.yml            | All models built; know PK & FK relationships                 | `models/marts/finance/fct_orders.yml` with `unique: order_id`, `not_null: order_id`, `relationships: customer_id → dim_customer.customer_id` | `dbt test --select fct_orders` passes all tests                                                    |
| 6    | Run end-to-end build               | All tests passing                                            | `dbt build --select +fct_orders` runs 4 models + 8 tests; zero failures                                                                             | Exit code 0; PASS count matches expected count                                                       |

**Why this is good:**

- Each step is **concrete**: a specific file is produced, with example path.
- Inputs are **specific**: what data / files must exist before this step.
- Outputs are **verifiable**: how to confirm success (file exists, test passes, query works).
- Steps are **ordered logically**: source → staging → intermediate → mart → tests → verify.
- Reader knows **exactly what to do** at each point.

### 7.4 Table Template

```markdown
| Step | What | Input | Output | Verify |
|---|---|---|---|---|
| 1 | [action] | [what exists before] | [file/artifact produced] | [command/check to confirm] |
| 2 | [action] | [depends on step 1 output] | [next artifact] | [verification] |
| ... | ... | ... | ... | ... |
```

---

## 8. Demo / 範例 — Workflow in Action

Show the workflow executing from start to finish (or key milestones).

### 8.1 GOOD Demo (Pattern to follow)

**Option A: Conversation-style (agent-driven)**

```demo-conversation
user: Run dbt-model-scaffold for the new raw.orders table. Primary key: order_id. Final mart: fct_orders.

agent: OK. Let me build this step-by-step:

**Step 1:** Register raw.orders source
Creating models/staging/orders/_orders__sources.yml with columns: order_id, customer_id, amount, created_at
[Verify: dbt list --select source:orders] ✓

**Step 2:** Build staging model
Creating models/staging/orders/stg_orders__orders.sql
- SELECT order_id, customer_id, amount, created_at FROM raw.orders
- WHERE deleted_at IS NULL
[Verify: dbt build --select stg_orders__orders] ✓

**Step 3:** No intermediate needed (orders is straightforward). Skipping.

**Step 4:** Build mart
Creating models/marts/finance/fct_orders.sql
- SELECT from stg_orders__orders
- JOIN dim_customer on customer_id
[Verify: dbt build --select fct_orders] ✓

**Step 5:** Add tests
Adding to models/marts/finance/fct_orders.yml:
- unique: order_id
- not_null: order_id
- relationships: customer_id → dim_customer.customer_id
[Verify: dbt test --select fct_orders] ✓ 3 tests pass

**Step 6:** End-to-end build
Running `dbt build --select +fct_orders`...

result: ✓ dbt build successful
3 models built, 5 tests passed, 0 errors
New tables created:
- models/staging/orders/stg_orders__orders.sql
- models/marts/finance/fct_orders.sql
Ready for production.
```

**Option B: Terminal-style (step-by-step)**

```demo-terminal
$ # Step 1: Register source
$ cat > models/staging/orders/_orders__sources.yml << 'EOF'
version: 2
sources:
  - name: orders
    database: raw
    schema: public
    tables:
      - name: orders
        columns:
          - name: order_id
            tests: [unique, not_null]
          - name: customer_id
          - name: amount
          - name: created_at
EOF

$ dbt list --select source:orders
raw.orders ✓

$ # Step 2: Build staging
$ cat > models/staging/orders/stg_orders__orders.sql << 'EOF'
SELECT
  order_id,
  customer_id,
  amount,
  created_at
FROM {{ source('orders', 'orders') }}
WHERE deleted_at IS NULL
EOF

$ dbt build --select stg_orders__orders
04:12:01  1 of 1 OK created sql view model staging.stg_orders__orders ✓

$ # Step 4: Build mart (skipping intermediate)
$ cat > models/marts/finance/fct_orders.sql << 'EOF'
SELECT
  o.order_id,
  o.customer_id,
  d.customer_name,
  o.amount,
  o.created_at
FROM {{ ref('stg_orders__orders') }} o
LEFT JOIN {{ ref('dim_customer') }} d ON o.customer_id = d.customer_id
EOF

$ dbt build --select fct_orders
04:12:03  1 of 1 OK created sql table model marts.fct_orders ✓

$ # Step 6: Full build
$ dbt build --select +fct_orders
04:12:01  1 of 3 OK created sql view model staging.stg_orders__orders
04:12:03  2 of 3 OK created sql table model marts.fct_orders
04:12:05  3 of 3 PASS unique_fct_orders_order_id ✓
Done. PASS=5 ERROR=0
```

---

## 9. Source / Attribution (來源 / 出處) — If Applicable

If this workflow is adapted from external sources:

```markdown
## 來源 / 出處

- **Original source:** Inspired by dbt Labs' "best practices for multi-layer modeling" guide (https://docs.getdbt.com/best-practices/how-we-structure/1-staging).
- **Why we adapted it:** Team uses dbt for warehouse work; this workflow standardizes our approach and includes team-specific conventions.
- **What we changed:**
  1. Added team-specific naming (int_*, fct_* in marts/domain structure).
  2. Included schema.yml test definitions and verification steps.
  3. Documented prerequisites (dbt version, profile setup).
- **License:** Public domain (dbt best practices docs are public; our adaptation is team-internal).
```

---

## 10. Installation vs. Copy (最後一節 / Final Section) — THE DECISION TREE

The final section is either **安裝** or **取用 / 套用** depending on what the workflow contains:

### 10.1 Decision Logic

**Does this workflow include runnable/installable files?** (e.g., dbt macro templates, Python scripts, Terraform configs)

- **YES** → Section title is **安裝 / Install**. Provide symlink/copy commands (like `skill` or `mcp-server` do).
- **NO** (workflow is pure steps / narrative) → Section title is **取用 / 套用**. Explain how to copy and adapt the steps.

### 10.2 Example A: Pure Steps (安裝型？No) → 取用 / 套用

```markdown
## 取用 / 套用

This workflow is a **set of steps to follow manually** — there are no pre-built scripts to install. Instead:

1. Read the 步驟總覽 above.
2. For each step, adapt the concrete examples to your project:
   - Replace `raw.orders` with your source table name.
   - Replace `fct_orders` with your desired mart name.
   - Adjust column names, joins, and business logic for your domain.
3. Create files in your dbt project (staging/, intermediate/, marts/) following the same structure.
4. Run `dbt build --select +<your_mart>` to verify.

The workflow is reusable; apply it as many times as you add new sources. Document lessons learned and feed back into this workflow if you find improvements.
```

### 10.3 Example B: Bundled Scripts (安裝型？Yes) → 安裝

```markdown
## 安裝

This workflow includes helper scripts in `scripts/` that can be installed into agent or run locally.

**Automated (agent-driven):**
\```bash
node scripts/install-skill.mjs dbt-model-scaffold
✓ Installed to ~/.agents/skills/dbt-model-scaffold
✓ Installed to ~/.claude/skills/dbt-model-scaffold
\```

Agent can now execute `dbt-model-scaffold` directly.

**Manual symlink:**
\```bash
# Codex + Gemini
ln -s "$PWD/skills/dbt-model-scaffold" ~/.agents/skills/dbt-model-scaffold

# Claude Code
ln -s "$PWD/skills/dbt-model-scaffold" ~/.claude/skills/dbt-model-scaffold
\```

After installation, test:
\```bash
agent> Run dbt-model-scaffold for raw.customers
\```
```

---

## 11. Frontmatter Checklist

Every workflow asset must have these **8 required fields** (§3.1 of spec):

| 欄位                       | 值 / 說明                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | kebab-case, ≤ 64 chars, equals folder name (e.g.,`dbt-model-scaffold`)                                                               |
| `description`            | What + when; rich keywords; ≤ 1024 chars                                                                                               |
| `type`                   | **`workflow`** (not `skill`, not `prompt`)                                                                                  |
| `category`               | One of:`requirements` / `design` / `development` / `testing` / `ops` / `docs` / `research` / `general` (see spec §4.2) |
| `tags`                   | Array of lowercase kebab-case labels (e.g.,`[dbt, sql, modeling, elt, warehouse]`)                                                    |
| `version`                | semver starting at`0.1.0`                                                                                                             |
| `owner`                  | Maintainer handle (e.g.,`@Ty`)                                                                                                        |
| `updated`                | Today's date in`YYYY-MM-DD` format                                                                                                    |
| `source` *(optional)*  | URL if adapted from external source                                                                                                     |
| `license` *(optional)* | License string if adapted from external source                                                                                          |

---

## 12. Contributor Checklist

Before submitting a workflow asset, verify:

- [ ] **Frontmatter:** All 8 required fields present; `type: workflow`; valid category; semver format.
- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / 前置條件 / 步驟總覽 / Demo / (optional 來源 / 出處) / 最後一節.
- [ ] **用途 / What:** Clear statement of end-to-end process; end goal; why standardize; who does this.
- [ ] **使用場景 / When:** Concrete use cases and non-use cases.
- [ ] **前置條件 / Prerequisites:** What must exist/be installed/be configured before starting (tools, access, source data, permissions).
- [ ] **步驟總覽 / Step Overview:** Table or list with each step showing:
  - [ ] What (concrete action).
  - [ ] Input (what exists before).
  - [ ] Output (what file/artifact is produced).
  - [ ] Verify (how to confirm success).
  - [ ] Steps are in logical order; dependencies are clear.
- [ ] **Demo / 範例:** End-to-end walkthrough (conversation or terminal); shows key stages; clear outputs.
- [ ] **來源 / 出處** (if applicable): Original source, why adapted, what changed, license.
- [ ] **Final section:**
  - [ ] If workflow has installable files → **安裝 / Install** (symlink/copy commands, agent discovery, test).
  - [ ] If workflow is pure steps → **取用 / 套用** (copy steps, adapt to context, reuse as template).
- [ ] **Naming & path:** Folder name = `name` field in kebab-case; file is `SKILL.md`.

---

## 13. Loom-Specific Notes

If Loom is drafting your workflow asset:

- Loom will **detect** that the work is a multi-step, reusable process (sequence of stages, repeated activities, cross-agent handoffs).
- Loom will **read** §7 (步驟總覽) carefully — **each step must have concrete input/output** with verification. This is the critical section.
- Loom will **generate demo block(s)** showing the workflow from start to finish or key milestones.
- Loom will **decide the final section** (安裝 vs. 取用 / 套用) based on whether the workflow includes scripts/files to install.
- Loom will **not** invent new sections; structure must match spec §3.2.2.

---

## 14. Reference

- **Main Spec:** `/docs/03-spec.md` — §3.2 (section structure), §3.2.2 (type-specific sections for `workflow`), §6 (install mechanism).
- **Existing Workflow Sample:** `/skills/dbt-model-scaffold/SKILL.md` — exemplifies the full workflow structure with step-by-step breakdown and demo.
- **Loom:** `/skills/loom/SKILL.md` — uses this guide + schema when drafting workflow assets.
