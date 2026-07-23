# 01 — Product Brief & PRD：LoomHub-de

> 狀態：Draft ｜ 最後更新：2026-07-17 ｜ 負責人：DE Team
> 下游：[02-adr](./02-adr/README.md)、[03-spec](./03-spec.md)
>
> **註（2026-07-17）**：本文件合併原 `00-product-brief.md`（Vision / 目標）與原 `01-prd.md`
> （功能需求），因兩份文件內容重疊過多（目標敘述、待解問題表幾乎逐字重複兩份）。結構：
> Vision / 目標 → 範圍 / 非目標 → 功能需求（FR） → 非功能需求（NFR） → 驗收情境 → 開放問題。

---

## 1. 一句話定位

**LoomHub-de 是 Data Engineering 團隊用來「分享、蒐集、整理」可被 AI Agent 直接使用的 skill 的單一真實來源（single source of truth）。**

它不是拿來「創造」skill 的地方，而是把團隊在日常開發、維運、AI 專案中沈澱下來的 skill 匯集、規範化、可被搜尋、可被安裝使用的地方。

---

## 2. 我們要解決的問題

團隊目前的 skill（給 AI Agent 用的 `SKILL.md`、prompt / 知識庫模板）散落在各處：個人電腦、聊天記錄、私人筆記、各專案 repo 裡。造成：

- **重複造輪子**：A 工程師花時間調好的 RAG 建置流程，B 工程師不知道，又從頭來一次。
- **知識隨人走**：離職 / 換專案，skill 就消失。
- **品質不一**：沒有統一規範，同一件事有五種寫法，難以維護與信任。
- **找不到 / 不知道有**：就算存在，也沒有一個地方能搜尋、瀏覽、比較。
- **版本混亂**：不知道自己本機那份 skill 是不是最新，也不知道別人改了什麼。

---

## 3. 目標受眾與使用情境

團隊組成：**1 技術經理 + 2 TPM + 5 工程師，全員皆為技術背景**。

所有成員與 hub 的關係一致：**都可能是貢獻者，也都是使用者**。git / 跑檢核指令這類操作對全員都不構成門檻，因此不需要為任何角色特別做「簡化入口」。

| 角色 | 與 hub 的關係 | 主要情境 |
|---|---|---|
| **5 位工程師** | 貢獻者 + 使用者 | 上傳/更新 skill、審核他人貢獻、搜尋並安裝 skill 到本機 agent 使用 |
| **2 位 TPM** | 貢獻者 + 使用者 | 同上；另常用於協助日常 ETL、上線相關的 skill |
| **技術經理** | 貢獻者 + 使用者 | 同上；並掌握團隊能力沈澱與品質治理視角 |

> 設計取捨：因全員皆技術背景，貢獻與瀏覽入口皆以「清楚、好用」為原則即可，無需區分工程師 / 非工程師兩套介面。

團隊日常工作涵蓋：AI 相關專案、AWS infra、Azure 維運、系統重構等，這些**領域**以 `tags` 標示（分類 `category` 採通用工作活動維度，見 Spec §4）。

---

## 4. 目標（Goals）

- **G1｜集中**：團隊 skill 有唯一、可信的來源，不再散落。
- **G2｜可發現**：任何成員能在數秒內搜尋 / 瀏覽 / 篩選到需要的 skill。
- **G3｜可使用**：找到後能一鍵（或極簡步驟）安裝到本機 agent 使用。
- **G4｜規範一致**：所有 skill 遵循統一的結構與中繼資料規範，品質可信；並提供「如何做出一個合格 skill」的 guideline 輔助貢獻者。
- **G5｜可治理**：貢獻有審核、有版控、有回饋管道，品質能持續維持而非腐化。審核以**貢獻者自己的 AI Agent 依檢核流程 prompt 執行**為主。
- **G6｜防重疊**：新增 skill 時能**偵測與既有 skill 的重疊**——貢獻者的 AI Agent 依審核流程判斷是否重複，並建議「合併 / 取代 / 獨立收錄」。
- **G7｜低貢獻門檻**：透過 skill 製作助手（Loom）主動偵測與引導，讓成員能在日常工作中就地把可重用工作沈澱成合格 skill，而非事後另花力氣。
- **G8｜低維運**：起步方案近乎零維運成本，適合 8 人團隊。

---

## 5. 非目標（Non-Goals）

- ❌ 起步階段不自建 web app 後端 / 資料庫 / 全文搜尋引擎（Elasticsearch）。
- ❌ 不做面向團隊外部 / 公開的 skill 市集（起步僅團隊內部）。
- ❌ 不收錄與 AI Agent 無關的一般文件。
- ❌ 上游 heartbeat（§7.3.1）只偵測上游更新並開 issue 通知，不自動同步 / 不自動套用上游改動。

> 註：hub 本身的主要工作是「蒐集 / 分享 / 整理」既有 skill，而非提供通用 skill 生成工具；但為了讓收錄品質一致與降低貢獻門檻，hub **會提供 guideline、檢核流程，以及一個「skill 製作助手（Loom）」輔助貢獻者把日常工作整理成合格 skill**（見 §8.7）。

---

## 6. 範圍與資產定義

本文件涵蓋七大功能面（對應下方 §8 各 FR 小節）：

1. **Skill 內容模型**（一個 skill 由什麼組成，§8.1）
2. **貢獻流程**（如何把 skill 收進 hub，§8.2）
3. **AI Agent 檢核與重疊偵測**（品質與去重治理，§8.3）
4. **目錄、瀏覽與搜尋**（如何被發現，§8.4）
5. **安裝與使用**（如何被 agent 使用，§8.5）
6. **版本控管與回饋**（如何維持與演進，§8.6）
7. **Skill 製作助手 Loom**（貢獻的起點，§8.7）

本 hub 收錄的是**可被 AI Agent 使用或組成**的可重用資產。**不綁定特定廠商**——需相容至少 **Claude Code、Codex、Gemini** 三家的 agent-skill 安裝方式。涵蓋類型（`type`）：

1. **Agent Skill（`SKILL.md`，type=`skill`）** —— 含正文指令、輔助腳本、參考檔，可安裝進各家 agent 的 skill 目錄被執行。
2. **Prompt 模板（type=`prompt`）** —— 可重用的 prompt 範本。
3. **MCP Server（type=`mcp-server`）** —— 可被 agent 掛載的工具伺服器（設定 + 說明）。
4. **方法論 / 規範（type=`workflow`）** —— 描述「該怎麼做」的標準 / 原則（如審查標準、品質關卡），非可被執行產出結果的能力體。
5. **外部工具（type=`tool`）** —— 完全外部、獨立的工具 / CLI / app / 服務，本身 AI 相關但非可安裝進 agent 的內容、也非可複製的文字範本，僅以連結 + 簡述收錄。

> RAG / 知識庫建置類資產歸入 `skill` 或 `workflow`，以 `tags: [rag, kb, …]` 標示（不另設 kb-template type）。

> 每個 skill 同時有**給 AI 看的部分**（安裝設定、agent 指令）與**給人看的部分**（使用方式、使用場景、demo）。後者會呈現在靜態目錄頁上。

**明確不收錄**：純給人看、與 AI Agent 無關的 SOP / Runbook；與 AI 無關的一般 code snippet（除非它是某 skill 的附屬腳本）。

---

## 7. 方案方向（High-Level Approach）

**Git repo 為單一真實來源 + 自動產生的靜態目錄頁**。

- **一個資料夾 = 一個 skill**（設定/腳本/參考檔 + 給人看的說明）。資料夾需能同時滿足 Claude Code、Codex、Gemini 的安裝方式（跨廠商相容細節見 ADR）。
- 統一 **frontmatter** 規範（8 個必填欄位：name / description / type / category / tags / version[semver] / owner / updated，詳見 Spec §3.1）。
- **檢核靠 AI Agent 而非 CI 硬擋**：repo 內放一份 `AGENTS.md`（或等效檔）寫明「提交前請依序檢查 1… 2… 3…、跑哪些指令」，由貢獻者的 AI Agent 在本機執行檢核流程；同時負責**重疊偵測（分類優先：先歸類再掃該類）**。
- 腳本掃描 frontmatter 產生 `index.json`，靜態目錄頁提供**前端模糊搜尋 + tag 篩選**，並呈現每個 skill 的使用方式 / 場景 / demo（人看）與安裝方式（給 AI）。
- **貢獻採信任制、免 PR**：本機 AI 自檢通過即可直接 commit + push 分享 / 更新，力求無摩擦；起步階段完全信任、不設 push 閘門。版控與歷史由 git 天生提供。
- 回饋走 **GitHub Issues / Discussions**，綁定到各 skill。

Skill 製作助手（Loom）是整個 hub 的「創作入口（on-ramp）」——在任何專案協作中**主動偵測**「這段工作可被沈澱為可重用 skill」的時機，**徵詢使用者**是否要製作，同意後起草符合格式的 skill draft 再交棒給既有檢核與提交流程。完整需求見 §8.7（FR-7）。

分工原則（單一真實來源）：**格式 / 欄位 / 白名單 / 檢核規則由 hub 的 spec/schema 擁有；Loom 只擁有觸發時機、啟動方式、徵詢互動與交棒方式**——Loom 只 reference spec，不複製格式規則，避免漂移。

> 詳細技術決策見 ADR 系列（`02-adr/`）；此處僅定調方向。

---

## 8. 功能需求（Functional Requirements）

### 8.1 Skill 內容模型（FR-1）

一個 skill = **一個資料夾**，同時包含「給 AI 看」與「給人看」兩部分。

- **FR-1.1**：每個 skill 資料夾必須有一份帶 **frontmatter** 的主檔，frontmatter 至少含：`name`、`description`、`type`、`category`、`tags`、`version`(semver)、`owner`、`updated`。
- **FR-1.2**：`type` ∈ {`skill`, `prompt`, `mcp-server`, `workflow`, `tool`}（白名單，Spec 定死；RAG/知識庫歸 skill 或 workflow + tags）。
- **FR-1.3**：`category` 採**通用工作活動分類** ∈ {`requirements`, `design`, `development`, `testing`, `ops`, `docs`, `research`, `general`}（白名單，Spec 定死）。領域字眼（aws/azure/etl/rag 等）一律放 `tags`，不進 category。`tags` 為自由標籤。
- **FR-1.4｜給 AI 看**：安裝所需的設定 / 腳本 / 指令，需能被 **Claude Code、Codex、Gemini 三家** agent 安裝使用（跨廠商相容機制見 ADR）。
- **FR-1.5｜給人看**：需含 **使用方式、使用場景、demo / 範例** 等人類可讀說明，供靜態目錄頁呈現。
- **FR-1.6**：`version` 遵循 semver（主.次.修）——破壞性變更升主版、加功能升次版、修正升修訂版。

### 8.2 貢獻流程（FR-2）

貢獻面向全員（皆技術背景），採**信任制、極簡流程**——分享 / 更新頻率相近，要盡量無摩擦，不造成成員麻煩。

- **FR-2.1**：貢獻者新增 / 修改一個 skill 資料夾。
- **FR-2.2｜提交前自檢**：repo 根目錄提供一份 **`AGENTS.md`**（或等效檔），明列「提交前請依序檢查的項目與要執行的指令」。貢獻者的 **AI Agent 依此在本機執行檢核流程**（見 §8.3）。
- **FR-2.3｜免 PR 直接提交**：通過本機 AI 檢核後，**直接 commit + push 到主線**即可分享 / 更新，**不強制開 PR / reviewer 審核**。起步階段完全信任、push 不設閘門（見 §8.7 / ADR-0007），成員依 `AGENTS.md` 自檢。
- **FR-2.4｜索引重建**：提交後，目錄頁索引需被重建才會顯示新 skill。重建可由「push 觸發自動部署管線」（建議，GitHub Pages Action）或「本機 / 排程重建」達成（見 Spec §7.1）。註：此為**部署管線**，非檢核閘門，與免 CI 取向不衝突。
- **FR-2.5**：貢獻不需填寫額外的線上表單 / 後台（無 web 後端）。
- **FR-2.6｜未來可加嚴**：若團隊規模 / 信任成本上升，可再加 PR 或輕量 CI，與現流程不衝突。

### 8.3 AI Agent 檢核與重疊偵測（FR-3）

這是 hub 品質治理的核心。因採信任制、免 PR（FR-2.3），檢核以**貢獻者提交前的本機 AI 自檢**落實。

檢核分為兩種性質：

- **FR-3.1｜規範檢核（提交前硬性自檢）**：驗證 frontmatter 必填欄位齊備、`type`/`category` 在白名單內、`version` 為合法 semver、必要的「給人看」段落（使用方式 / 場景 / demo）存在。**此類為客觀規範問題，AI 檢核未過就不應提交，貢獻者須修到全過。**
- **FR-3.2｜重疊偵測（分類優先，輔助）**：新增 skill 時，AI Agent **先依統一分類規則判斷 category，再只掃該 category 內既有 skill 的 description** 比對重疊（省時省 token，非掃全部）。**多數情況允許並存**；偵測到相似時，要求貢獻者在新 skill 說明中**明確寫出與相似 skill 的區別 / 場景 / 應用差異**。此為輔助判斷，最終由貢獻者決定。
- **FR-3.3｜檢核產物**：檢核需產生人類可讀結論——規範檢核通過 / 問題清單，以及重疊判斷 + 需補充的差異說明，供貢獻者自檢。
- **FR-3.4｜可重跑**：檢核流程以 prompt + 明確步驟定義（存在 repo 內），任何成員的 AI Agent 都能一致地重跑，結果穩定可預期。統一的分類規則（Spec §4.2）使不同 agent 歸類一致，提高重疊偵測正確率。
- **FR-3.5｜品質如何保障（無機器強制）**：因不採 CI / PR，規範靠信任 + 自檢；緩解措施：`AGENTS.md` 清楚可循、Loom 起草即內建檢核、`build-index` 產目錄時再跑一次規範檢核印警告。

> 檢核清單、分類規則與重疊偵測的具體 prompt / 步驟，於 Spec（03）定義並落成 `AGENTS.md`。

### 8.4 目錄、瀏覽與搜尋（FR-4）

- **FR-4.0｜貢獻者不寫 HTML**：網站為一套**模板**，讀 `index.json` 與 `SKILL.md` 自動渲染任一 skill；貢獻者只寫 `SKILL.md`，永不撰寫頁面。視覺 / logo 為與結構分離的**主題層**，可獨立替換（見 Spec §7.2 / §7.4）。
- **FR-4.1｜索引**：一支腳本掃描所有 skill 的 frontmatter，產生機器可讀的索引（`index.json`）。
- **FR-4.2｜靜態目錄頁**：提供一個靜態頁面瀏覽所有 skill，卡片式呈現 name / description / type / category / tags / version / owner。
- **FR-4.3｜搜尋**：頁面提供**即時模糊搜尋**（比對 name / description / tags），支援拼寫容錯與部分比對；起步不使用後端搜尋引擎。
- **FR-4.4｜篩選**：可依 `type`、`category`、`tags` 篩選。
- **FR-4.5｜skill 詳情**：點入單一 skill 可看其「給人看」內容——使用方式、使用場景、demo、安裝方式。
- **FR-4.6｜安裝指令一鍵複製**：詳情頁提供可直接複製的安裝指令 / 步驟（對應各家 agent）。

### 8.5 安裝與使用（FR-5）

- **FR-5.1**：提供將選定 skill 安裝到本機 agent skill 目錄的機制（腳本 / clone / symlink，方式見 ADR）。
- **FR-5.2**：安裝機制需支援 **Claude Code、Codex、Gemini 三家**的目錄與格式。
- **FR-5.3**：安裝需可指定單一 skill，不必整包 clone 全部。
- **FR-5.4**：安裝後 skill 需能被對應 agent 直接辨識與執行 / 掛載。

### 8.6 版本控管與回饋（FR-6）

- **FR-6.1｜版控**：所有變更走 git，天生具備歷史、diff、blame；frontmatter 的 `version` 提供語意化版本資訊。
- **FR-6.2｜更新偵測（pull-based）**：使用者本機安裝某 skill 後，需能比對本機版本與 hub 版本，得知是否有更新及更新層級（主/次/修）。**起步為拉取式**——由使用者 / Loom 執行 `check-updates` 時比對，**無主動推播通知**（靜態、無後端，符合設計取捨）；主動通知列為未來選項。
- **FR-6.3｜本機修改回流（輕量）**：起步僅做**更新偵測 + 提醒**——不做自動雙向同步。若使用者在本機調整了 skill，工具偵測到本機與 hub 版本不一致時提醒使用者「本機有未回流的改動」，並引導其走 FR-2 貢獻流程手動提交，避免改動默默流失。自動抓取 / 自動 PR 為未來選項，起步不做。
- **FR-6.4｜回饋管道**：透過 GitHub Issues / Discussions 對特定 skill 提出問題、建議、bug；回饋需能關聯到具體 skill。
- **FR-6.5｜owner**：每個 skill 有 `owner`，作為回饋與維護的對口。
- **FR-6.6｜場景 / 版本微調的管理（variant）**：同一件事在不同場景需要不同微調時，起步採**「各微調為獨立 skill」**處理——用 `tags` 標示場景差異，並依 FR-3.2 要求在說明中寫清楚彼此區別（不做同一 skill 內的分支 / variant 機制）。`version`（semver）僅用於**同一 skill 的線性演進**，不表達 variant。更複雜的 variant 管理（如參數化單一 skill）列為未來議題。

### 8.7 Skill 製作助手 Loom（FR-7）

Loom 是安裝進成員 AI Agent 的 skill 製作助手，作為貢獻流程的起點；它本身是 hub 內的一個 skill。

- **FR-7.1｜偵測**：Loom 在專案協作中偵測「當前工作可被沈澱為可重用 skill」的時機（依可重用性、重複性等 heuristic）。
- **FR-7.2｜徵詢**：偵測到時**徵詢使用者是否製作**，不擅自動作；使用者可拒絕。
- **FR-7.3｜觸發模式**：**預設主動偵測，但提供關閉 / 調整頻率的開關**；同時支援使用者**手動呼叫**。
- **FR-7.4｜起草**：使用者同意後，Loom 依 hub 格式起草 skill（資料夾結構 + frontmatter + 正文小節），內容取自當前工作脈絡。
- **FR-7.5｜交棒**：Loom 起草後**交棒給既有的 §8.3 檢核（FR-3）與提交流程（FR-2，免 PR）**，不自建一套檢核 / 重疊邏輯。
- **FR-7.6｜單一真實來源**：Loom **只 reference hub 的 spec/schema**（格式 / 欄位 / 白名單 / 檢核規則），不複製；Loom 自身僅定義觸發、啟動、徵詢互動、交棒。
- **FR-7.7｜一鍵開通（bootstrap，職責分離）**：安裝流程（**非 Loom 本身**——見 FR-7.11）透過 `install.sh` **自動 `git clone` hub repo 到指定位置，並自動安裝 hub 內指定的相關 skill**（含自身更新），成員無需逐一手動安裝。若本機已有 clone 則更新（pull）。
  - **FR-7.7.1｜路徑由使用者決定，非硬編碼**：clone 到哪裡由**agent 先問使用者**，取得回答後才作為參數傳給 `install.sh`；使用者沒有偏好時，agent 可提議一個合理預設（如 `~/LoomHub-de`），但**必須先問**，不得默默選定固定路徑。
- **FR-7.8｜權限（起步全開，一處例外）**：內部小團隊完全信任，起步階段 **clone / 裝 skill / push 貢獻皆自動、不設核准閘門**——裝了 Loom 即可讀可寫、立即可貢獻。**唯一例外**：修改使用者的全域 agent 指令檔（見 FR-7.12）永遠需要 agent 先說明理由並徵求確認，不因「起步全開」而略過。未來若需要，可再對 push 加 collaborator 核准閘門（clone/讀仍自動）。
- **FR-7.9｜本機依賴（硬性前置）**：Loom 起草前**硬性要求本機已有 hub repo clone**（通常由 FR-7.7 完成）；若無且無法自動取得，**不起草、直接中止並指示先取得 repo**，不提供退化模式。
- **FR-7.10｜跨廠商**：Loom 作為 hub skill，需可安裝於 Claude Code / Codex / Gemini（同 FR-5.2）。
- **FR-7.11｜Loom 範圍不含 onboarding**：Loom 這個 skill 本身**不負責**問 clone 路徑、問使用哪家 agent、注入全域偵測區塊、或導覽介紹——這些屬於**安裝流程**（由 README 的「給 AI Agent 的安裝指示」引導 agent 執行），不屬於 Loom 的 `SKILL.md` 定義範圍。Loom 只在「偵測候選 → 徵詢 → 使用者同意」之後被呼叫，依 hub 格式起草資產（FR-7.1～7.6）。
- **FR-7.12｜全域主動偵測區塊（持續性偵測機制）**：安裝流程需將一段**固定文字**（定義於 Spec §9.0，範本見 `docs/templates/global-detection-block.md`）注入使用者所選各廠商的**全域**指令檔（`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` / `~/.gemini/GEMINI.md`——每個 session、任何專案下都會載入，區別於 FR-7.1 只在 agent 恰好讀到相關工作時才觸發的偵測）：
  - 注入採**界標包住 + 冪等合併**：`<!-- LoomHub-de:start -->` … `<!-- LoomHub-de:end -->`；界標已存在則取代其間內容，不存在則附加（檔案不存在則建立）。
  - 注入前，agent **必須先向使用者說明為什麼要改這個檔案，並取得明確同意**——不可靜默編輯，也不可只給無說明的是非題。
  - 區塊文字中的 `{{REPO_PATH}}` 需替換為 FR-7.7.1 使用者指定的實際路徑。
  - 區塊文字中的 `{{OWNER_HANDLE}}` 需替換為 FR-7.12.1 使用者親口指定的署名。
- **FR-7.12.1｜安裝時必問署名**：注入全域偵測區塊前，安裝流程**必須先問使用者**「之後在 LoomHub-de 分享資產時要用什麼名稱署名？（如 `@Ty`）」並**等使用者回答**，把答案寫進區塊（`{{OWNER_HANDLE}}`）。**嚴禁**用 OS 使用者名稱、`git config user.name` 或任何自行推斷值代替——這正是署名錯誤（如把 `@Ty` 誤填成 `@cfh00585519`）的根因。此署名成為 Loom 起草時 `owner` 欄的單一真實來源；區塊若缺此值，Loom 起草前需補問。
- **FR-7.13｜安裝後導覽介紹**：全域偵測區塊注入完成後，agent 需給使用者一段**對話式導覽**：LoomHub-de 是什麼、如何瀏覽 / 安裝資產、分享機制如何運作（主動偵測 → Loom 起草 → 自檢 → 直接 commit+push、免 PR）、authoring guide 位置（`docs/authoring/`）。

---

## 9. 非功能需求（NFR）

- **NFR-1｜低維運**：起步方案近乎零維運（無長駐後端 / DB / 搜尋引擎）。
- **NFR-2｜規模**：設計以團隊 8 人、skill 數十至一兩百個為假設；此規模下搜尋 / 瀏覽需即時無感。
- **NFR-3｜可演進**：資料集中於 frontmatter，未來要升級為 web app 或接搜尋引擎時，資料可平滑遷移。
- **NFR-4｜跨廠商**：內容與安裝機制需相容 Claude Code / Codex / Gemini，不綁單一廠商。
- **NFR-5｜可離線閱讀**：目錄頁為靜態，託管於 GitHub Pages，亦可本機開啟。

---

## 10. 成功指標（Success Metrics）

起步階段（前 3 個月）：

- **採用**：≥ 80% 團隊成員（≥ 7/8）至少安裝並使用過一個來自 hub 的 skill。
- **貢獻**：hub 內累積 ≥ 15 個符合規範的 skill，涵蓋 AI / AWS / Azure / ETL / 重構等主要領域。
- **規範遵循**：提交進主線的 skill 100% 通過 AI Agent 檢核流程（提交前自檢）。
- **可發現性**：成員回報「能在 1 分鐘內找到需要的 skill」的滿意度 ≥ 4/5。
- **取代散落**：團隊約定新 skill 一律進 hub，不再散落個人筆記。

---

## 11. 驗收情境（Acceptance Scenarios）

- **AS-1｜貢獻**：工程師新增一個 RAG 建置 skill → 本機請 AI Agent 跑檢核 → 規範通過、歸類為 `development`、掃該類無重疊 → 直接 commit + push → 重建索引後出現在目錄頁（免 PR）。
- **AS-2｜重疊**：工程師新增的 skill 與同類某 skill 高度相似 → 檢核回報相似並要求補上「與 X 的區別 / 適用場景差異」→ 貢獻者補上差異說明後並存收錄（或自行決定改為更新既有 skill 升版）。
- **AS-3｜發現與安裝**：TPM 搜尋 "etl 上線" → 目錄頁即時列出相關 skill → 點入看使用場景與 demo → 複製安裝指令 → 裝進本機 agent 使用。
- **AS-4｜更新**：使用者本機 skill 為 1.2.0，hub 已是 2.0.0 → 更新偵測提示有破壞性更新 → 使用者決定是否升級。
- **AS-5｜跨廠商**：同一個 skill 分別被 Claude Code、Codex、Gemini 使用者安裝，皆能正常辨識使用。
- **AS-6｜Loom 製作**：工程師在做一段重複的 Athena 查詢整理，Loom 偵測到可重用 → 徵詢「要把這變成 skill 嗎？」→ 使用者同意 → Loom 依 hub 格式起草 skill、分類為 `development`、掃該類比對無重疊 → 交棒給 §8.3 檢核 → 通過後直接 commit + push（免 PR）。

---

## 12. 開放問題 / 風險（Open Questions）

| # | 議題 | 現況 / 待決 | 對應 |
|---|---|---|---|
| Q1 | 分類法：`type` 與 `category` 兩維度的確切白名單 | 已定：type=skill/prompt/mcp-server/workflow/tool（RAG/知識庫歸 skill 或 workflow + tags）；category 採通用活動分類=requirements/design/development/testing/ops/docs/research/general（領域字眼放 tags） | FR-1.2 / FR-1.3，Spec §4 |
| Q2 | 跨廠商相容：一個資料夾如何同時滿足 Claude/Codex/Gemini 安裝 | 已定：單一 agentskills.io 標準資料夾 + symlink 至 `.agents/skills`（Codex+Gemini）與 `.claude/skills`（Claude） | FR-1.4 / FR-5.2，ADR-0002 |
| Q3 | 靜態目錄頁託管方式 | 已定：GitHub Pages | NFR-5，ADR-0005 |
| Q4 | 安裝機制 | 已定：symlink（copy 為 fallback）2 目標 | FR-5，ADR-0002 / Spec §6 |
| Q5 | AI Agent 檢核 / 重疊偵測流程的具體 prompt 與步驟 | 已定：`AGENTS.md`（規範硬檢 + 分類優先重疊） | FR-3，ADR-0006 / Spec §5 |
| Q6 | 各類型 skill 是否共用同一套 frontmatter | 已定：共用 8 欄位核心 | FR-1.1，Spec §3.1 |
| Q7 | 「使用者本機自己改了 skill」如何回流 / 同步 | 已定：輕量更新偵測 + 提醒（不自動同步） | FR-6.3 |
| Q8 | 人看內容（使用方式 / 場景 / demo）如何在靜態頁呈現 | 已定：SKILL.md 固定正文小節 → 詳情頁渲染 | FR-1.5 / FR-4.5，Spec §3.2 / §7.2 |
| Q9 | 是否需要中文全文搜尋 | 起步以前端模糊搜尋為主，規模長大再評估 | FR-4.3，NFR-3，ADR-0004 |

---

## 13. 相關文件

1. `01-prd.md` —— 本文件（Vision / 目標 / 功能需求）
2. `02-adr/*.md` —— 關鍵技術決策（repo vs web app、跨廠商相容、frontmatter schema、搜尋方案、版控/發佈、AI 檢核流程）
3. `03-spec.md` —— skill 資料夾結構、frontmatter 欄位規範、分類法、guideline、`AGENTS.md` 檢核清單
4. `authoring/` —— 各類型資源的撰寫指南
