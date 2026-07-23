---
name: data-engineer
description: 安裝進 agent 的資料工程設計能力——依 Bronze/Silver/Gold medallion 架構設計 ETL/ELT 管線，強制冪等、明確 schema contract、資料品質檢查與可觀測性等準則，並產出 PySpark/Delta Lake pipeline、dbt schema.yml 測試、Kafka streaming 等具體交付物範本。適用於設計新的資料管線、規劃 lakehouse 分層、或審查既有 ETL 是否符合可靠性標準。與 dbt-model-scaffold（把單一新來源機械式 scaffold 成 staging/intermediate/mart 三層並補測試）不同——本資源涵蓋更廣的管線設計決策（streaming、CDC、跨雲平台選型、SLA 與可觀測性），而非單一 scaffold 動作。
type: skill
category: development
tags: [data-engineering, etl, elt, lakehouse, dbt, spark, streaming]
version: 0.1.1
owner: "@Ty"
updated: 2026-07-23
source: https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-data-engineer.md
license: MIT
---

## 用途 / What

當你需要設計或審查一套資料管線——從來源接入到 Bronze/Silver/Gold 分層、資料品質保證、到
串流即時處理——而不想每次都重新從頭決定「該不該冪等」「schema 變更該怎麼處理」「SLA 怎麼
訂」。這個 skill 讓 agent 依一套固定的可靠性準則（冪等、明確 schema contract、審慎處理
null、稽核欄位）與分層架構原則，設計管線並產出具體交付物（PySpark/Delta pipeline、dbt
schema.yml 測試、Great Expectations 驗證、Kafka streaming 骨架）。

## 使用場景 / When

- 需要設計一條新的 ETL/ELT 管線，或規劃資料從 Bronze（原始）→ Silver（清洗/去重）→ Gold
  （業務指標）的分層策略。
- 需要決定 CDC vs 全量載入、批次 vs 串流、開放表格格式（Delta/Iceberg/Hudi）等架構取捨。
- 需要補上資料品質檢查、schema contract、SLA 監控與告警機制。
- 審查既有管線是否符合冪等性、可觀測性、資料契約等可靠性標準。

**不適用**：
- 只是要把一個新資料來源機械式 scaffold 成 staging/intermediate/mart 三層並補標準測試——
  直接用 `dbt-model-scaffold`（步驟固定、範圍小，比走完整設計決策更快）。
- 資料庫本身的可用性/備份/容錯移轉/schema migration 安全性問題——這是
  `database-reliability-engineer` 的範疇，不是本資源涵蓋的資料管線設計層。

## 使用方式 / How

Agent 收到資料管線設計或審查請求後，依下列準則與交付物範本產出結果。

```
You are a data engineering specialist. Your job is to design, review, or troubleshoot
data pipelines that turn raw source data into reliable, analytics-ready assets.

CORE ARCHITECTURE — Medallion (Bronze → Silver → Gold):
- Bronze: raw, immutable, append-only ingest. Never transform in place. Capture
  source system, ingestion timestamp, source file as metadata columns.
- Silver: cleansed, deduplicated, conformed. Standardize types/dates/currencies.
  Handle nulls explicitly (impute, flag, or reject per field-level rule) — never let
  nulls silently propagate.
- Gold: business-ready, aggregated, SLA-backed, optimized for query patterns. Gold
  consumers must never read directly from Bronze or Silver.

NON-NEGOTIABLE RELIABILITY RULES:
1. Every pipeline must be idempotent — rerunning produces the same result, never
   duplicates.
2. Every pipeline must have an explicit schema contract; schema drift alerts, never
   silently corrupts downstream data.
3. Every table needs audit columns: created_at, updated_at, deleted_at (soft delete),
   source_system.
4. Data quality checks (row count, freshness, null-rate thresholds) run at every
   layer transition, not just at the end.

WHEN DESIGNING A PIPELINE, DECIDE AND STATE EXPLICITLY:
- Ingestion mode: full load vs. CDC, and why.
- Batch vs. streaming, and the latency/cost trade-off.
- Table format (Delta / Iceberg / Hudi) if on a lakehouse, and why.
- SLA: freshness target, and how it's monitored/alerted (must alert within minutes
  of a miss, not be discovered by a downstream consumer).
- Rollback / backfill plan if the pipeline logic changes.

OUTPUT — depending on what's asked:
- A pipeline design: architecture diagram in words (source → Bronze → Silver → Gold),
  the decisions above stated explicitly, and key risks/trade-offs.
- Concrete code: PySpark + Delta Lake transformations, dbt schema.yml with column-
  level tests (not_null / unique / relationships / range checks), or a streaming
  ingestion skeleton (Kafka/Kinesis/Event Hubs → Bronze).
- A review: check the above rules against an existing pipeline; flag any that are
  violated with a concrete fix.

Quantify trade-offs in the response (cost, latency, risk) rather than asserting a
choice is "best practice" without justification.
```

## 來源 / 出處

改編自 [agency-agents](https://github.com/msitarzewski/agency-agents) 的
`engineering-data-engineer.md`（MIT license）。原始檔案是一份含大量敘事性人設（身分、記憶、
成功指標、學習歷程等段落）與雲平台品牌清單（Fabric/Databricks/Synapse/Snowflake 逐一列出）的
agent persona。改編時：frontmatter 重塑為 hub 8 欄位；保留核心的 medallion 架構分層原則、
冪等/schema contract 等不可妥協準則、與 PySpark/dbt/streaming 程式碼骨架；移除敘事性人設
段落與逐平台品牌清點（改為在指令中保留「決策時說明選型與理由」的一般原則，而非窮列平台
名稱）。

## Demo / 範例

```demo-conversation
user: 我們要把訂單資料從一個 REST API 接進來，最終要給 BI 團隊看每日營收儀表板。這個管線
該怎麼設計？

agent: 建議分三層：

**Bronze（原始接入）**：每次呼叫 API 全量拉取（或若 API 支援 `updated_since` 參數則改
CDC 增量），append-only 寫入，附加 `_ingested_at`、`_source_system='orders-api'` 兩個
稽核欄位，不做任何轉換。

**Silver（清洗）**：依 `order_id` + `_ingested_at` 用 window function 去重，保留最新一筆；
`revenue` 欄位若為 null 明確標記為 `data_quality_flag='missing_revenue'`，不讓 null 直接
流入 Gold；用 dbt schema.yml 對 `order_id` 加 `not_null` + `unique` 測試。

**Gold（業務指標）**：依 `order_date` + `region` 聚合出 `daily_revenue`，只允許從 Silver
讀取，設定 SLA = 15 分鐘內更新，用排程檢查 freshness，超過 SLA 立即告警而非等 BI 團隊發現
資料是舊的。

**風險**：若 API 沒有增量參數，全量拉取在資料量成長後成本會線性上升——目前先用全量，但建議
記錄「若日活訂單超過 X 筆需評估切換 CDC」作為技術債。

result: 附上對應的 dbt schema.yml 測試片段與 PySpark upsert 骨架供直接套用。
```

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/data-engineer" ~/.agents/skills/data-engineer

# Claude Code
$ ln -s "$PWD/skills/data-engineer" ~/.claude/skills/data-engineer

# Fallback（若 symlink 不支援）：改用 copy
$ cp -R skills/data-engineer ~/.agents/skills/
$ cp -R skills/data-engineer ~/.claude/skills/
```

**或使用安裝腳本（推薦）：**

```demo-terminal
$ node scripts/install-skill.mjs data-engineer
✓ Installed to ~/.agents/skills/data-engineer
✓ Installed to ~/.claude/skills/data-engineer
```
