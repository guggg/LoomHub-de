# 撰寫指引 / Authoring Guides

> 這是 LoomHub-de 各 type 撰寫指引的入口。**不知道你的東西該分成哪一類?先看下方「§1 決策指引」。** 決定好 type 後,再點對應的指引照著寫。

分類的規則以本頁為**單一真實來源**——Loom（skill 製作助手）起草時也依本頁判斷,不另複製一套,避免兩邊漂移。

---

## 1. 我該分成哪一類? / Which type is this?

先用一句話認識四種 type:

| type | 一句話 | 誰在對的時機把它拿出來用 | 取用方式 |
|---|---|---|---|
| **`skill`** | 裝進 agent、由 agent **自動載入**的常駐能力 | **Agent**（靠 description 自己判斷） | 安裝（symlink） |
| **`prompt`** | 一段可重用的文字範本,**人手動**複製填空貼上 | 人 | 複製本文 |
| **`mcp-server`** | 可掛載的工具伺服器（設定 + 說明），讓 agent 多出一批工具 | Agent（掛載後） | 安裝 / 啟動 |
| **`workflow`** | 方法論 / 規範,描述「該怎麼做」而非可執行的能力體 | 人（自檢時參照）或 agent（審查時參照） | 複製套用（永遠） |

### 決策流程（照順序問自己）

```
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

> 想更深入理解四者的本質差別（哪條線是「真的」、哪條是分類方便），可問 Loom 或看團隊討論記錄。

---

## 3. 各 type 撰寫指引 / Per-type guides

決定好 type 後,照對應指引寫（結構、必備小節、good/bad 範例、貢獻者檢核清單都在裡面）:

- **[skill-guide.md](./skill-guide.md)** — `type: skill`：使用方式=給 agent 的指令、Demo、安裝
- **[prompt-guide.md](./prompt-guide.md)** — `type: prompt`：變數/參數、範例輸出（必須對應本文）、複製取用
- **[mcp-server-guide.md](./mcp-server-guide.md)** — `type: mcp-server`：提供的工具/資源、設定 Config（含 secret 安全）、安裝啟動
- **[workflow-guide.md](./workflow-guide.md)** — `type: workflow`：適用原則 / 各階段標準、前置條件、取用 / 套用（永遠）

共通規範見 [03-spec.md](../03-spec.md)：§3.1 frontmatter 8 欄位、§3.2 正文小節、§3.2.1 demo 區塊、§4 分類白名單。提交前檢核見 [AGENTS.md](../../AGENTS.md)。

---

## 4. 讓 Loom 幫你 / Let Loom decide

不想自己判斷?**裝了 Loom（[skills/loom](../../skills/loom/SKILL.md)）就能請它幫你**——把你做的東西丟給它,它會依本頁 §1 的決策流程判斷 type、依對應指引起草合規的 `SKILL.md`,再交棒給檢核流程。你只要確認。
