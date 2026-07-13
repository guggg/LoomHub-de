# 01 — PRD：skillsHub-de

> 狀態：Draft ｜ 最後更新：2026-07-09 ｜ 負責人：DE Team
> 上游文件：[00-product-brief.md](./00-product-brief.md)

本文件定義 skillsHub-de 的**功能需求**（做什麼、行為為何），不鎖定實作技術（技術決策見 ADR 02-*）。

---

## 1. 範圍

涵蓋七大功能面：

1. **Skill 內容模型**（一個 skill 由什麼組成）
2. **貢獻流程**（如何把 skill 收進 hub）
3. **AI Agent 檢核與重疊偵測**（品質與去重治理）
4. **目錄、瀏覽與搜尋**（如何被發現）
5. **安裝與使用**（如何被 agent 使用）
6. **版本控管與回饋**（如何維持與演進）
7. **Skill 製作助手 Loom**（貢獻的起點）

---

## 2. 使用者與角色

全員 8 人皆技術背景，與 hub 關係一致（皆可貢獻、皆可使用）。功能不區分角色權限層級（起步階段），差異僅在於使用頻率與情境。

| 角色 | 代表性需求 |
|---|---|
| 工程師 | 貢獻 AI / infra / 重構類 skill；搜尋並安裝到本機 agent |
| TPM | 貢獻與使用 ETL / 上線相關 skill |
| 技術經理 | 使用；並從目錄總覽掌握團隊能力沈澱 |

---

## 3. Skill 內容模型（FR-1）

一個 skill = **一個資料夾**，同時包含「給 AI 看」與「給人看」兩部分。

- **FR-1.1**：每個 skill 資料夾必須有一份帶 **frontmatter** 的主檔，frontmatter 至少含：`name`、`description`、`type`、`category`、`tags`、`version`(semver)、`owner`、`updated`。
- **FR-1.2**：`type` ∈ {`skill`, `prompt`, `mcp-server`, `workflow`, `kb-template`}（白名單，Spec 定死）。
- **FR-1.3**：`category` 採**通用工作活動分類** ∈ {`requirements`, `design`, `development`, `testing`, `ops`, `docs`, `research`, `general`}（白名單，Spec 定死）。領域字眼（aws/azure/etl/rag 等）一律放 `tags`，不進 category。`tags` 為自由標籤。
- **FR-1.4｜給 AI 看**：安裝所需的設定 / 腳本 / 指令，需能被 **Claude Code、Codex、Gemini 三家** agent 安裝使用（跨廠商相容機制見 ADR）。
- **FR-1.5｜給人看**：需含 **使用方式、使用場景、demo / 範例** 等人類可讀說明，供靜態目錄頁呈現。
- **FR-1.6**：`version` 遵循 semver（主.次.修）——破壞性變更升主版、加功能升次版、修正升修訂版。

---

## 4. 貢獻流程（FR-2）

貢獻面向全員（皆技術背景），採**信任制、極簡流程**——分享 / 更新頻率相近，要盡量無摩擦，不造成成員麻煩。

- **FR-2.1**：貢獻者新增 / 修改一個 skill 資料夾。
- **FR-2.2｜提交前自檢**：repo 根目錄提供一份 **`AGENTS.md`**（或等效檔），明列「提交前請依序檢查的項目與要執行的指令」。貢獻者的 **AI Agent 依此在本機執行檢核流程**（見 FR-3）。
- **FR-2.3｜免 PR 直接提交**：通過本機 AI 檢核後，**直接 commit + push 到主線**即可分享 / 更新，**不強制開 PR / reviewer 審核**。起步階段完全信任、push 不設閘門（見 FR-7 / ADR-0007），成員依 `AGENTS.md` 自檢。
- **FR-2.4｜索引重建**：提交後，目錄頁索引需被重建才會顯示新 skill。重建可由「push 觸發自動部署管線」（建議，Azure SWA / Pages Action）或「本機 / 排程重建」達成（見 Spec §7.1）。註：此為**部署管線**，非檢核閘門，與免 CI 取向不衝突。
- **FR-2.5**：貢獻不需填寫額外的線上表單 / 後台（無 web 後端）。
- **FR-2.6｜未來可加嚴**：若團隊規模 / 信任成本上升，可再加 PR 或輕量 CI，與現流程不衝突。

---

## 5. AI Agent 檢核與重疊偵測（FR-3）

這是 hub 品質治理的核心。因採信任制、免 PR（FR-2.3），檢核以**貢獻者提交前的本機 AI 自檢**落實。

檢核分為兩種性質：

- **FR-3.1｜規範檢核（提交前硬性自檢）**：驗證 frontmatter 必填欄位齊備、`type`/`category` 在白名單內、`version` 為合法 semver、必要的「給人看」段落（使用方式 / 場景 / demo）存在。**此類為客觀規範問題，AI 檢核未過就不應提交，貢獻者須修到全過。**
- **FR-3.2｜重疊偵測（分類優先，輔助）**：新增 skill 時，AI Agent **先依統一分類規則判斷 category，再只掃該 category 內既有 skill 的 description** 比對重疊（省時省 token，非掃全部）。**多數情況允許並存**；偵測到相似時，要求貢獻者在新 skill 說明中**明確寫出與相似 skill 的區別 / 場景 / 應用差異**。此為輔助判斷，最終由貢獻者決定。
- **FR-3.3｜檢核產物**：檢核需產生人類可讀結論——規範檢核通過 / 問題清單，以及重疊判斷 + 需補充的差異說明，供貢獻者自檢。
- **FR-3.4｜可重跑**：檢核流程以 prompt + 明確步驟定義（存在 repo 內），任何成員的 AI Agent 都能一致地重跑，結果穩定可預期。統一的分類規則（Spec §4.2）使不同 agent 歸類一致，提高重疊偵測正確率。
- **FR-3.5｜品質如何保障（無機器強制）**：因不採 CI / PR，規範靠信任 + 自檢；緩解措施：`AGENTS.md` 清楚可循、Loom 起草即內建檢核、`build-index` 產目錄時再跑一次規範檢核印警告。

> 檢核清單、分類規則與重疊偵測的具體 prompt / 步驟，於 Spec（03）定義並落成 `AGENTS.md`。

---

## 6. 目錄、瀏覽與搜尋（FR-4）

- **FR-4.0｜貢獻者不寫 HTML**：網站為一套**模板**，讀 `index.json` 與 `SKILL.md` 自動渲染任一 skill；貢獻者只寫 `SKILL.md`，永不撰寫頁面。視覺 / logo 為與結構分離的**主題層**，可獨立替換（見 Spec §7.2 / §7.4）。
- **FR-4.1｜索引**：一支腳本掃描所有 skill 的 frontmatter，產生機器可讀的索引（`index.json`）。
- **FR-4.2｜靜態目錄頁**：提供一個靜態頁面瀏覽所有 skill，卡片式呈現 name / description / type / category / tags / version / owner。
- **FR-4.3｜搜尋**：頁面提供**即時模糊搜尋**（比對 name / description / tags），支援拼寫容錯與部分比對；起步不使用後端搜尋引擎。
- **FR-4.4｜篩選**：可依 `type`、`category`、`tags` 篩選。
- **FR-4.5｜skill 詳情**：點入單一 skill 可看其「給人看」內容——使用方式、使用場景、demo、安裝方式。
- **FR-4.6｜安裝指令一鍵複製**：詳情頁提供可直接複製的安裝指令 / 步驟（對應各家 agent）。

---

## 7. 安裝與使用（FR-5）

- **FR-5.1**：提供將選定 skill 安裝到本機 agent skill 目錄的機制（腳本 / clone / symlink，方式見 ADR）。
- **FR-5.2**：安裝機制需支援 **Claude Code、Codex、Gemini 三家**的目錄與格式。
- **FR-5.3**：安裝需可指定單一 skill，不必整包 clone 全部。
- **FR-5.4**：安裝後 skill 需能被對應 agent 直接辨識與執行 / 掛載。

---

## 8. 版本控管與回饋（FR-6）

- **FR-6.1｜版控**：所有變更走 git，天生具備歷史、diff、blame；frontmatter 的 `version` 提供語意化版本資訊。
- **FR-6.2｜更新偵測（pull-based）**：使用者本機安裝某 skill 後，需能比對本機版本與 hub 版本，得知是否有更新及更新層級（主/次/修）。**起步為拉取式**——由使用者 / Loom 執行 `check-updates` 時比對，**無主動推播通知**（靜態、無後端，符合設計取捨）；主動通知列為未來選項。
- **FR-6.3｜本機修改回流（輕量）**：起步僅做**更新偵測 + 提醒**——不做自動雙向同步。若使用者在本機調整了 skill，工具偵測到本機與 hub 版本不一致時提醒使用者「本機有未回流的改動」，並引導其走 FR-2 貢獻流程手動提交，避免改動默默流失。自動抓取 / 自動 PR 為未來選項，起步不做。
- **FR-6.4｜回饋管道**：透過 GitHub Issues / Discussions 對特定 skill 提出問題、建議、bug；回饋需能關聯到具體 skill。
- **FR-6.5｜owner**：每個 skill 有 `owner`，作為回饋與維護的對口。
- **FR-6.6｜場景 / 版本微調的管理（variant）**：同一件事在不同場景需要不同微調時，起步採**「各微調為獨立 skill」**處理——用 `tags` 標示場景差異，並依 FR-3.2 要求在說明中寫清楚彼此區別（不做同一 skill 內的分支 / variant 機制）。`version`（semver）僅用於**同一 skill 的線性演進**，不表達 variant。更複雜的 variant 管理（如參數化單一 skill）列為未來議題。

---

## 9. Skill 製作助手 Loom（FR-7）

Loom 是安裝進成員 AI Agent 的 skill 製作助手，作為貢獻流程的起點；它本身是 hub 內的一個 skill。

- **FR-7.1｜偵測**：Loom 在專案協作中偵測「當前工作可被沈澱為可重用 skill」的時機（依可重用性、重複性等 heuristic）。
- **FR-7.2｜徵詢**：偵測到時**徵詢使用者是否製作**，不擅自動作；使用者可拒絕。
- **FR-7.3｜觸發模式**：**預設主動偵測，但提供關閉 / 調整頻率的開關**；同時支援使用者**手動呼叫**。
- **FR-7.4｜起草**：使用者同意後，Loom 依 hub 格式起草 skill（資料夾結構 + frontmatter + 正文小節），內容取自當前工作脈絡。
- **FR-7.5｜交棒**：Loom 起草後**交棒給既有的 §5 檢核（FR-3）與提交流程（FR-2，免 PR）**，不自建一套檢核 / 重疊邏輯。
- **FR-7.6｜單一真實來源**：Loom **只 reference hub 的 spec/schema**（格式 / 欄位 / 白名單 / 檢核規則），不複製；Loom 自身僅定義觸發、啟動、徵詢互動、交棒。
- **FR-7.7｜一鍵開通（bootstrap）**：安裝 Loom 後，Loom **自動 `git clone` hub repo 到本機約定位置，並自動安裝 hub 內指定的相關 skill**（含自身更新），成員無需逐一手動安裝。若本機已有 clone 則更新（pull）。
- **FR-7.8｜權限（起步全開）**：內部小團隊完全信任，起步階段 **clone / 裝 skill / push 貢獻皆自動、不設核准閘門**——裝了 Loom 即可讀可寫、立即可貢獻。未來若需要，可再對 push 加 collaborator 核准閘門（clone/讀仍自動）。
- **FR-7.9｜本機依賴（硬性前置）**：Loom 起草前**硬性要求本機已有 hub repo clone**（通常由 FR-7.7 自動完成）；若無且無法自動取得，**不起草、直接中止並指示先取得 repo**，不提供退化模式。
- **FR-7.10｜跨廠商**：Loom 作為 hub skill，需可安裝於 Claude Code / Codex / Gemini（同 FR-5.2）。

## 10. 非功能需求（NFR）

- **NFR-1｜低維運**：起步方案近乎零維運（無長駐後端 / DB / 搜尋引擎）。
- **NFR-2｜規模**：設計以團隊 8 人、skill 數十至一兩百個為假設；此規模下搜尋 / 瀏覽需即時無感。
- **NFR-3｜可演進**：資料集中於 frontmatter，未來要升級為 web app 或接搜尋引擎時，資料可平滑遷移。
- **NFR-4｜跨廠商**：內容與安裝機制需相容 Claude Code / Codex / Gemini，不綁單一廠商。
- **NFR-5｜可離線閱讀**：目錄頁為靜態，可託管於 Azure Static Web Apps（優先，貼合團隊環境）或 GitHub Pages，亦可本機開啟。

---

## 11. 驗收情境（Acceptance Scenarios）

- **AS-1｜貢獻**：工程師新增一個 RAG 建置 skill → 本機請 AI Agent 跑檢核 → 規範通過、歸類為 `development`、掃該類無重疊 → 直接 commit + push → 重建索引後出現在目錄頁（免 PR）。
- **AS-2｜重疊**：工程師新增的 skill 與同類某 skill 高度相似 → 檢核回報相似並要求補上「與 X 的區別 / 適用場景差異」→ 貢獻者補上差異說明後並存收錄（或自行決定改為更新既有 skill 升版）。
- **AS-3｜發現與安裝**：TPM 搜尋 "etl 上線" → 目錄頁即時列出相關 skill → 點入看使用場景與 demo → 複製安裝指令 → 裝進本機 agent 使用。
- **AS-4｜更新**：使用者本機 skill 為 1.2.0，hub 已是 2.0.0 → 更新偵測提示有破壞性更新 → 使用者決定是否升級。
- **AS-5｜跨廠商**：同一個 skill 分別被 Claude Code、Codex、Gemini 使用者安裝，皆能正常辨識使用。
- **AS-6｜Loom 製作**：工程師在做一段重複的 Athena 查詢整理，Loom 偵測到可重用 → 徵詢「要把這變成 skill 嗎？」→ 使用者同意 → Loom 依 hub 格式起草 skill、分類為 `development`、掃該類比對無重疊 → 交棒給 §5 檢核 → 通過後直接 commit + push（免 PR）。

---

## 12. 對應 Product Brief 未決問題

| Brief Q | PRD 如何處理 |
|---|---|
| Q1 分類法 | FR-1.2 / FR-1.3 採 type×category 兩維度 + tags（category 為通用活動分類），白名單見 Spec §4 |
| Q2 跨廠商相容 | FR-1.4 / FR-5.2 列為需求，機制見 ADR-0002 |
| Q3 託管方式 | NFR-5：Azure Static Web Apps（主）/ GitHub Pages（備），見 ADR-0005 |
| Q4 安裝機制 | FR-5，symlink 2 目標，見 ADR-0002 / Spec §6 |
| Q5 AI 檢核 / 重疊流程 | FR-3 全節，具體 prompt 見 Spec §5 |
| Q6 各類型是否共用 frontmatter | FR-1.1 共用一套 8 欄位核心，見 Spec §3.1 |
| Q7 本機修改回流 | FR-6.3 |
| Q8 人看內容呈現 | FR-1.5 / FR-4.5 |
| Q9 中文全文搜尋 | FR-4.3 起步用前端模糊搜尋，NFR-3 保留演進空間 |
