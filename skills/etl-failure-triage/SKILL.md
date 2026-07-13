---
name: etl-failure-triage
description: 可重用 prompt 範本，協助 on-call 快速分診失敗的 ETL / Airflow run——貼上 DAG、task、錯誤 log 與環境資訊後，產出「最可能根因 → 立即檢查步驟 → 建議處置 → 是否需升級」的結構化分診結論。適用於 Airflow task 失敗、資料延遲、上游來源異常等 pipeline 事故的初步排查。
type: prompt
category: ops
tags: [etl, airflow, oncall, triage, incident]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-13
---

## 用途 / What

把「一坨 Airflow 失敗訊息」變成一份可行動的分診結論。On-call 值班時常收到 pipeline
告警，但 log 又長又雜、根因散落在 task retry / 上游延遲 / 資源不足之間。這個 prompt 範本
固定了分診的思考框架，讓 agent 產出一致的「根因假設 → 檢查步驟 → 處置建議 → 升級判斷」，
縮短平均修復時間（MTTR），也讓不同人接手時判斷一致。

## 使用場景 / When

- Airflow DAG 的某個 task 失敗、卡住、或整條 pipeline SLA miss，值班要快速定位。
- 半夜收到告警、腦袋還沒開機，需要一份結構化 checklist 帶著走。
- 想把資深工程師的排查直覺標準化，讓 junior 也能做出一致的初步分診。

不適用：已知根因、要做深度 root-cause 事後檢討（那屬於 postmortem，不是即時分診）。

## 使用方式 / How

把下方範本填好變數後丟給 agent。Agent 應**只依提供的事實推理**，區分「已知事實」與
「推測假設」，不得杜撰不存在的 log 內容。輸出固定四段：根因假設（依可能性排序）、
立即檢查步驟、建議處置、是否需升級（含升級對象）。

```
你是一位資深 Data Engineer，正在協助 on-call 分診一個失敗的 ETL / Airflow run。
只根據我提供的事實推理，明確區分「已知事實」與「推測」，不要杜撰 log。

DAG: {{dag_id}}
失敗的 task: {{task_id}}
執行時間 / data interval: {{execution_date}}
重試狀況: {{retry_count}} 次，皆失敗
錯誤訊息 / log 摘要:
{{error_log}}
上游來源與相依: {{upstream_context}}
近期變更（部署 / schema / 設定）: {{recent_changes}}

請輸出：
1. 最可能根因（依可能性排序，各附判斷依據）
2. 立即檢查步驟（可直接照做的指令 / 查詢）
3. 建議處置（重跑 / 修資料 / 改設定 / 暫停 DAG）
4. 是否需升級？升級給誰、理由
```

## 變數 / 參數

| 變數 | 說明 | 範例 |
|---|---|---|
| `{{dag_id}}` | 失敗的 Airflow DAG 名稱 | `daily_sales_etl` |
| `{{task_id}}` | 失敗的 task | `load_to_warehouse` |
| `{{execution_date}}` | 執行時間 / data interval | `2026-07-13T02:00:00Z` |
| `{{retry_count}}` | 已重試次數 | `3` |
| `{{error_log}}` | 錯誤訊息或 log 摘要（貼關鍵幾行即可） | `OperationalError: FATAL: too many connections` |
| `{{upstream_context}}` | 上游來源、相依 task、資料是否到齊 | `依賴 s3://raw/sales/，上游 export 09:00 才完成` |
| `{{recent_changes}}` | 近期部署 / schema / 設定變更 | `昨天調高了 batch size` |

## 範例輸出

```demo-conversation
user: DAG: daily_sales_etl / task: load_to_warehouse / 重試 3 次皆失敗 / log: OperationalError: FATAL: sorry, too many clients already / 上游 09:00 才完成 export / 近期把 batch size 從 500 調到 5000
agent: 【最可能根因】1) Postgres 連線耗盡（高信度）——log 明示 "too many clients"，且你把 batch 從 500 調到 5000，並行 writer 佔滿連線池。2) 上游延遲（中信度）——export 09:00 完成，若此 run 排在之前會讀到空資料，但目前 log 指向連線而非空資料。
result: 【立即檢查】① 連 warehouse 跑 `SELECT count(*) FROM pg_stat_activity;` 對照 max_connections ② 確認上游 export 已完成再重跑。【建議處置】先把 batch size 回退到 500 後重跑該 task；連線池若仍滿，暫時調高 pool 或分批。【升級】若回退後仍撞連線上限 → 升級 DBA 檢查 max_connections / 連線洩漏。
```

## 複製 / 取用

這是一段 **prompt 範本**，不需安裝進 agent——直接**複製「使用方式」裡的範本**、填好變數即可貼給任何 agent 使用（詳情頁提供一鍵複製）。若你想讓某個 agent 每次自動帶著這個分診框架，可再把它整理成 `type: skill` 的版本，那才走安裝流程。
