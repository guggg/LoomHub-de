# ADR-0001：以 Git repo + 靜態目錄頁作為呈現形態

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[00-product-brief](../00-product-brief.md)、[01-prd](../01-prd.md)

## Context

LoomHub-de 需要一個載體來「分享 / 蒐集 / 整理」可被 AI Agent 使用的 skill。候選方向：(a) Git repo + 靜態目錄頁；(b) 自建 web app（後端 + DB + 搜尋引擎）；(c) 現成平台（Notion / Confluence）。

關鍵約束：
- skill 本身就是符合 agentskills.io 標準的檔案資料夾，最終要能被安裝進本機 agent。
- 團隊 8 人皆技術背景，git 操作無門檻。
- 規模小（skill 數十至一兩百），維運人力有限。

## Decision

採 **Git repo 為單一真實來源 + 自動產生的靜態目錄頁**。

- 一資料夾 = 一 skill；版控、歷史、diff 由 git 原生提供。
- 腳本掃描 frontmatter 產生 `index.json`，靜態頁提供瀏覽 / 搜尋 / 篩選。
- 貢獻採信任制、免 PR（本機 AI 自檢通過即直接 push，見 ADR-0006）；回饋走 Issues / Discussions。

## Consequences

**正面**
- 近乎零維運（無長駐服務）。
- skill 是檔案，能被 agent 直接安裝，無需額外「匯出」功能。
- 版控 / 審核 / 歷史全部免費由 git 提供。
- 資料集中於 frontmatter，未來升級 web app 或接搜尋引擎可平滑遷移。

**負面 / 取捨**
- 無線上所見即所得編輯（須在本機用 git commit 提交）。
- 無站內使用分析 / 通知（可靠 GitHub 有限提供）。
- 全文搜尋能力有限（起步僅前端模糊搜尋，見 ADR-0004）。

## Alternatives considered

- **自建 web app**：功能最完整（線上編輯、站內分析），但對 8 人團隊維運成本過高，且要額外實作版控 / 審核 / 匯出成檔案，反而繞遠路。→ 否決（起步）。
- **現成平台（Notion/Confluence）**：省開發，但 skill 無法被 agent 直接安裝使用，違背核心目標。→ 否決。
