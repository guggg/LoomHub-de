# LoomHub-de

> 🤖 **你是 AI Agent、剛收到使用者類似「幫我裝 LoomHub-de」+ repo URL 的指令？**
> 請直接跳到下方 **[## 給 AI Agent 的安裝指示 / AI-Facing Install Instructions](#給-ai-agent-的安裝指示--ai-facing-install-instructions)**
> 一節，逐步照做——不要自行翻讀原始碼、猜測安裝範圍，或憑「安裝資源到你的 Agent」小節
> （那節是裝*hub 裡的單個資源*，不是裝*hub 本身*）自行推斷流程。

**Data Engineering 團隊的 AI Agent 能力共享樞紐。** 一個集中的、版本化的資源庫，收錄可被 AI Agent 安裝並直接使用的技能、prompt 模板、MCP 工具伺服器，與描述「該怎麼做」的工作方法論。

> **英文 / English:** LoomHub-de is the DE team's hub for sharing and collecting reusable AI-agent-usable assets (skills, prompts, MCP servers, workflows) in one place.

---

## 快速開始 / Quick Start

### 找資源 / Browse Assets

目錄網站（Catalog）已上線，包含全部可用資源：

**→ [https://guggg.github.io/LoomHub-de/](https://guggg.github.io/LoomHub-de/)**

特徵：
- 🔍 **搜尋** — 按名稱、敘述、標籤快速找資源。
- 🏷️ **篩選** — 按類型（skill / prompt / mcp-server / workflow）、工作類別（development / ops / testing / …）、領域標籤（etl / rag / …）篩選。
- 📋 **詳情** — 點擊卡片查看完整說明、demo、使用方式。
- 📋 **安裝** — 一鍵複製各 agent 的安裝指令（Claude Code / Codex / Gemini）。

### 安裝資源到你的 Agent / Install to Your Agent

找到想用的資源後，使用 **`install-skill.mjs`** 腳本安裝到本機 agent：

```bash
# 安裝單個資源
node scripts/install-skill.mjs <skill-name>

# 例：
node scripts/install-skill.mjs dbt-model-scaffold
# 輸出：
# ✓ Installed to ~/.agents/skills/dbt-model-scaffold
# ✓ Installed to ~/.claude/skills/dbt-model-scaffold
```

如果 script 不可用，手動使用 symlink（詳見各資源頁的安裝指令）。

安裝完後，重啟你的 AI agent（Claude Code / Codex / Gemini）；agent 會自動發現新資源。

### 創作新資源 / Create New Asset

在日常工作中發現可重用的 skill、prompt 或 workflow？**Loom（技能製作助手）** 會主動偵測並引導你標準化成符合 hub 規範的資源：

1. **Loom 偵測** — 協作中出現重複動作、流程化工作時，Loom 會提議「把這個做成 hub 資源嗎？」
2. **同意後起草** — Loom 產出初稿 (`SKILL.md`)，包含必要的結構、frontmatter、demo。
3. **本機檢核** — 對草稿執行自動檢核（§5 of `/docs/03-spec.md`）。通過即可直接提交。
4. **提交** — 執行 `git commit + push` 分享到主線（免 PR；信任制）。

或手動建資源：見 `/docs/authoring/` 的各類型指南。

---

## 給 AI Agent 的安裝指示 / AI-Facing Install Instructions

> **這一節是寫給 AI Agent 看的**：當使用者對你說類似「幫我裝 LoomHub-de」+ repo URL 時，
> 依下列步驟逐一執行。任何專案下都可以進行，不限在 repo 內。機械 / 確定性的部分交給
> `install.sh`（詳見 `docs/03-spec.md` §9.0）；互動、確認、編輯使用者全域檔案的部分由你
> （agent）親自判斷與執行——**不要跳過確認步驟，也不要把整段流程委派給某支腳本**。

**步驟：**

1. **問 clone 路徑**。問使用者：「要把 LoomHub-de clone 到哪裡？」**不要預設固定路徑**；
   若使用者沒有偏好，可以提議一個合理預設（例如 `~/LoomHub-de`），但一定要先問、等回答，
   不能默默選定。把回答記為 `<REPO_PATH>`。

2. **執行 `install.sh`**（機械部分，冪等）：

   ```bash
   ./install.sh <REPO_PATH>
   ```

   這會：不存在則 `git clone`、存在則 `git pull`，然後呼叫既有的
   `node scripts/install-skill.mjs loom` 把 Loom skill 裝進本機 agent 目錄。若指令失敗
   （非 0 exit code），停下來把錯誤訊息告知使用者，不要靜默略過。

3. **問使用哪家 / 哪些 agent**。問使用者：「你用 Claude Code、Codex、還是 Gemini？（可多選）」

4. **對每個選定的廠商，注入全域主動偵測區塊——先說明、再徵求同意、才動手**：

   對應的全域檔案：

   | Agent | 全域檔案路徑 |
   |---|---|
   | Claude Code | `~/.claude/CLAUDE.md` |
   | Codex | `~/.codex/AGENTS.md` |
   | Gemini | `~/.gemini/GEMINI.md` |

   在編輯前，**先用一句話向使用者說明為什麼**，例如：

   > 「我想在 `~/.claude/CLAUDE.md` 加一小段，讓我以後在任何專案的任何 session 都會留意
   > 你的工作是否適合沈澱成 LoomHub-de 資產、並主動問你一句。可以加嗎？」

   使用者同意後，把 **[`docs/templates/global-detection-block.md`](docs/templates/global-detection-block.md)**
   裡的固定文字（`{{REPO_PATH}}` 換成步驟 1 的實際路徑）寫入該檔案。該檔是這段文字的唯一真實
   來源——`docs/03-spec.md` §9.0 也引用同一份，不要各自複製。

   合併規則（**冪等、可重跑**）：
   - 檔案內若已有 `<!-- LoomHub-de:start -->` … `<!-- LoomHub-de:end -->` 界標 →
     **取代**兩個界標之間的內容（更新，不重複新增）。
   - 若無界標 → **附加**到檔尾（檔案不存在就建立）。
   - 絕不覆蓋界標以外、使用者自己寫的其他內容。

5. **給導覽介紹**（對話式、不是貼一大段文件）。用自己的話向使用者說明：
   - LoomHub-de 是什麼——團隊的 AI Agent 資產中心（skill / prompt / mcp-server / workflow）。
   - 怎麼瀏覽 / 安裝資產——目錄網站 + `node scripts/install-skill.mjs <name>`。
   - 分享機制怎麼運作——之後在任何專案協作時，若偵測到值得沈澱的工作會主動問一句；同意後
     Loom 依 hub 格式起草、跑自檢、**直接 commit + push，免 PR**。
   - 怎麼查有沒有更新——hub 更新是拉取式、無主動推播（見 FR-6.2），使用者要自己想到查。
     在本機 clone 裡跑 `node scripts/check-updates.mjs`，會比對已安裝 skill 的版本、列出
     hub 上新出現的資源，也會提醒本機有沒有改動忘了回流。
   - Authoring guide 在哪裡——`docs/authoring/`（依資源類型：prompt / skill / mcp-server / workflow）。

**注意事項（給 agent）：**
- 步驟 1、3、4 都是**互動式**，不可自行假設答案跳過。
- 步驟 4 的「先說明再確認」是硬性要求，即使使用者在步驟 0 已經說了「幫我裝」，那只是同意
  安裝 Loom，**不等於**同意修改他的全域個人設定檔——這兩件事要分開徵求同意。
- `install.sh` 本身不會問問題、不會碰全域檔案——它只做 clone/pull + 呼叫
  `install-skill.mjs`。互動、確認、注入的責任在 agent 身上，不在腳本身上。

---

## 資源結構 / Asset Types

Hub 收錄 4 種資源類型，各有不同的安裝方式與用途：

| 類型 | 是什麼 | 使用方式 | 安裝 |
|---|---|---|---|
| **skill** | Agent 安裝的能力（指令 + demo） | Agent 已裝進去後能直接呼叫 | Symlink 到 agent 目錄 |
| **prompt** | 可複製的 prompt 範本 | 複製、填變數、貼給 agent | 無（純文字） |
| **mcp-server** | 掛在 agent 的工具伺服器 + 設定 | Agent 透過 MCP 呼叫工具 | 註冊到 MCP 設定 + 啟動 server |
| **workflow** | 方法論 / 標準，描述「該怎麼做」而非可執行的能力體 | 人（自檢時參照）或 agent（審查時參照） | 複製套用（永遠，不安裝） |

詳細說明見各類型的 authoring guide。

---

## Repo 結構 / Repository Structure

```
LoomHub-de/
├── README.md                      # 本文件
├── install.sh                     # 安裝流程機械部分：clone/pull + 裝 Loom skill
├── AGENTS.md                      # AI Agent 檢核清單（提交前自檢用）
├── docs/                          # 設計文件 & authoring guide
│   ├── 01-prd.md                  # Vision / 目標 + 功能需求（Product Brief + PRD 合併）
│   ├── 02-adr/                    # 架構決策紀錄
│   ├── 03-spec.md                 # 實作規範（repo 結構、frontmatter、分類、檢核）
│   └── authoring/                 # 各類型 authoring guide
│       ├── prompt-guide.md
│       ├── skill-guide.md
│       ├── mcp-server-guide.md
│       └── workflow-guide.md
├── skills/                        # ★ 所有資源的單一真實來源
│   ├── <resource-name>/
│   │   ├── SKILL.md               # 資源說明、frontmatter、使用方式、demo
│   │   ├── scripts/               # 選用：輔助腳本
│   │   ├── references/            # 選用：參考文件
│   │   └── assets/                # 選用：圖片等
│   └── loom/                      # Loom —— 技能製作助手本身也是 hub 內的 skill
│       └── SKILL.md
├── schema/
│   └── skill.schema.json          # Frontmatter 欄位規範（JSON schema）
├── scripts/                       # Node 工具腳本
│   ├── build-index.mjs            # 掃 skills/ 產生 index.json（目錄用）
│   ├── install-skill.mjs          # 安裝資源到本機 agent
│   └── check-updates.mjs          # 比對本機 vs hub 版本
├── site/                          # Vite + React 靜態目錄頁
│   ├── package.json
│   ├── public/index.json          # 由 build-index 產生
│   └── src/
├── .github/workflows/deploy.yml   # 自動部署到 GitHub Pages
└── package.json
```

---

## 本機開發 / Local Development

### 依賴 / Dependencies

- **Node.js** >= 18
- **npm** or **yarn**
- **git**

### 建置目錄索引 / Build Catalog Index

掃描 `skills/*/SKILL.md` 產生 `site/public/index.json`（目錄頁用）：

```bash
npm run build-index
```

輸出：`site/public/index.json`（包含名稱、敘述、type、category、tags、版本等）。

### 跑目錄頁 / Run the Catalog Site Locally

```bash
cd site
npm install
npm run dev
```

開啟 `http://localhost:5173`；即時看到搜尋、篩選、詳情頁。

### 測試 / Tests

```bash
npm test
```

涵蓋 frontmatter 檢核、semver、檔案結構、duplicate detection、安裝機制、目錄頁渲染等的完整測試套件（跑 `npm test` 看目前總數）。

---

## 貢獻流程 / Contributing

### 新增 / 更新資源

1. **新增資源資料夾**：在 `skills/` 下建 `<skill-name>/` 資料夾（kebab-case）。
2. **寫 `SKILL.md`**：
   - 按 frontmatter 規範填 8 個欄位。
   - 依資源類型（skill / prompt / mcp-server / workflow）按對應 authoring guide 寫內容。
3. **本機檢核**：對新資源執行 AGENTS.md 裡的檢核清單（或用 Loom 自動檢核）。
4. **提交**：`git add + commit + push` 到主線（免 PR；直接 push 且無閘門）。
5. **目錄更新**：CI 自動跑 `build-index` + `vite build` + 部署到 GitHub Pages。

### 檢核清單

在 `/AGENTS.md` 裡；提交前用 AI agent 自檢：

- [ ] Frontmatter：8 欄位齊備、格式正確。
- [ ] `type` 與 `category` 在白名單內。
- [ ] 正文含三核心小節：用途 / 使用場景 / 使用方式。
- [ ] 版本號依 semver 升級；`updated` 是今日日期。
- [ ] 若有修改內容，版本號必升（否則更新偵測失效）。
- [ ] 重疊偵測：同類資源中有無重複（有則補充「與 X 的區別」）。

詳情見 `AGENTS.md` 或 `/docs/03-spec.md` §5。

### 編寫指南 / Authoring Guides

依資源類型選擇對應指南：

- **prompt** → `/docs/authoring/prompt-guide.md`
- **skill** → `/docs/authoring/skill-guide.md`
- **mcp-server** → `/docs/authoring/mcp-server-guide.md`
- **workflow** → `/docs/authoring/workflow-guide.md`

每份指南詳解該類型的結構、demo 寫法、檢核清單。

### 用 Loom 自動起草 / Bootstrap with Loom

> 這裡假設你已經有本機 clone、只想單獨裝 Loom 這個 skill 檔案。若是**第一次**接觸
> LoomHub-de（還沒 clone、想要完整 onboarding：全域主動偵測 + 導覽介紹），請走上方
> 「給 AI Agent 的安裝指示」小節。

安裝 Loom（hub 內的技能製作助手）：

```bash
node scripts/install-skill.mjs loom
# 重啟 agent 後，Loom 自動啟動
```

在協作中提到「把這個做成 hub 資源」時，Loom 會主動：
1. 偵測候選工作（重複動作、流程化操作）。
2. 詢問是否製作（可拒絕）。
3. 起草初稿 `SKILL.md`，包含 frontmatter + 正文結構 + demo。
4. 跑自動檢核；通過即可提交。

---

## 部署 / Deployment

### 靜態網站託管

目錄頁由 GitHub Actions 自動部署：

1. Push 到 `main` 分支。
2. `.github/workflows/deploy.yml` 觸發：
   - 跑 `npm run build-index`（產 `site/public/index.json`）。
   - 跑 `cd site && npm run build`（產靜態 HTML/JS）。
   - 發佈到 GitHub Pages (`guggg.github.io/LoomHub-de/`)。

預計幾分鐘後新資源出現在目錄。

### 主要託管 / Primary Hosting

- **GitHub Pages** — https://guggg.github.io/LoomHub-de/

---

## 版本與更新 / Versioning & Updates

### Semver 規則 / Semver Rules

資源遵循 semantic versioning：

- `x.y.Z` (patch)：修錯字、小修，行為不變。
- `x.Y.z` (minor)：加功能，向後相容。
- `X.y.z` (major)：破壞性變更，舊用法可能失效。

提交前檢查：若資源內容有改動，`version` 須依規則升版。

### 檢查本機更新 / Check for Updates

比對本機安裝的資源版本與 hub 最新版本：

```bash
node scripts/check-updates.mjs
```

輸出有更新的資源 + 更新層級（patch / minor / major）。

---

## 常見問題 / FAQ

**Q: 我發現一個好用的 MCP server / prompt / skill，能加進 hub 嗎？**  
A: 可以。Hub 的核心目的就是「發現 → 蒐集 → 標準化」。新增資源時在 frontmatter 的 `source` 欄填原始出處、`license` 欄填授權，正文補「來源 / 出處」小節說明改了什麼。確認授權允許團隊內使用。

**Q: 我改了安裝在本機的資源，要怎麼回流到 hub？**  
A: Hub 尚無自動同步機制（起步階段）。手動方式：在 hub repo 內編輯資源 → 升版 → `git commit + push`；或走「新增改進版」（fork 概念）。詳見 `/docs/01-prd.md` FR-6.3。

**Q: 我能用 prompt 類型的資源嗎？它不用安裝，只是複製？**  
A: 是的。找到後，詳情頁會提供「複製」按鈕（複製「使用方式」的 prompt 本文）。貼給你的 agent，填好變數即可用。無需 symlink。

**Q: Loom 是什麼？我一定要用它嗎？**  
A: Loom 是協助工具，可選。它在協作中偵測「可成為 hub 資源的工作」並引導你起草。完全手動創作也可以，只要按 authoring guide 寫即可。

**Q: Hub 可以公開分享（給團隊外）嗎？**  
A: 目前是內部。Catalog 網站 GitHub Pages 託管但無登入機制（public），若敏感內容請勿上傳 hub。未來可加權限管理。

---

## 相關文件 / Documentation

- **[01 Product Brief & PRD](docs/01-prd.md)** — Vision、目標、非目標、成功指標、功能需求、使用者故事。
- **[02 ADR（Architecture Decision Records）](docs/02-adr/README.md)** — 架構決策與理由。
- **[03 Spec](docs/03-spec.md)** — Repo 結構、frontmatter、分類、檢核流程、安裝機制。
- **[Authoring Guides](docs/authoring/)** — 各類型資源的撰寫指南。

---

## License

LoomHub-de 本身與範例資源（除另外標明者）遵循 **MIT License**。

蒐集進 hub 的外部資源保留原授權。見各資源的 `license` 欄與「來源 / 出處」小節。

---

## 聯繫與反饋 / Contact & Feedback

- **Issue / Feature Request** — 用 GitHub Issues （按資源名稱或類型標籤）。
- **建議新資源** — 提 Issue 或直接新增（走貢獻流程）。
- **報告問題** — Issue with "bug" label；或 Slack 團隊 #tooling。

---

**Made by the DE Team | 由 DE 團隊製作 | Last updated: 2026-07-14**
