# ADR-0003：Frontmatter schema —— 可攜核心欄位 + 團隊擴充欄位

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[01-prd](../01-prd.md) FR-1、ADR-0002

## Context

每個 skill 需要一致的中繼資料，用於：跨廠商安裝（ADR-0002）、目錄與搜尋（ADR-0004）、版控與治理（PRD FR-3 / FR-6）。約束：

- 標準（agentskills.io）只保證 `name`、`description` 可攜；其餘為擴充。
- 我方需要 `type` / `category` / `tags` / `version` / `owner` 等治理欄位。
- 擴充欄位對其他廠商是「未知欄位」，會被容忍忽略——安全。

## Decision

frontmatter 分兩層：

**A. 標準可攜層**（三家皆識別）
- `name`（必填）—— **必須等於資料夾名**；小寫、數字、連字號。
- `description`（必填）—— 做什麼 + 何時用，關鍵字豐富，≤ 1024 字元。

**B. 團隊治理擴充層**（標準的 `metadata` 或頂層擴充欄位，其他廠商忽略）
- `type`（必填）∈ {`skill`, `prompt`, `mcp-server`, `workflow`}（RAG/知識庫歸 skill 或 workflow + tags，不另設 kb-template）
- `category`（必填）∈ 通用工作活動分類 {`requirements`, `design`, `development`, `testing`, `ops`, `docs`, `research`, `general`}（領域字眼放 tags，見 spec §4.2）
- `tags`（必填，可為空陣列）—— 自由標籤（含領域如 aws/azure/etl/rag）
- `version`（必填）—— semver `x.y.z`
- `owner`（必填）—— 維護對口（如 `@handle`）
- `updated`（必填）—— 最後更新日期 `YYYY-MM-DD`

> 白名單（type / category）以 repo 內一份 schema 檔（如 `skill.schema.json`）為單一定義來源，供檢核流程引用。

範例：
```yaml
---
name: build-knowledge-base
description: 建立 RAG 知識庫的標準流程與 prompt 模板；當你要為新資料源建 KB 時使用。
type: skill
category: development
tags: [rag, knowledge-base, ai, azure]
version: 1.4.2
owner: "@alice"
updated: 2026-07-09
---
```

## Consequences

**正面**
- 可攜層確保三家安裝無礙；擴充層滿足治理與搜尋。
- 白名單集中於 schema 檔，檢核與目錄產生共用同一份事實。
- 擴充欄位被其他廠商忽略，不破壞相容。

**負面 / 取捨**
- 擴充欄位非標準，換工具鏈時需自行解析（但資料集中、遷移容易）。
- 欄位必填較多，貢獻者負擔略增——由 guideline + AI 檢核協助填寫。

## Alternatives considered

- **全部塞進標準 `metadata` 子物件**：更「純」，但巢狀存取較繁瑣、搜尋腳本較麻煩。→ 採混合：治理欄位放頂層以利工具處理，仍屬標準容忍的未知欄位。
- **最小化只留 name/description**：無法支撐分類 / 搜尋 / 版控治理。→ 否決。

---

> **狀態更新（2026-07-22）**：`type` 白名單新增第 5 個值 `tool`（完全外部、獨立的工具 / CLI / app /
> 服務，不可安裝進 agent、也非可複製的文字範本，僅以連結 + 簡述收錄）。此紀錄保留原始決策脈絡不做
> 修改，現況以 `schema/skill.schema.json` 與 `docs/03-spec.md` §4.1 為單一真實來源。
