# 03 — Spec：LoomHub-de 實作規範

> 狀態：Draft ｜ 最後更新：2026-07-09 ｜ 負責人：DE Team
> 上游：[00-product-brief](./00-product-brief.md)、[01-prd](./01-prd.md)、[02-adr](./02-adr/README.md)

本文件把前述決策落成**可實作的規範**：repo 結構、skill 資料夾結構、frontmatter 欄位、分類白名單、guideline、`AGENTS.md` 檢核清單、工具腳本介面。

---

## 1. Repo 結構

```
LoomHub-de/
├── README.md                  # 專案入口與導覽
├── AGENTS.md                  # commit 前 AI Agent 檢核清單（三家 agent 皆讀）
├── questions.md               # 初始規劃疑問（保留）
├── docs/                      # 設計文件（本目錄）
│   ├── 00-product-brief.md
│   ├── 01-prd.md
│   ├── 02-adr/
│   └── 03-spec.md
├── skills/                    # ★ 所有 skill 的單一真實來源
│   ├── <skill-name>/
│   │   ├── SKILL.md
│   │   ├── scripts/           # 選用
│   │   ├── references/        # 選用
│   │   └── assets/            # 選用
│   └── loom/   # ★ Loom —— 本身即一個 hub skill（§10）
│       └── SKILL.md
├── schema/
│   └── skill.schema.json      # frontmatter 規範（檢核與產目錄共用）
├── scripts/                   # Node 工具腳本
│   ├── build-index.mjs        # 掃 skills/ 產生 index.json
│   ├── install-skill.mjs      # 安裝到本機各家 agent
│   └── check-updates.mjs      # 比對本機與 hub 版本
└── site/                      # Vite + React 靜態目錄頁
    ├── index.html
    ├── package.json
    ├── public/index.json      # 由 build-index 產生
    └── src/
```

---

## 2. Skill 資料夾結構（FR-1）

- **一個資料夾 = 一個 skill**，位於 `skills/<skill-name>/`。
- `<skill-name>` 為小寫、數字、連字號（kebab-case）；**必須等於 frontmatter 的 `name`**（agentskills.io 規則）。
- 進入點 `SKILL.md`（必要）。
- 選用子目錄：`scripts/`（可執行輔助腳本）、`references/`（延伸參考文件）、`assets/`（圖片等）。
- 檔案間以相對路徑引用。

---

## 3. SKILL.md 規範（ADR-0003）

### 3.1 Frontmatter 欄位

| 欄位 | 必填 | 型別 | 規則 |
|---|---|---|---|
| `name` | ✅ | string | kebab-case；**等於資料夾名**；≤ 64 字元 |
| `description` | ✅ | string | 做什麼 + 何時用；關鍵字豐富；≤ 1024 字元 |
| `type` | ✅ | enum | 見 §4.1 白名單 |
| `category` | ✅ | enum | 見 §4.2 白名單 |
| `tags` | ✅ | string[] | 自由標籤；可為空陣列 `[]`；建議小寫 kebab-case |
| `version` | ✅ | string | semver `x.y.z` |
| `owner` | ✅ | string | 維護對口，如 `@handle` |
| `updated` | ✅ | string | `YYYY-MM-DD` |
| `source` | ⬜ | string | **選填**。從外部蒐集/改編而來時，填原始出處 URL；團隊原創可省略 |
| `license` | ⬜ | string | **選填**。外部來源的授權（如 MIT / Apache-2.0 / 原作者條款）；團隊原創可省略 |

- 前兩欄為**標準可攜層**（三家 agent 識別）；其餘為**團隊治理擴充層**，放頂層，其他廠商忽略（ADR-0003）。
- **收錄外部資產（重要情境）**：hub 的核心用途之一是「看到別人做的好東西 → 收進來」。此時 **`owner`** 仍是「hub 內的維護對口」（負責更新的同事），**`source`** 記原始出處、**`license`** 記授權；正文建議加「來源 / 出處」小節（§3.2.2）說明改編了什麼。收錄前請確認授權允許團隊內部使用。
- 廠商專屬欄位（如 Claude 的 `allowed-tools`/`model`）可**選擇性附加**，非必要；為相容性起步從簡。

### 3.2 正文結構（給人看，FR-1.5）

`SKILL.md` 正文（frontmatter 之後）建議固定小節，供目錄頁詳情呈現：

```markdown
## 用途 / What
（這個 skill 解決什麼問題）

## 使用場景 / When
（什麼情況下該用它）

## 使用方式 / How
（agent 如何觸發、輸入輸出、注意事項）

## Demo / 範例
（實際輸入 → 輸出示例；純 Markdown + 下列約定豐富區塊，見 §3.2.1）

## 安裝 / Install
（三家 agent 的安裝指令，見 §6；可由目錄頁一鍵複製）
```

> 檢核（§5）要求「用途 / 使用場景 / 使用方式」三小節至少存在（Demo 建議但不強制硬擋）。

#### 3.2.1 Demo 區塊語法（AI 產內容、模板定長相）

**原則：貢獻者 / 其 AI Agent 只寫 Markdown，永不寫 HTML。** Demo 內容由 AI 在起草時撰寫（涵蓋各 skill 不同情境），但輸出限定為**純 Markdown + 一組約定的 fenced code block**，由網站模板（§7.2.2）統一渲染成一致視覺——如此保住主題層可換皮（§7.4）與全站一致性，AI 仍能自由表達 demo 內容。

支援的區塊（起步集合，可擴充）：

- **一般 Markdown**：程式碼高亮、表格、清單、步驟、`![](…)` 嵌圖片、連結（asciinema / gif / 錄影）。
- ` ```demo-terminal ` —— 終端機樣式的輸入 / 輸出。內容為純文字，`$` 開頭視為指令、其餘為輸出。
- ` ```demo-conversation ` —— 對話逐字稿，渲染成「使用者 → agent → 結果」對話框。約定以 `user:` / `agent:` / `result:` 前綴分行。

> 這些是**約定的 Markdown fence**，不是 HTML；模板負責解析與樣式。未知的 fence 退化為一般程式碼區塊，不會壞版。互動式 / 可執行 demo（如嵌入 iframe）非起步範圍，未來要做時以安全嵌入方式加入，仍不讓貢獻者手寫 HTML。

#### 3.2.2 各 type 建議小節（共用核心 + 依類型補充）

§3.2 的三個核心小節（**用途 / 使用場景 / 使用方式**）為**所有 type 共用且必備**（檢核硬項）。核心之上，各 type 的延伸小節**因 type 而異**——不硬套同一組。尤其**末節的「取用方式」分兩類**：

- **安裝型（skill / mcp-server）**：要裝進 agent 才能用 → 末節為 **安裝**（symlink，見 §6）。
- **取用型（prompt / 純步驟 workflow）**：只是文字，複製拿去用即可 → 末節為 **複製 / 取用**（詳情頁提供一鍵複製本文），**不做 symlink 安裝**。

各 type 建議小節組合（建議、非硬擋；Loom 起草時依 type 帶入對應模板）：

| type | 核心三節之外的延伸小節 | 末節（取用方式） |
|---|---|---|
| `skill` | **Demo / 範例** | **安裝 / Install**（symlink 三家） |
| `prompt` | **變數 / 參數**（可填欄位）、**範例輸出**（實際輸入→輸出）、**模型建議**（若有） | **複製 / 取用**（複製 prompt 本文；無 symlink、通常也不需另立 Demo，範例輸出即示範） |
| `mcp-server` | **提供的工具 / 資源**、**設定 / Config**（連線/env/金鑰） | **安裝 / 啟動**（裝 server + 設定） |
| `workflow` | **步驟總覽**、**前置條件**、**Demo / 範例** | **依內容而定**：帶可裝進 agent 的檔 → **安裝**；純步驟文件 → **取用 / 套用**（複製流程） |

此外，**任何 type 若為外部蒐集而來**（`source` 有值），建議補 **來源 / 出處**（原始連結、原作者、授權、我們改了什麼 / 為何收錄）。

> 核心三節之外的小節皆為 markdown，模板一律照渲染（含 §3.2.1 demo 區塊），不需為 type 寫特別的頁面邏輯——「模板 type-agnostic、內容依 type 而異」。詳情頁依 type 決定末節動作：安裝型給「複製安裝指令」、取用型給「複製本文」（見 §7.2.2）。這些建議小節寫進 guideline（§8）與 Loom 的起草模板（§9.2）。

### 3.3 semver 規則

- `x.y.Z`（修）：修錯字、小修，行為不變。
- `x.Y.z`（次）：加功能，向後相容。
- `X.y.z`（主）：破壞性變更，舊用法可能失效。

---

## 4. 分類白名單（ADR-0003）

以 `schema/skill.schema.json` 為單一定義來源；以下為初始白名單。

### 4.1 `type`（類型 —— 是什麼、怎麼裝）

| 值 | 說明 |
|---|---|
| `skill` | agentskills.io 標準 SKILL.md 能力 |
| `prompt` | 可重用 prompt 範本 |
| `mcp-server` | 可掛載的 MCP 工具伺服器（設定 + 說明） |
| `workflow` | 多步驟 / 多 agent 可重用流程 |

> **註（kb-template 已移除）**：知識庫（RAG）建置類原本有獨立的 `kb-template` type，但它與 `skill` / `workflow` 界線模糊，故併掉。RAG / 知識庫相關資產改歸 `skill`（單一能力）或 `workflow`（多步驟建置流程），並以 `tags: [rag, kb, …]` 標示領域。

### 4.2 `category`（工作活動 / 階段 —— 通用分類）

採**通用的工作活動分類**，而非綁定本團隊當前的領域工作事項（AWS / Azure / ETL / RAG 等領域字眼一律下放到 `tags`，不進 category）。理由：領域會變、專案會換，但「開發 / 設計 / 測試」這類活動階段穩定，且能讓不同 AI Agent 用同一套穩定標準歸類（呼應 §5.2 分類優先的重疊偵測）。

| 值 | 說明 | 範例 skill |
|---|---|---|
| `requirements` | 需求釐清、訪談、規格整理 | 需求訪談引導、PRD 起草 |
| `design` | 系統設計、架構、方案評估 | ADR 起草、架構評審 |
| `development` | 實作、coding、重構 | code 重構流程、CI 設定 |
| `testing` | 測試、驗證、程式審查 | 測試案例產生、code review |
| `ops` | 維運、部署、監控、故障排除 | ETL 上線流程、雲端資源佈建 |
| `docs` | 文件、筆記、知識整理 | 技術文件撰寫、會議記錄整理 |
| `research` | 研究、探索、資料分析 | 技術選型調查、資料探索 |
| `general` | 跨活動 / 通用 | 通用 prompt、共用工具 |

> **分類規則（供 AI 一致歸類）**：一個 skill 歸入其**主要產出對應的活動階段**。例：「幫 RAG 知識庫建置」→ 主要產出是可運作的系統 → `development`（`tags: [rag, ai, knowledge-base]`）；「ETL 上線 SOP」→ 部署維運 → `ops`（`tags: [etl, azure]`）。若橫跨多階段，取**最終交付物**所屬階段。
> 白名單新增值須經團隊討論並更新 schema。`tags`（含領域字眼）自由擴充，不需審批。

---

## 5. AGENTS.md 檢核清單（ADR-0006 / FR-3）

`AGENTS.md` 放 repo 根目錄，內容為給 AI Agent 的 commit 前檢核流程。規範如下。

### 5.1 規範檢核（硬擋 —— 任一不過須修正）

AI Agent 依 `schema/skill.schema.json` 逐項驗證新增 / 修改的 skill：

1. frontmatter 必填 8 欄位齊備。
2. `name` == 資料夾名，且為 kebab-case。
3. `type` ∈ §4.1 白名單；`category` ∈ §4.2 白名單。
4. `version` 為合法 semver。
5. `updated` 為合法日期。
6. 正文含「用途 / 使用場景 / 使用方式」三小節。
7. **版本 / 日期同步**：若此 skill 內容相對 git HEAD 有變更，`version` 必須依 §3.3 規則升版、且 `updated` 須設為今日。（因無 CI 強制，此為自檢重點——漏升版會讓 FR-6.2 的更新偵測失效。）

任一項不過 → 產出問題清單，貢獻者修正後重跑。

### 5.2 重疊偵測（分類優先，輔助）

**不掃全部 skill**（保險但慢且耗 token）。採兩步分類優先法：

1. AI Agent 依 §4.2 **通用分類規則**先判斷新 skill 的 `category`。統一的分類標準讓不同 agent 歸類一致，提高偵測正確率。
2. **只讀取該 `category` 內既有 skill 的 description** 比對，判斷是否重疊。

輸出：

- 是否疑似重疊（是 / 否）
- 若是：同類中最相似的 skill + 相似點
- **處理原則：多數情況允許並存**。偵測到相似時，AI Agent **要求貢獻者在新 skill 的正文明確寫出「與 X 的區別 / 適用場景 / 應用差異」**，寫清楚即可並存；若貢獻者判斷根本是同一件事，則改為更新既有 skill（升版）而非新增。

### 5.3 產出與提交（免 PR）

AI Agent 產出人類可讀檢核結論（規範檢核結果 + 重疊判斷 + 需補充的差異說明），供貢獻者**自檢**。規範項全過、差異說明補齊後，貢獻者**直接 commit + push 到主線**分享 / 更新——不強制 PR / reviewer（信任制，ADR-0006）。

---

## 6. 安裝機制（ADR-0002 / FR-5）

`scripts/install-skill.mjs <skill-name> [--copy] [--project <path>]`

行為：

1. 讀取 `skills/<skill-name>/`，以 `skills-ref validate`（或內建等效檢查）驗證合規。
2. 建立 symlink（預設）或 copy（`--copy`，作為 fallback）到安裝目標：
   - **`~/.agents/skills/<skill-name>`** → 同時滿足 Codex + Gemini。
   - **`~/.claude/skills/<skill-name>`** → 滿足 Claude Code。
   - `--project <path>` 時改裝到該 repo 的 `.agents/skills/` 與 `.claude/skills/`。
3. 選用：`~/.gemini/skills/` 鏡像（若不倚賴 `.agents/` alias）。
4. 處理既有連結 / 名稱衝突（冪等，重跑不重複）。

> symlink 跟隨在 Codex / Gemini 未經官方保證，故提供 `--copy`。

---

## 7. 目錄頁與索引（ADR-0004 / 0005）

### 7.1 `scripts/build-index.mjs`

- 掃描 `skills/*/SKILL.md`，解析 frontmatter。
- 產出 `site/public/index.json`：陣列，每項含
  `{ name, description, type, category, tags, version, owner, updated, path }`。
- 順帶做一次 §5.1 規範檢核，發現不合規印警告（不阻斷產生）。

**重建與部署觸發（釐清「免 CI」的範圍）**：ADR-0006 的「不設 CI」指的是**不設檢核「擋關」**（不用 CI 否決提交），**並非禁止自動部署管線**。目錄頁的重建 / 部署採以下之一（起步擇一即可）：

1. **push 觸發部署（建議）**：Azure Static Web Apps（或 GitHub Pages Action）綁定 repo，push 到主線即自動跑 `build-index` + `vite build` + 發佈。這是**部署管線、非檢核閘門**，與信任制不衝突。
2. **本機 / 排程重建**：由貢獻者 push 前本機跑 `build-index`（納入 §5 檢核步驟），或設一個排程工作定時重建。

> 不論採哪種，`build-index` 產目錄時會再跑一次 §5.1 規範檢核印警告，作為「無閘門」下的最後一道被動品質提醒（FR-3.5）。

### 7.2 `site/`（Vite + React）—— 頁面設計規範

**核心原則：貢獻者不寫任何 HTML。** 只寫 `SKILL.md`；網站是一套**模板**，讀 `index.json`（列表）與 `SKILL.md` 正文（詳情）自動渲染任何 skill。視覺 / logo 為疊在模板上的**主題層**（見 §7.4），與結構分離、可隨時換皮。

站內只有兩層頁面：

#### 7.2.1 落地頁（目錄）—— 搜尋列 + 側邊篩選 + 卡片牆

版面（RWD；窄螢幕篩選收合為頂部抽屜）：

```
┌──────────────────────────────────────────┐
│ [logo] LoomHub-de        [🔍 搜尋…            ] │  ← header（logo 位 = 主題層）
├──────────┬───────────────────────────────┤
│ TYPE     │  ┌─────┐ ┌─────┐ ┌─────┐        │
│ ☐ skill  │  │card │ │card │ │card │        │  ← 卡片牆（responsive grid）
│ ☐ prompt │  └─────┘ └─────┘ └─────┘        │
│ ☐ mcp…   │  ┌─────┐ ┌─────┐ ┌─────┐        │
│ CATEGORY │  │card │ │card │ │card │        │
│ ☐ dev…   │  └─────┘ └─────┘ └─────┘        │
│ TAGS     │                                 │
│ #rag #…  │                                 │
└──────────┴───────────────────────────────┘
```

- **搜尋**（header）：Fuse.js 對 `name` / `description` / `tags` 即時模糊比對，支援拼寫容錯 / 部分比對。
- **側邊篩選**：`type`（多選）、`category`（多選）、`tags`（多選）；與搜尋 AND 疊加；顯示各值命中數。
- **卡片**：每張顯示 `name`（標題）、`description`（截斷）、`type` / `category` 徽章、`tags`、`version`、`owner`。整卡可點 → 詳情頁。
- **空狀態**：無結果時提示調整搜尋 / 篩選。

#### 7.2.2 詳情頁 —— 完整正文 + 安裝

- **標頭 meta**：`name`、`description`、`type` / `category` 徽章、`tags`、`version`、`owner`、`updated`。
- **完整正文**：渲染該 `SKILL.md` 的固定小節（§3.2）——用途 / 使用場景 / 使用方式 / Demo。Markdown → HTML 渲染（含程式碼區塊高亮），並解析 §3.2.1 的 demo 區塊（`demo-terminal` / `demo-conversation`）為對應樣式；未知 fence 退化為一般程式碼區塊。
- **安裝區**：一鍵複製三家（Claude Code / Codex / Gemini）的安裝指令（§6），以分頁 / 並列呈現。
- **原始連結**：提供「在 repo 檢視 SKILL.md」連結。
- **路由**：`/skill/<name>`（hash 或靜態路由，維持純靜態可離線）。

#### 7.2.3 資料流與託管

- 資料來源單一：`index.json`（列表用）+ 各 `SKILL.md`（詳情正文，build 時一併備妥或前端 fetch）。
- **託管**：`vite build` 產出靜態檔，依 ADR-0005 發佈 Azure Static Web Apps（主）/ GitHub Pages（備）；亦可本機開啟。

### 7.4 主題層（視覺 / logo，與結構分離）

- 模板刻意保留**明確的主題接縫**：色彩、字體、間距以 CSS 變數 / theme token 集中管理；logo 放 header 的固定插槽。
- 起步用中性佔位視覺（可讀、可用即可）；**團隊之後提供 logo 與視覺風格時，只改主題層 token 與 logo 檔，不動頁面結構 / 邏輯**。
- 深淺色模式：起步至少確保可讀；正式主題由後續視覺定案。

> 註：使用者已表示 HTML 視覺與 logo 之後另行設計提供 —— 故 MVP 先交付結構 + 中性主題，視覺為可替換層。

### 7.3 `scripts/check-updates.mjs`

- 比對本機已安裝 skill 的 `version` 與 hub 的 `version`。
- 回報：有更新的 skill + 更新層級（主 / 次 / 修）。
- 偵測本機有未回流改動時提醒走貢獻流程（FR-6.3，輕量提醒，不自動同步）。

---

## 8. Guideline（貢獻指南）

放 `README.md` 或獨立 `CONTRIBUTING.md`，涵蓋：

1. 什麼該收 / 不該收（Brief §4）。
2. 如何建一個合格 skill（資料夾結構 §2、frontmatter §3.1、正文小節 §3.2）。
3. 命名規範（kebab-case、name==dirname）。
4. semver 怎麼升（§3.3）。
5. 貢獻流程（改動 skill → 本機 AI 檢核（含分類優先重疊偵測）→ 通過即直接 commit + push → 重建索引）；信任制、免 PR。
6. 分類怎麼選（§4）。

---

## 9. Loom —— Skill 製作助手（ADR-0007 / FR-7）

Loom 是 `skills/loom/` 這個 hub skill，透過標準安裝機制（§6）裝進成員 agent。其 `SKILL.md` 需定義（且**只**定義）以下屬於 Loom 自身的內容：

### 9.0 一鍵開通與權限邊界

- **bootstrap**：安裝 Loom 後，Loom 自動 `git clone` hub repo 到本機約定位置（如 `~/LoomHub-de/`，實際路徑於 Loom skill 內約定；已存在則 `git pull`），並自動安裝 hub 內指定的相關 skill（§6 機制）。成員無需逐一手動裝。
- **權限（起步全開，無閘門）**：內部完全信任，clone / 裝 skill / push 貢獻皆自動，不設核准閘門。未來可對 push 加 collaborator 核准（clone/讀仍自動）。
- 開通路徑：`裝 Loom → 自動 clone + 裝相關 skill → 立即可用、可直接 push 貢獻`。

### 9.1 觸發（Loom 擁有）

- **偵測 heuristic**：在協作中出現下列訊號時視為候選——重複性動作、被明確整理成步驟的流程、使用者說「以後也會這樣做」、可參數化的操作序列等。
- **模式**：預設**主動偵測**；提供關閉 / 調整頻率的設定（例如 `off` / `passive`(僅手動) / `active`）。亦支援**手動呼叫**（如 `/make-skill`）。
- **徵詢**：偵測到候選時，簡短徵詢使用者是否製作，說明將產出什麼；使用者可拒絕，不擅自動作。

### 9.2 起草（Loom 執行，格式來自 spec）

- 使用者同意後，Loom **讀取本機已 clone 的 hub repo** 的 `schema/skill.schema.json` 與正文小節規範（本文件 §3），據此起草：
  - 建立 `skills/<new-name>/SKILL.md`，填入 8 欄位 frontmatter（`version` 起始 `0.1.0`，`owner` = 當前使用者）。
  - 產出「用途 / 使用場景 / 使用方式 / Demo / 安裝」正文小節，內容取自當前工作脈絡。**Demo 以純 Markdown + §3.2.1 約定區塊**（`demo-terminal` / `demo-conversation`）撰寫，取自實際互動脈絡；**不寫 HTML**。
  - 需要時建立 `scripts/` / `references/`。

### 9.3 交棒（Loom 不重造檢核）

- 起草後，Loom **呼叫既有的 §5 檢核流程**（規範檢核 + 分類優先重疊偵測），把結論交給使用者。
- 通過後引導使用者走 §8 / FR-2 提交流程（**免 PR**：直接 commit + push，起步無核准閘門）。

### 9.4 單一真實來源（強制原則）

- Loom 的 `SKILL.md` **不得內嵌或複製** frontmatter 欄位定義、白名單、檢核規則——一律引用 hub 的 `schema/` 與本 spec。
- **硬性前置**：Loom 起草前先確認本機已有 hub repo clone 且可讀取 `schema/` 與 `skills/`（通常由 §9.0 bootstrap 自動完成）。**若無且無法自動取得，Loom 不起草，直接中止並指示先取得 repo**（不提供退化 / 半套模式，以確保格式與重疊偵測皆以單一真實來源為準）。

---

## 10. 雛形交付範圍（MVP）

1. repo 骨架（§1）。
2. `schema/skill.schema.json`。
3. `AGENTS.md`（§5 檢核清單）。
4. 2~3 個**範例 skill**（涵蓋不同 type / category，供展示與測試）。
5. `scripts/build-index.mjs`（產 index.json + 規範檢核）。
6. `site/`（Vite + React 目錄頁：搜尋 / 篩選 / 詳情 / 複製安裝指令）。
7. **Loom skill 骨架** `skills/loom/SKILL.md`（§9：觸發 / 起草 / 交棒 / 單一真實來源原則）。
8. `scripts/install-skill.mjs`（可選，或先文件化指令）。
9. `README.md` + guideline。

> `check-updates.mjs` 與 `install-skill.mjs` 可列為雛形後續，視時間。Loom 起步以 `SKILL.md`（prompt 邏輯）為主，heuristic 可先簡版。
