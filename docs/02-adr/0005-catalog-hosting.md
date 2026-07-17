# ADR-0005：目錄頁以靜態產生託管（Azure Static Web Apps 為主、GitHub Pages 為備）

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[01-prd](../01-prd.md) FR-4、NFR-5、ADR-0001 / 0004

## Context

目錄頁需可被全員瀏覽（PRD FR-4），且維持低維運（NFR-1）、可離線閱讀（NFR-5）。內容來自 repo 的 skill frontmatter。團隊本就在維運 **Azure**，故託管優先考慮貼合現有環境。

## Decision

- 目錄頁為**純靜態**（Vite build 產出 + `index.json`），無自建後端。
- 由 repo 內的產生腳本從 frontmatter 建出 `index.json` 與頁面資產。
- **託管優先採 Azure Static Web Apps**（貼合團隊 Azure 環境；有免費方案、自訂網域、SSL、可從 git 自動部署）；**GitHub Pages 為等效備選**。兩者皆為靜態託管，切換成本低。
- 亦可**本機直接開啟**檔案瀏覽（NFR-5 離線）。
- 更新方式：內容變更後（手動或一支 npm 指令）重新產生並發佈。起步以**手動 / 半自動**重建為主。

## Consequences

**正面**
- 零自建後端維運、可離線、可版控。
- Azure Static Web Apps 與團隊現有雲環境一致，權限 / 網域 / 監控可沿用既有 Azure 治理。
- 與 ADR-0001 / 0004 一致，資料來源單一（frontmatter → index.json → 頁面）。

**負面 / 取捨**
- 內容變更後需觸發重建才會出現（起步可接受手動）。
- 無伺服器端動態能力（登入、埋點、通知）——非起步需求。
- 綁 Azure 略增供應商相依；緩解：產出是純靜態檔，可隨時改掛 GitHub Pages 或其他 CDN。

## Alternatives considered

- **Azure Blob Storage static website**：更陽春、成本更低，但功能與整合不如 Static Web Apps。→ 作為更省的 Azure 內備選。
- **GitHub Pages**：與 repo 同源、設定最簡。→ 列為等效備選（尤其 repo 若在 GitHub）。
- **README 表格當目錄**：最省，但無即時搜尋 / 篩選 / 詳情頁，體驗差。→ 作為極簡 fallback。

---

> **狀態更新（2026-07-17）**：實際落地僅部署 **GitHub Pages**（見 `.github/workflows/deploy.yml`）；
> 上方 Decision 提到的 Azure Static Web Apps 方案**從未被建置**，未被採用。此紀錄保留原始決策脈絡
> 不做修改，現況請見 `README.md`「部署 / Deployment」一節。
