# 撰寫指引 / Authoring Guides

> 這是 LoomHub-de 各 type 撰寫指引的入口，也是**共用規則的單一來源**——frontmatter 8 欄位、
> 貢獻者檢核清單的共用項、Loom 如何使用這些指南、參考連結，都定義在本檔（§3）。五份
> `*-guide.md`（[skill](./skill-guide.md) / [prompt](./prompt-guide.md) / [mcp-server](./mcp-server-guide.md) /
> [workflow](./workflow-guide.md) / [tool](./tool-guide.md)）只放**該 type 專屬**的正文結構要求與範例，
> 開頭皆註明「共用規則見本檔」，不重複維護同一段文字。
>
> **不知道你的東西該分成哪一類？先看下方「§1 決策指引」。** 決定好 type 後，再點 §3.4 對應的
> 指引照著寫該 type 專屬的部分。

分類的規則以本頁為**單一真實來源**——Loom（skill 製作助手）起草時也依本頁判斷,不另複製一套,避免兩邊漂移。

---

## 1. 我該分成哪一類? / Which type is this?

先用一句話認識五種 type:

| type | 一句話 | 誰在對的時機把它拿出來用 | 取用方式 |
|---|---|---|---|
| **`skill`** | 裝進 agent、由 agent **自動載入**的常駐能力 | **Agent**（靠 description 自己判斷） | 安裝（symlink） |
| **`prompt`** | 一段可重用的文字範本,**人手動**複製填空貼上 | 人 | 複製本文 |
| **`mcp-server`** | 可掛載的工具伺服器（設定 + 說明），讓 agent 多出一批工具 | Agent（掛載後） | 安裝 / 啟動 |
| **`workflow`** | 方法論 / 規範,描述「該怎麼做」而非可執行的能力體 | 人（自檢時參照）或 agent（審查時參照） | 複製套用（永遠） |
| **`tool`** | 完全外部、獨立的工具 / CLI / app / 服務,本身非可安裝進 agent 的內容,也非可複製的文字範本 | 人（自行前往使用） | 連結 / 前往 |

### 決策流程（照順序問自己）

```
0. 它是「完全外部、獨立存在的工具 / CLI / app / 服務」——不是要裝進 agent，
   也不是一段給人複製貼上的文字，只是想收藏一個連結供團隊參考嗎？
      （例如一個 npm CLI、桌面 app、託管服務——https://github.com/langchain-ai/openwiki 這類）
   ── 是 ──▶  type: tool
   ── 否 ──▶ 往下

1. 它是「可被 agent 掛載、提供一批工具/資源的伺服器」嗎？
      （例如 Postgres 查詢、GitHub API、內部服務的 MCP server）
   ── 是 ──▶  type: mcp-server
   ── 否 ──▶ 往下

2. 你希望「agent 在對的時機自動用它」，而不是每次人手動貼？
   （裝進 agent、靠 description 觸發、agent 自己決定何時載入）
   ── 是 ──▶ 往 3
   ── 否（就是一段文字，人自己判斷何時複製貼上）──▶  type: prompt

3. 它是在描述「該怎麼做一件事的方法論 / 標準 / 原則」，而不是一個可以被**執行**去產出結果的能力嗎？
   （判斷準則：執行它會不會直接產出一個結果？會 → 它是能力；不會、它只是被拿來參照 / 對照著做 → 它是方法論）
   ── 是（方法論 / 標準——被參照，不被執行）──▶  type: workflow
   ── 否（執行它會直接產出結果——不論內部有幾個步驟）──▶  type: skill
```

一句話版：
- **完全外部、獨立的工具/服務，只是收藏連結** → `tool`
- **要 agent 自動用、執行後產出結果** → `skill`（不論內部步驟多寡）
- **是方法論 / 標準，用來參照、對照著做，本身不被執行** → `workflow`（不論一人或多人）
- **人手動貼的文字** → `prompt`
- **掛載工具伺服器** → `mcp-server`

---

## 2. 分不清楚時怎麼辦? / When it's genuinely ambiguous

**這很正常——`prompt` / `skill` / `workflow` 的界線本來就模糊。** 只有 `skill` 和 `mcp-server` 對 agent runtime 有「機器語意」（agent 真的會讀、會掛載）；`prompt` 和 `workflow` 比較像是**給人組織內容的分類標籤**,agent runtime 並不認得它們。所以:

**別為了「分到絕對正確」卡住。** 我們的收錄原則（見 [ADR-0006](../02-adr/0006-ai-agent-checks.md)、spec §5.2）是：

1. **多數情況允許並存**——同一套「怎麼做 X」的知識,常常可以**同時**有 `prompt` 版（手動貼）和 `skill` 版（裝進去自動用）。這不是重複,是兩種取用方式。
2. **選一個最貼近的,然後把差異補清楚**：
   - `description` 寫清楚「這是什麼、何時用」（agent 和瀏覽者都靠它判斷）
   - `tags` 補足領域與用途（例：`[rag, etl, aws]`）
   - 若和既有資源相似,在正文寫明「與 X 的區別 / 適用場景差異」（檢核流程會提醒你）

**常見模糊案例的建議分法:**

| 你的東西 | 建議 | 為什麼 |
|---|---|---|
| 「幫我審 PR」的一段指令,想讓 agent 每次自動用 | `skill` | 要 agent 自動載入 |
| 同上,但你只想手動複製貼上 | `prompt` | 人決定何時用 |
| 「建 RAG 知識庫」的配方 | `skill`（若是可執行的建置腳本/步驟）或 `workflow`（若是「怎樣才算建得好」的方法論/品質標準），見 spec §4.1 | 執行它會不會直接產出知識庫？會 → skill；只是拿來對照品質的標準 → workflow |
| 一段固定的 prompt 範本（含變數） | `prompt` | 單步、手動填空 |
| 連到某服務、給 agent 一批工具 | `mcp-server` | 掛載工具伺服器 |
| 想收藏一個外部 npm CLI / app / 服務，本身不是文字、也裝不進 agent | `tool` | 只是連結 + 簡述，人自行前往使用 |

> 想更深入理解五者的本質差別（哪條線是「真的」、哪條是分類方便），可問 Loom 或看團隊討論記錄。

---

## 3. 共用規範 / Shared Rules（單一來源）

以下內容適用**所有五種 type**，各 `*-guide.md` 不重複維護，只放連結。

### 3.1 Frontmatter 8 欄位（Spec §3.1）

每個資源的 `SKILL.md` frontmatter 都是這**同一組 8 個必填欄位**——差異只在 `type` 的值與各欄位內容,不是欄位本身：

| 欄位 | 值 / 說明 |
|---|---|
| `name` | kebab-case, ≤ 64 chars, 等於資料夾名 |
| `description` | 做什麼 + 何時用；關鍵字豐富；≤ 1024 chars |
| `type` | `skill` / `prompt` / `mcp-server` / `workflow` / `tool` 之一（見 §1） |
| `category` | `requirements` / `design` / `development` / `testing` / `ops` / `docs` / `research` / `general` 之一（Spec §4.2） |
| `tags` | 自由標籤陣列，小寫 kebab-case（例：`[etl, airflow, oncall]`） |
| `version` | semver，新資源從 `0.1.0` 起 |
| `owner` | 維護對口，例如 `@Ty` |
| `updated` | 今日日期，`YYYY-MM-DD` |
| `source` *(選填)* | 若從外部改編，填原始出處 URL |
| `license` *(選填)* | 若從外部改編，填原授權（如 MIT） |

各型別指引的「Frontmatter」小節只放**該型別的完整範例 frontmatter**（`type` 值 + 貼合該型別的 `category`/`tags`/`description` 寫法），欄位定義本身以本節為準。

### 3.2 貢獻者檢核清單（共用項）

不論哪個 type，提交前都要確認：

- [ ] **Frontmatter：** 8 個必填欄位齊備；`type` 對應正確；`category` 在白名單內；`version` 為合法 semver。
- [ ] **核心三小節：** 正文含「用途 / What」「使用場景 / When」「使用方式 / How」，缺一即不合規（AGENTS.md §5.1 item 6 硬擋）。
- [ ] **命名與路徑：** 資料夾名 = frontmatter 的 `name`，kebab-case；主檔為 `SKILL.md`。
- [ ] **版本 / 日期同步：** 內容有改動 → `version` 依 semver 升版、`updated` 改今日（`node scripts/check-version-bump.mjs` 可輔助檢查）。
- [ ] **重疊偵測：** 同 `category` 內若有相似資源，正文寫明「與 X 的區別 / 適用場景差異」。

型別專屬的檢核項（如 prompt 的「範例輸出必須逐節對應本文」、mcp-server 的「secret 不可寫死」）列在各自指引的「Contributor Checklist」小節，只放**該 type 特有**的項目，不重複上面共用項。

### 3.3 Loom 如何使用這些指南

Loom（`/skills/loom/SKILL.md`）起草任何 type 的資源時：

1. 先依 §1 決策流程判斷 `type`（模糊時依 §2 原則處理，不卡住）。
2. 讀本檔 §3.1 填 frontmatter 共用欄位，讀對應 `*-guide.md` 填該 type 專屬的正文小節與範例。
3. 起草完呼叫既有的 `AGENTS.md` §5 檢核（規範硬檢 + 分類優先重疊偵測），不自建檢核邏輯。

各型別指引末尾的「Loom-Specific Notes」只補充**該 type 起草時特別要注意的一件事**（例如 prompt 的範例輸出保真度、mcp-server 的 secret 安全、workflow 的判斷準則），不重複上述共用流程。

### 3.4 各 type 撰寫指引 / Per-type guides

決定好 type 後，照對應指引寫**該 type 專屬**的部分（結構、必備小節、good/bad 範例）：

- **[skill-guide.md](./skill-guide.md)** — `type: skill`：使用方式=給 agent 的指令、Demo、安裝
- **[prompt-guide.md](./prompt-guide.md)** — `type: prompt`：變數/參數、範例輸出（必須對應本文）、複製取用
- **[mcp-server-guide.md](./mcp-server-guide.md)** — `type: mcp-server`：提供的工具/資源、設定 Config（含 secret 安全）、安裝啟動
- **[workflow-guide.md](./workflow-guide.md)** — `type: workflow`：適用原則 / 各階段標準、前置條件、取用 / 套用（永遠）
- **[tool-guide.md](./tool-guide.md)** — `type: tool`：完全外部的工具/服務，末節為連結 / 前往（非安裝、非複製）

### 3.5 參考連結（共用）

- **Main Spec：** [`/docs/03-spec.md`](../03-spec.md) — §3.1（frontmatter）、§3.2（正文小節共用核心）、§3.2.1（demo 區塊語法）、§3.2.2（各 type 延伸小節）、§4（分類白名單）、§6（安裝機制）。
- **提交前檢核：** [`/AGENTS.md`](../../AGENTS.md) — §5.1 規範硬檢、§5.2 重疊偵測。
- **Schema：** [`/schema/skill.schema.json`](../../schema/skill.schema.json) — frontmatter 的機器可讀定義（白名單/必填欄位的單一真實來源）。
- **Loom：** [`/skills/loom/SKILL.md`](../../skills/loom/SKILL.md) — 起草任何 type 時皆引用本頁 + 對應指引 + schema。

---

## 4. 讓 Loom 幫你 / Let Loom decide

不想自己判斷?**裝了 Loom（[skills/loom](../../skills/loom/SKILL.md)）就能請它幫你**——把你做的東西丟給它,它會依本頁 §1 的決策流程判斷 type、依對應指引起草合規的 `SKILL.md`,再交棒給檢核流程。你只要確認。
