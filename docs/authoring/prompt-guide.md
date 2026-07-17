# Prompt Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-17 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: prompt` assets, and Loom (skill-authoring assistant) when drafting prompt templates.
>
> **Shared rules live in [`docs/authoring/README.md`](./README.md) §3** (frontmatter 8 fields, common contributor checklist items, how Loom uses these guides, reference links) — this file only covers what's **specific to `type: prompt`**: the required section structure, variables table, and — the single most important part of this guide — §5's rule on example-output fidelity.

---

## 1. What Is a Prompt Asset?

**Definition:** A prompt asset (`type: prompt`) is a **reusable text template** you copy and fill with variables, then pass to an agent. It is **not installed** — you copy it directly into your agent's input.

**When to use `type: prompt`:**
- You have a reusable thinking framework, checklist, or reasoning structure that multiple people will copy and customize.
- Output is primarily text-based structured analysis (e.g., "triage decision," "design critique," "deployment checklist").
- No need for agent-side installation or programmatic execution.

> For how `prompt` differs from `skill` / `mcp-server` / `workflow`, see [`docs/authoring/README.md`](./README.md) §1.

---

## 2. Required Structure

Every prompt asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this prompt solve? Why standardize it?
2. **使用場景 / When** — Concrete situations where you'd reach for it; what it's *not* for.
3. **使用方式 / How** — The actual prompt template in a fenced code block. Include agent role, constraints, required output structure.
4. **變數 / 參數** — Table of every `{{variable}}` with explanation + example.
5. **範例輸出** — *Real* example showing filled variables and actual agent output (details below — **this is the critical rule**).
6. **模型建議** — *(Optional)* Recommended model tier, temperature, token budget, or hints (choose a capable model appropriate to the task; avoid pinning a specific outdated version — see §6).
7. **複製 / 取用** — *Last section*. Explain how to copy and use (no symlink; detail page provides one-click copy).

> ✅ Spec §3.2 / §3.2.2 define core + type-specific sections. This guide elaborates the `prompt`-specific ones, especially **§5 (範例輸出)**, which is where most contributors fail.

---

## 3. The Prompt Template (使用方式 / How)

### 3.1 Template Structure

Your template lives in a **fenced code block** under "使用方式 / How":

```markdown
## 使用方式 / How

[Brief explanation of how to use the template, any contextual notes]

\```
[Prompt template text here]
\```
```

### 3.2 Template Best Practices

- **Explicit role & constraints:** Start with `You are a [role]...` and state what the agent must / must not do (e.g., "only use facts provided; never invent log entries").
- **Clear input section:** List every input variable with labels that mirror the structure in 變數 / 參數. Use multi-line layout if the template is complex.
- **Explicit output structure:** Say exactly what the agent must output, in what order, and what format (e.g., "output 4 sections: Root Cause Hypotheses / Immediate Steps / Suggested Action / Escalation Decision").
- **Use `{{variable}}`:** Double-brace placeholders for any field that varies per use (dag_id, error log, recent changes, etc.).

**Example (good structure):**
```
You are a senior Data Engineer triaging a failed ETL run. 
Only reason from facts provided; never invent log details.

DAG: {{dag_id}}
Failed task: {{task_id}}
Execution time: {{execution_date}}
Retry count: {{retry_count}}
Error log:
{{error_log}}
Upstream context: {{upstream_context}}
Recent changes: {{recent_changes}}

Output exactly 4 sections:
1. Root Cause Hypotheses (ordered by likelihood)
2. Immediate Check Steps (actionable CLI commands)
3. Suggested Action (rerun / fix data / config change / pause DAG)
4. Escalation? (yes/no + who + reason)
```

---

## 4. Variables / Parameters (變數 / 參數)

Create a **table** with all placeholders. Columns: `變數` | `說明` | `範例`

**Critical rule:**
- **Every placeholder in the template must appear in this table.**
- **Every row in this table must be used in the template** (no orphan variables).

This makes it clear what a user needs to fill in, and catches variable name typos.

| 變數 | 說明 | 範例 |
|---|---|---|
| `{{dag_id}}` | Airflow DAG name | `daily_sales_etl` |
| `{{task_id}}` | Failed task ID | `load_to_warehouse` |
| `{{execution_date}}` | Run execution time | `2026-07-13T02:00:00Z` |
| `{{retry_count}}` | Number of retries attempted | `3` |
| `{{error_log}}` | Error message snippet from logs | `OperationalError: FATAL: too many connections` |
| `{{upstream_context}}` | Upstream dependencies & status | `s3://raw/sales/ export completed at 09:00` |
| `{{recent_changes}}` | Recent deploys / config changes | `Batch size increased from 500 to 5000 yesterday` |

---

## 5. Example Output (範例輸出) — THE KEY RULE

This is where contributors most often fail: the example doesn't actually match the template. **Here is the rule:**

### 5.1 The Rule: Fidelity

The example must be a **faithful, end-to-end run** of YOUR prompt template. Concretely:

1. **Example INPUT must fill the template exactly as written:**
   - If the template is multi-line with clear variable labels (`DAG: {{dag_id}}` on its own line, etc.), the example input must **preserve that multi-line structure**.
   - Fill each `{{variable}}` with a realistic value from the 範例 column of the variables table.
   - **Do NOT squash multi-line variables onto one line** — that breaks traceability.

2. **Example OUTPUT must be complete and faithful:**
   - Include **every section the prompt demands** (e.g., if the template says "output 4 sections," show all 4, not just 1 or 2).
   - Use the **exact same structure** the prompt specifies (same headers, same order).
   - Show a realistic, concrete output — not a skeleton, not a summary.

### 5.2 BAD Example (Anti-pattern)

```demo-conversation
user: 你是一位資深 Data Engineer，正在協助分診一個失敗的 ETL run。只根據提供的事實推理，不要杜撰 log。DAG: daily_sales_etl / task: load_to_warehouse / 重試: 3 / log: OperationalError: FATAL: too many clients / 上游: s3://… 09:00 完成 / 近期: batch 500→5000
agent: 【根因】連線池耗盡。【檢查】驗證 pg_stat_activity。【處置】調回 batch size。【升級】yes，給 DBA。
```

**Why this is bad:**
- The input is squashed into one line → no reader can map each value back to a template variable.
- The output is condensed; missing full "根因假設 with 判斷依據."
- The output doesn't visibly mirror the template's "exactly 4 sections" with clear headers.

### 5.3 GOOD Example (Pattern to follow)

```demo-conversation
user: 你是一位資深 Data Engineer，正在協助 on-call 分診一個失敗的 ETL / Airflow run。只根據我提供的事實推理，明確區分「已知事實」與「推測」，不要杜撰 log。

DAG: daily_sales_etl
失敗的 task: load_to_warehouse
執行時間 / data interval: 2026-07-13T02:00:00Z
重試狀況: 3 次，皆失敗
錯誤訊息 / log 摘要:
OperationalError: FATAL: sorry, too many clients already
上游來源與相依: s3://raw/sales/ 上游 export 09:00 才完成
近期變更（部署 / schema / 設定）: 昨天調高了 batch size 從 500 到 5000

請輸出：
1. 最可能根因（依可能性排序，各附判斷依據）
2. 立即檢查步驟（可直接照做的指令 / 查詢）
3. 建議處置（重跑 / 修資料 / 改設定 / 暫停 DAG）
4. 是否需升級？升級給誰、理由

agent: **1. 最可能根因**
   - （高信度）Postgres 連線池耗盡：log 明示「too many clients」，且你把 batch size 從 500 調到 5000，並行 writer 佔滿 max_connections。
   - （中信度）上游延遲：s3://raw/sales 上游 export 09:00 才完成，若此 run 排在之前會讀到空資料——但 log 指向連線而非空資料。
   - （低信度）網路逾時：可能，但 log 未見網路錯誤跡象。

**2. 立即檢查步驟**
   - SSH 連入 warehouse → `SELECT count(*) FROM pg_stat_activity;` 對照 `SHOW max_connections;`
   - 確認 s3://raw/sales export 已完成再重跑：`aws s3 ls s3://raw/sales/ --recursive --human-readable | tail -5`
   - 取得完整 dag run log：`airflow logs -f daily_sales_etl load_to_warehouse 2026-07-13T02:00:00Z | tail -50`

**3. 建議處置**
   - 先把 batch size 回退到 500 後重跑該 task。
   - 連線池若仍滿，暫時調高 pool 或分批；升級 DBA 檢查 max_connections。

**4. 是否需升級？**
   - **是。** 升級給：On-call DBA。
   - 理由：若回退後仍撞連線上限 → pool 可能洩漏或上限過低；DBA 需審計 `max_connections` 並檢查 idle/zombie 連線。
```

**Why this is good:**
- INPUT preserves the template's multi-line structure → reader maps each value clearly.
- OUTPUT includes all 4 sections with full detail, matching the template's demand.
- OUTPUT visibly follows the declared structure (headers, sub-bullets, rationales).

### 5.4 Rendering: Demo Block Choice

Use **one of the following** for the example:

- **`demo-conversation` (conversational I/O):** If the example naturally flows as user-query → agent-response. Use when the prompt is interactive or when input/output dialogue reads naturally.
  - User line: Fill in the prompt template (multi-line, with all variables filled).
  - Agent line: The agent's response (full, complete).

- **`demo-terminal` (non-conversational, step-by-step):** If the prompt is procedural, or if the I/O doesn't feel conversational (e.g., showing CLI input + output, or batch processing steps). Less common for prompts, but valid if the workflow is terminal-like.

- **Plain code block + narrative:** For very complex examples, a code block showing input, then a separate code block showing output, separated by prose explanation — **but this is heavier; prefer demo blocks above**.

**Recommendation:** Most prompts work well with `demo-conversation` because they're queries to an agent. Use it unless the example is genuinely non-conversational.

---

## 6. Optional: Model Suggestions (模型建議)

If the prompt has specific model or tuning requirements, add an optional **模型建議** section:

```markdown
## 模型建議

- **建議模型：** 選擇當前較強的模型；複雜推理（多假設對比、邏輯鏈）避免使用最小型號。
- **Temperature:** 0.5–0.7（夠低確保確定性，夠高允許細緻推理）。
- **Max tokens:** 根據期望的輸出結構而定；複雜多段結構通常需 2000–4000。
- **備註：** 明確說明對模型的要求（例如「需要逐步推理」或「需要結構化輸出」），讓使用者選擇適當版本。
```

---

## 7. Final Section: 複製 / 取用 (Copy / Use)

**Last section.** This explains how someone uses the prompt (no installation).

```markdown
## 複製 / 取用

這是一份 **prompt 範本**，不需安裝進 agent——直接**複製「使用方式」裡的完整 prompt**、填好變數後丟給任何 agent 即可。

詳情頁提供一鍵複製按鈕（複製「使用方式」程式碼區塊的內容）。

**使用流程：**
1. 複製本頁「使用方式」的 prompt 範本。
2. 填好所有變數（見「變數 / 參數」表）。
3. 貼給你的 agent（Claude、Codex、Gemini 皆可）。
4. Agent 會依照 prompt 的指示產出結構化結果。

若你想讓某個 agent **自動帶著**這個 prompt 框架（不用每次手動填），可把它整理成 `type: skill` 版本，那才需安裝。
```

**Key points:**
- Explain that it's just text, no installation needed.
- Note that the detail page will provide a one-click copy button.
- (Optional) Suggest when someone might want to promote it to a `skill` if they want agent-side automation.

---

## 8. Frontmatter Example

**Example frontmatter** (field definitions are shared — see [`README.md`](./README.md) §3.1):
```yaml
---
name: my-prompt
description: Reusable prompt template for quick ETL/Airflow incident triage—on-call inputs DAG, task, error log, and environment context; prompt outputs structured root-cause hypotheses, immediate check steps, action recommendations, and escalation decision.
type: prompt
category: ops
tags: [etl, airflow, oncall, triage, incident]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-13
---
```

---

## 9. Contributor Checklist (prompt-specific)

In addition to the shared checklist ([`README.md`](./README.md) §3.2), verify:

- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / 變數 / 參數 / 範例輸出 / (optional 模型建議) / 複製 / 取用.
- [ ] **Template (使用方式):** Code block present; includes agent role, constraints, explicit output structure, all variables as `{{name}}`.
- [ ] **Variables (變數 / 參數):** Table with all placeholders; no orphans; each row has explanation + example.
- [ ] **Example Output (the critical one):**
  - [ ] INPUT preserves template structure (multi-line if template is multi-line); variables filled from 範例 column.
  - [ ] OUTPUT includes all sections the template demands; same structure; realistic detail.
  - [ ] No squashing or summarizing — full fidelity.
  - [ ] Rendered as `demo-conversation` or `demo-terminal` (preferred: `demo-conversation` for most prompts).
- [ ] **Final section:** Last section is **複製 / 取用**, NOT **安裝**; explains copy-and-use flow (no symlink).

---

## 10. Loom-Specific Note

For 範例輸出, Loom **must** ensure the example input matches the template's structure line-for-line, and the example output covers all demanded sections — this is the **single most important validation** Loom performs before handing off to `AGENTS.md` checks. (Shared Loom workflow: [`README.md`](./README.md) §3.3.)

---

## 11. Reference

- **Anti-pattern reference:** See §5.2 (BAD Example) and §5.3 (GOOD Example) above for the good/bad 範例輸出 pair — no separate sample asset needed.
- Shared references (spec sections, schema, AGENTS.md, Loom): see [`docs/authoring/README.md`](./README.md) §3.5.
