---
name: loom
description: Skill 製作助手——在協作中主動偵測「當前工作可沈澱為可重用 skill」的時機，徵詢使用者後依 hub spec/schema 起草 SKILL.md，再交棒給 §5 檢核並直接 commit + push。起草前需本機已有 hub repo clone（由安裝流程 README 的 AI Agent 安裝指示 + install.sh 完成，非 Loom 自身職責）。當你想把重複性工作變成團隊可共用的 skill 時使用。
type: skill
category: general
tags: [meta, skill-authoring, loom, bootstrap, contribution]
version: 0.3.1
owner: "@Ty"
updated: 2026-07-16
---

## 用途 / What

Loom 是貢獻流程的起點：一個把「當前工作沈澱成可重用 skill」變得無摩擦的助手。它主動偵測可
沈澱的時機、徵詢你、依 hub 的 spec/schema 起草一份合規的 `SKILL.md`，然後交棒給既有的 §5
檢核與提交流程。Loom **不重造格式規則或檢核邏輯**——欄位定義、白名單、檢核規則一律引用 hub
的 `schema/skill.schema.json` 與 spec（§9.4 單一真實來源）。

## 使用場景 / When

- 你剛做完一段重複性、可參數化、或被明確整理成步驟的工作，值得讓團隊重用時。
- 你說出「以後也會這樣做」「這流程每次都一樣」之類的訊號時（Loom 會偵測到並徵詢）。
- 你想手動製作 skill 時（手動呼叫，如 `/make-skill`）。

不適用：一次性、不會再重複的操作；或還沒有本機 hub repo clone 時（見下方硬性前置——Loom 會中止，且**不會自己去 clone**，那是安裝流程的職責，見「安裝 / Install」小節）。

## 使用方式 / How

**觸發（§9.1）**
- **主動偵測（預設開）**：協作中出現候選訊號（重複動作、成形的步驟流程、「以後也這樣做」、
  可參數化的操作序列）時，Loom 視為候選。
- **模式開關**：`off`（完全關閉）／`passive`（僅手動觸發）／`active`（主動偵測，預設）。
- **手動呼叫**：如 `/make-skill`，隨時可主動請 Loom 起草。
- **徵詢（consent）**：偵測到候選時 Loom 簡短徵詢是否製作、說明將產出什麼；你可拒絕，Loom 不擅自動作。

**硬性前置（§9.4）**
- 起草前 Loom **硬性確認本機已有 hub repo clone**，且可讀取 `schema/` 與 `skills/`（通常由
  「安裝 / Install」小節所述的安裝流程 `install.sh` 事先完成——**Loom 自己不 clone**）。**若無且
  無法取得，Loom 不起草、直接中止並指示使用者先走安裝流程取得 repo**——不提供退化 / 半套模式，
  以確保格式與重疊偵測皆以單一真實來源為準。

**起草（§9.2）**
- 你同意後，Loom **讀取本機 clone 的** `schema/skill.schema.json` 與本 spec §3 正文小節規範，據此起草：
  - **先判斷 `type`**：依 `docs/authoring/README.md` §1 的決策流程（掛載工具伺服器→mcp-server；人手動貼的文字→prompt；執行後直接產出結果的能力，不論內部步驟多寡→skill；描述「該怎麼做」的方法論/標準，本身不被執行、只被參照對照著做，不論一人或多人→workflow），選最貼近的一類。模糊時依同文件 §2「多數允許並存、選一個 + 用 tags 補 + description 寫清楚差異」處理，不卡在完美分類。**此判斷規則以 authoring/README 為單一真實來源，Loom 引用、不複製。**
  - 建 `skills/<new-name>/SKILL.md`，填 8 欄位 frontmatter（`version` 起始 `0.1.0`，`owner` = 當前使用者，`updated` = 今日）。
  - 產出「用途 / 使用場景 / 使用方式 / Demo / 安裝」正文小節，內容取自當前工作脈絡。
  - **Demo 以純 Markdown + §3.2.1 約定區塊**（`demo-terminal` / `demo-conversation`）撰寫，取自實際互動；**永不寫 HTML**。
  - 需要時建 `scripts/` / `references/`。
- Loom **先做分類優先重疊偵測**（依 §4.2 判斷 category，只掃該類既有 skill 的 description）。偵測到相似時，提示你在正文寫清楚「與 X 的區別 / 適用場景 / 應用差異」。

**交棒（§9.3）**
- 起草後 Loom **呼叫既有的 §5 檢核流程**（`AGENTS.md`：規範硬檢 + 分類優先重疊偵測），把人類可讀
  結論交給你。不自建一套檢核邏輯。
- 檢核全過後引導你走提交流程——**信任制、免 PR：直接 commit + push 到主線**（起步完全開放、無閘門）。

## Demo / 範例

```demo-conversation
user:（正在第三次手動整理 Athena 查詢的欄位與分區）
agent: 我注意到你重複在做同一種 Athena 查詢整理——要把它沈澱成一個可重用 skill 嗎？我會依 hub 格式起草 SKILL.md、跑分類與重疊檢核，通過後你就能直接 push 分享。
user: 好啊，做吧
result: 已在 skills/athena-query-optimizer/ 起草 SKILL.md（type: prompt, category: development, version 0.1.0）。分類優先重疊偵測：同類無高度重疊。§5 檢核全過。你可以直接 commit + push。
```

```demo-terminal
手動呼叫：
$ /make-skill
Loom：先確認本機 hub repo… 找到 ~/LoomHub-de（可讀 schema/ 與 skills/）✓
Loom：請描述要沈澱的工作，我會讀 schema + spec 起草，不重複格式規則。
```

## 安裝 / Install

> **範圍澄清（v0.3.0）**：本節談的是**如何取得 Loom 這個 skill 檔案本身**——單純的 symlink/copy
> 動作。**完整的 onboarding／bootstrap 流程（clone repo、問使用者裝到哪裡、問使用哪家 agent、
> 注入全域主動偵測區塊、對話式導覽介紹）不是 Loom 的職責**，而是「安裝流程」的職責，由專案
> `README.md` 的「給 AI Agent 的安裝指示」小節引導 agent 執行、`install.sh` 負責其中機械/確定性
> 的部分（clone/pull + 呼叫 `install-skill.mjs`）。Loom 的 `SKILL.md` 只定義 Loom 自身的觸發／
> 起草／交棒（§9.1～9.3）——**不內嵌**上述 onboarding 邏輯，避免職責混淆（Spec §9.0 / PRD FR-7.11）。

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/loom" ~/.agents/skills/loom
# Claude Code
$ ln -s "$PWD/skills/loom" ~/.claude/skills/loom
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/loom ~/.agents/skills/
$ cp -R skills/loom ~/.claude/skills/
```

**完整安裝（含 clone repo + 跨廠商全域偵測）請走 README 的「給 AI Agent 的安裝指示」**，
而不是只做上面的 symlink——那只解決「Loom 這個檔案存在」，不會替你 clone repo 或設定
持續性的主動偵測（那需要改你的**全域**指令檔，Loom 本身不會、也不該擅自做這件事）。
