---
name: dbt-model-scaffold
description: 多步驟 workflow，依團隊 dbt 慣例把一個新來源 scaffold 成完整的 staging → intermediate → mart 三層模型，並自動補上 schema.yml 測試（unique / not_null / relationships）。適用於接入新資料表、建立新的分析模型時，省去手刻樣板、統一命名與測試覆蓋。
type: workflow
category: development
tags: [dbt, sql, modeling, data-warehouse, elt]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-13
---

## 用途 / What

把「新增一個 dbt 模型」這件重複、易漏步驟的事變成一條可重跑的流程。它依團隊分層慣例
（staging 清洗 → intermediate 業務邏輯 → mart 對外）產出三層 `.sql` 檔與對應 `schema.yml`
測試，命名、資料夾結構、測試覆蓋一次到位，避免每個人各寫各的樣板。

## 使用場景 / When

- 接入一張新的來源表，要從 raw 一路建到可供 BI / 報表使用的 mart。
- 團隊要統一 dbt 分層與命名慣例，減少 review 時來回。
- 想確保每個新模型出生就帶基本測試（主鍵唯一、非空、外鍵關聯）。

不適用：只是小改既有模型的一兩個欄位（直接改該檔即可，不需整套 scaffold）。

## 前置條件

- 已初始化的 dbt 專案（`dbt_project.yml` 存在），且 profile 能連上 warehouse。
- 來源表已定義在 `models/staging/<source>/_<source>__sources.yml`（或準備好要新增）。
- 已安裝 dbt（`dbt --version` 可執行），並知道來源 schema / 表名與主鍵欄位。

## 步驟總覽

| 階段 | 在做什麼 | 輸入 → 輸出 |
|---|---|---|
| 1. 確認來源 | 登錄 source、確認欄位與主鍵 | 來源 schema/表名 → `_<source>__sources.yml` |
| 2. staging | 建 `stg_<source>__<table>.sql`，只做改名 / 型別轉換 / 清洗，不加業務邏輯 | source → 乾淨欄位的 staging model |
| 3. intermediate | 建 `int_<entity>_<verb>.sql`，放 join / 聚合等業務邏輯（若不需要可略過） | staging → 業務中間表 |
| 4. mart | 建 `<domain>/<fct_or_dim>_<entity>.sql`，對外可用的事實 / 維度表 | intermediate/staging → mart |
| 5. 測試 | 為各層補 `schema.yml`：主鍵 `unique`+`not_null`、外鍵 `relationships` | model → schema.yml 測試 |
| 6. 驗證 | `dbt build --select +<model>` 跑編譯 + 測試 | 全鏈路綠燈 |

## 使用方式 / How

對 agent 說「用 dbt-model-scaffold 幫 raw.orders 建一套模型，主鍵 order_id」。Agent 依上表
逐階段產檔：先登錄 source，再依 `stg_` / `int_` / `fct_`/`dim_` 命名建立各層 `.sql`，同步寫
`schema.yml` 測試，最後用 `dbt build --select +<model>` 驗證整條鏈路。Agent 應遵守分層原則
（staging 不放業務邏輯、mart 才對外），命名不確定時先向使用者確認。

## Demo / 範例

```demo-conversation
user: 用 dbt-model-scaffold 幫 raw.orders 建模，主鍵 order_id，最後要一張 fct_orders
agent: 好的。① 登錄 source raw.orders（order_id, customer_id, amount, created_at）② 建 stg_raw__orders.sql（改名 + 轉型）③ 不需 intermediate ④ 建 marts/finance/fct_orders.sql ⑤ 補 schema.yml：order_id unique+not_null、customer_id relationships→dim_customer。要我跑 dbt build 驗證嗎？
user: 跑
result: dbt build --select +fct_orders → 3 models、5 tests 全通過（PASS=8）。已建立 stg_raw__orders.sql、fct_orders.sql 與兩份 schema.yml。
```

```demo-terminal
$ dbt build --select +fct_orders
04:12:01  Running with dbt=1.8.2
04:12:03  1 of 3 OK created sql view model staging.stg_raw__orders ...... [OK]
04:12:05  2 of 3 OK created sql table model marts.fct_orders ............ [OK]
04:12:06  3 of 3 PASS unique_fct_orders_order_id ....................... [PASS]
04:12:07  Done. PASS=8 WARN=0 ERROR=0 SKIP=0 TOTAL=8
```

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/dbt-model-scaffold" ~/.agents/skills/dbt-model-scaffold
# Claude Code
$ ln -s "$PWD/skills/dbt-model-scaffold" ~/.claude/skills/dbt-model-scaffold
# 若該 agent 不支援 symlink，改用 copy 作為 fallback（兩處都裝）
$ cp -R skills/dbt-model-scaffold ~/.agents/skills/
$ cp -R skills/dbt-model-scaffold ~/.claude/skills/
```
