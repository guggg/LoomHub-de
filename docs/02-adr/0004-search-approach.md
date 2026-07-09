# ADR-0004：搜尋採前端模糊搜尋 + 產生 index.json

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[01-prd](../01-prd.md) FR-4、[questions.md](../../questions.md)（搜尋一題：ES / 模糊 / tags）

## Context

目錄頁需可搜尋 / 篩選 skill（PRD FR-4）。questions.md 曾問是否用 Elasticsearch、模糊 / 關鍵字搜尋、tags。規模為數十至一兩百個 skill。

## Decision

- 一支腳本掃描所有 skill 的 frontmatter，產生機器可讀的 **`index.json`**（含 name / description / type / category / tags / version / owner / 路徑）。
- 靜態頁載入 `index.json`，用**前端模糊搜尋 library（如 Fuse.js）**做即時比對，支援拼寫容錯與部分比對。
- 提供依 `type` / `category` / `tags` 的篩選。
- **不使用後端搜尋引擎（Elasticsearch）**。

## Consequences

**正面**
- 零維運（純靜態 + 前端）；此規模下即時無感。
- 搜尋範圍涵蓋 name / description / tags，足以覆蓋發現需求。
- `index.json` 亦可作為其他工具（安裝腳本、更新偵測）的資料來源。

**負面 / 取捨**
- 僅搜 frontmatter + 描述，**不做正文全文搜尋**。
- 中文斷詞 / 相關性排序能力有限（見下）。

## Alternatives considered

- **Elasticsearch / 後端全文搜尋**：為數十萬筆文件、全文與中文斷詞設計，對本規模是過度工程且需長駐服務。→ 否決（起步）。因資料集中於 frontmatter / index.json，未來規模長大要接 ES 可平滑遷移。
- **純 GitHub repo 內建搜尋**：能力弱、體驗差、無 tag 篩選。→ 作為 fallback，不作主要方案。

## Open

- 是否需要中文全文搜尋：起步不做，視使用回饋再評估（對應 Brief Q9）。
