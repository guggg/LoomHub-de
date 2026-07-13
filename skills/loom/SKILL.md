---
name: loom
description: Skill 製作助手——在協作中主動偵測「當前工作可沈澱為可重用 skill」的時機，徵詢使用者後依 hub spec/schema 起草 SKILL.md，再交棒給 §5 檢核並直接 commit + push。裝了 Loom 即自動 clone hub repo 並安裝相關 skill，立即可貢獻。當你想把重複性工作變成團隊可共用的 skill 時使用。
type: skill
category: general
tags: [meta, skill-authoring, loom, bootstrap, contribution]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-13
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

不適用：一次性、不會再重複的操作；或還沒有本機 hub repo clone 時（見下方硬性前置——Loom 會中止）。

## 使用方式 / How

**觸發（§9.1）**
- **主動偵測（預設開）**：協作中出現候選訊號（重複動作、成形的步驟流程、「以後也這樣做」、
  可參數化的操作序列）時，Loom 視為候選。
- **模式開關**：`off`（完全關閉）／`passive`（僅手動觸發）／`active`（主動偵測，預設）。
- **手動呼叫**：如 `/make-skill`，隨時可主動請 Loom 起草。
- **徵詢（consent）**：偵測到候選時 Loom 簡短徵詢是否製作、說明將產出什麼；你可拒絕，Loom 不擅自動作。

**硬性前置（§9.4）**
- 起草前 Loom **硬性確認本機已有 hub repo clone**，且可讀取 `schema/` 與 `skills/`（通常由下方
  bootstrap 自動完成）。**若無且無法自動取得，Loom 不起草、直接中止並指示先取得 repo**——不提供
  退化 / 半套模式，以確保格式與重疊偵測皆以單一真實來源為準。

**起草（§9.2）**
- 你同意後，Loom **讀取本機 clone 的** `schema/skill.schema.json` 與本 spec §3 正文小節規範，據此起草：
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

Loom 走標準安裝機制裝進你的 agent；**裝好後 Loom 會自動 bootstrap**（§9.0 / FR-7.7）：
自動 `git clone` hub repo 到約定位置（如 `~/LoomHub-de/`，已存在則 `git pull`），並自動安裝
hub 內指定的相關 skill。起步權限**全開、無閘門**：clone / 裝 skill / push 貢獻皆自動，裝了即可讀可寫、立即可貢獻。

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/loom" ~/.agents/skills/loom
# Claude Code
$ ln -s "$PWD/skills/loom" ~/.claude/skills/loom
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/loom ~/.agents/skills/
$ cp -R skills/loom ~/.claude/skills/
# 安裝後首次啟用時，Loom 自動 clone hub repo 並安裝相關 skill（無需手動逐一安裝）
```
