# 00 — Product Brief / Vision：LoomHub-de

> 狀態：Draft ｜ 最後更新：2026-07-09 ｜ 負責人：DE Team

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

## 4. 「skill」的定義（本專案範圍）

本 hub 收錄的是**可被 AI Agent 使用或組成**的可重用資產。**不綁定特定廠商**——需相容至少 **Claude Code、Codex、Gemini** 三家的 agent-skill 安裝方式。涵蓋類型（type）：

1. **Agent Skill（`SKILL.md`，type=`skill`）** —— 含正文指令、輔助腳本、參考檔，可安裝進各家 agent 的 skill 目錄被執行。
2. **Prompt 模板（type=`prompt`）** —— 可重用的 prompt 範本。
3. **MCP Server（type=`mcp-server`）** —— 可被 agent 掛載的工具伺服器（設定 + 說明）。
4. **AI Agent Workflow（type=`workflow`）** —— 多步驟 / 多 agent 的可重用流程。

> RAG / 知識庫建置類資產歸入 `skill` 或 `workflow`，以 `tags: [rag, kb, …]` 標示（不另設 kb-template type）。

> 每個 skill 同時有**給 AI 看的部分**（安裝設定、agent 指令）與**給人看的部分**（使用方式、使用場景、demo）。後者會呈現在靜態目錄頁上，實際呈現方式於後續文件規劃。

**明確不收錄**：純給人看、與 AI Agent 無關的 SOP / Runbook；與 AI 無關的一般 code snippet（除非它是某 skill 的附屬腳本）。

---

## 5. 目標（Goals）

- **G1｜集中**：團隊 skill 有唯一、可信的來源，不再散落。
- **G2｜可發現**：任何成員能在數秒內搜尋 / 瀏覽 / 篩選到需要的 skill。
- **G3｜可使用**：找到後能一鍵（或極簡步驟）安裝到本機 agent 使用。
- **G4｜規範一致**：所有 skill 遵循統一的結構與中繼資料規範，品質可信；並提供「如何做出一個合格 skill」的 guideline 輔助貢獻者。
- **G5｜可治理**：貢獻有審核、有版控、有回饋管道，品質能持續維持而非腐化。審核以**貢獻者自己的 AI Agent 依檢核流程 prompt 執行**為主。
- **G6｜防重疊**：新增 skill 時能**偵測與既有 skill 的重疊**——貢獻者的 AI Agent 依審核流程判斷是否重複，並建議「合併 / 取代 / 獨立收錄」。
- **G7｜低貢獻門檻**：透過 skill 製作助手（Loom）主動偵測與引導，讓成員能在日常工作中就地把可重用工作沈澱成合格 skill，而非事後另花力氣。
- **G8｜低維運**：起步方案近乎零維運成本，適合 8 人團隊。

---

## 6. 非目標（Non-Goals）

- ❌ 起步階段不自建 web app 後端 / 資料庫 / 全文搜尋引擎（Elasticsearch）。
- ❌ 不做面向團隊外部 / 公開的 skill 市集（起步僅團隊內部）。
- ❌ 不收錄與 AI Agent 無關的一般文件。

> 註：hub 本身的主要工作是「蒐集 / 分享 / 整理」既有 skill，而非提供通用 skill 生成工具；但為了讓收錄品質一致與降低貢獻門檻，hub **會提供 guideline、檢核流程，以及一個「skill 製作助手（Loom）」輔助貢獻者把日常工作整理成合格 skill**（見 §7.1）。

---

## 7. 方案方向（High-Level Approach）

**Git repo 為單一真實來源 + 自動產生的靜態目錄頁**。

- **一個資料夾 = 一個 skill**（設定/腳本/參考檔 + 給人看的說明）。資料夾需能同時滿足 Claude Code、Codex、Gemini 的安裝方式（跨廠商相容細節見 ADR）。
- 統一 **frontmatter** 規範（8 個必填欄位：name / description / type / category / tags / version[semver] / owner / updated，詳見 Spec §3.1）。
- **檢核靠 AI Agent 而非 CI 硬擋**：repo 內放一份 `AGENTS.md`（或等效檔）寫明「提交前請依序檢查 1… 2… 3…、跑哪些指令」，由貢獻者的 AI Agent 在本機執行檢核流程；同時負責**重疊偵測（分類優先：先歸類再掃該類）**。
- 腳本掃描 frontmatter 產生 `index.json`，靜態目錄頁提供**前端模糊搜尋 + tag 篩選**，並呈現每個 skill 的使用方式 / 場景 / demo（人看）與安裝方式（給 AI）。
- **貢獻採信任制、免 PR**：本機 AI 自檢通過即可直接 commit + push 分享 / 更新，力求無摩擦；起步階段完全信任、不設 push 閘門。版控與歷史由 git 天生提供。
- 回饋走 **GitHub Issues / Discussions**，綁定到各 skill。

### 7.1 Skill 製作助手（Loom）—— 貢獻的起點

Loom 是一個**安裝進每位成員 AI Agent（Claude Code / Codex / Gemini）的 skill 製作助手**，是整個 hub 的「創作入口（on-ramp）」：

- 在任何專案協作中，**主動偵測**「這段工作可被沈澱為可重用 skill」的時機，**徵詢使用者**是否要製作。
- 使用者同意後，啟動製作流程，產出**符合 LoomHub-de 格式**的 skill draft，再交棒給既有的 AI 檢核 + 重疊偵測與提交流程（免 PR：自檢通過即直接 commit + push）。
- **Loom 本身就是 hub 內的一個 skill**（dogfooding）：人人安裝，用 hub 的機制散佈「產生 hub 內容的工具」。

分工原則（單一真實來源）：**格式 / 欄位 / 白名單 / 檢核規則由 hub 的 spec/schema 擁有；Loom 只擁有觸發時機、啟動方式、徵詢互動與交棒方式**——Loom 只 reference spec，不複製格式規則，避免漂移。

> 詳細技術決策見 ADR 系列（02-*）；此處僅定調方向。

---

## 8. 成功指標（Success Metrics）

起步階段（前 3 個月）：

- **採用**：≥ 80% 團隊成員（≥ 7/8）至少安裝並使用過一個來自 hub 的 skill。
- **貢獻**：hub 內累積 ≥ 15 個符合規範的 skill，涵蓋 AI / AWS / Azure / ETL / 重構等主要領域。
- **規範遵循**：提交進主線的 skill 100% 通過 AI Agent 檢核流程（提交前自檢）。
- **可發現性**：成員回報「能在 1 分鐘內找到需要的 skill」的滿意度 ≥ 4/5。
- **取代散落**：團隊約定新 skill 一律進 hub，不再散落個人筆記。

---

## 9. 風險與未決問題（Open Questions）

| # | 議題 | 現況 / 待決 |
|---|---|---|
| Q1 | 分類法：type 與 category 兩維度的確切白名單 | 已定：type=skill/prompt/mcp-server/workflow（RAG/知識庫歸 skill 或 workflow + tags）；category 採通用活動分類=requirements/design/development/testing/ops/docs/research/general（領域字眼放 tags），見 Spec §4 |
| Q2 | 跨廠商相容：一個資料夾如何同時滿足 Claude/Codex/Gemini 安裝 | 已定：單一 agentskills.io 標準資料夾 + symlink 至 `.agents/skills`（Codex+Gemini）與 `.claude/skills`（Claude），見 ADR-0002 |
| Q3 | 靜態目錄頁託管方式 | 已定：Azure Static Web Apps（主）/ GitHub Pages（備），見 ADR-0005 |
| Q4 | 安裝機制 | 已定：symlink（copy 為 fallback）2 目標，見 ADR-0002 / Spec §6 |
| Q5 | AI Agent 檢核 / 重疊偵測流程的具體 prompt 與步驟 | 已定：`AGENTS.md`（規範硬檢 + 分類優先重疊），見 ADR-0006 / Spec §5 |
| Q6 | 各類型 skill 是否共用同一套 frontmatter | 已定：共用 8 欄位核心，見 Spec §3.1 |
| Q7 | 「使用者本機自己改了 skill」如何回流 / 同步 | 已定：輕量更新偵測 + 提醒（不自動同步），見 PRD FR-6.3 |
| Q8 | 人看內容（使用方式 / 場景 / demo）如何在靜態頁呈現 | 已定：SKILL.md 固定正文小節 → 詳情頁渲染，見 Spec §3.2 / §7.2 |
| Q9 | 是否需要中文全文搜尋 | 起步以前端模糊搜尋為主，規模長大再評估（ADR-0004） |

---

## 10. 文件路線圖

1. `00-product-brief.md` —— 本文件（Vision / 定位 / 目標）
2. `01-prd.md` —— 功能需求（貢獻流程、AI 檢核 / 重疊偵測、目錄、搜尋、回饋、版控）
3. `02-adr/*.md` —— 關鍵技術決策（repo vs web app、跨廠商相容、frontmatter schema、搜尋方案、版控/發佈、AI 檢核流程）
4. `03-spec.md` —— skill 資料夾結構、frontmatter 欄位規範、分類法、guideline、`AGENTS.md` 檢核清單
5. **雛形** —— repo 骨架 + 範例 skill + 檢核/產生目錄腳本 + 可跑的瀏覽頁
