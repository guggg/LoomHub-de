# ADR-0002：跨廠商相容採單一 agentskills.io 標準資料夾 + symlink 安裝

> 狀態：Accepted ｜ 日期：2026-07-09
> 相關：[01-prd](../01-prd.md) FR-1.4 / FR-5.2

## Context

需求要求同一個 skill 從起步就能安裝進 **Claude Code、Codex、Gemini** 三家 agent（見 PRD FR-1.4 / FR-5.2）。

2026-07 的調查結論（見團隊研究記錄）：三家已收斂到同一開放標準 **agentskills.io** 的 `SKILL.md`（YAML frontmatter + Markdown 正文）。差異幾乎只在**安裝路徑**，不在檔案格式：

| 廠商 | User 路徑 | Project 路徑 |
|---|---|---|
| Claude Code | `~/.claude/skills/<name>/` | `.claude/skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` |
| Gemini CLI | `~/.gemini/skills/` 或 `~/.agents/skills/`(alias) | `.gemini/skills/` 或 `.agents/skills/` |

關鍵：**Codex 與 Gemini 都讀共用的 `.agents/skills/`**；Claude Code 官方支援把 skill 目錄 **symlink** 到來源。

## Decision

- **每個 skill 只寫一份符合 agentskills.io 標準的資料夾**，不為各廠商維護 adapter 或副本。
- 提供一支**薄安裝腳本**，用 symlink（copy 作為 fallback）把 skill 連進最多 **2 個目標**：
  - `.agents/skills/<name>` → 同時滿足 **Codex + Gemini**。
  - `.claude/skills/<name>` → 滿足 **Claude Code**（symlink 指向來源）。
- frontmatter 只用**可攜欄位**為主（見 ADR-0003）；廠商專屬欄位（Claude 的 `model`/`context`、Codex 的 `agents/openai.yaml` 等）視需要附加，其他廠商會忽略，不影響相容。

## Consequences

**正面**
- 零內容重複；一次撰寫、三家可用。
- 安裝腳本極薄（2 個 symlink 目標）。
- 內容天然符合開放標準，未來新增相容 agent 幾乎免成本。

**負面 / 取捨**
- symlink 跟隨行為在 Codex / Gemini 未經官方明文保證 → **copy 作為 fallback**，安裝腳本需可選 copy 模式。
- 廠商專屬進階功能（如 Claude 的 `allowed-tools` 精細語法）不保證可攜；為相容性起步從簡或省略。
- 需定期關注三家標準演進（標準仍在發展，`allowed-tools` 標記 experimental）。

## Alternatives considered

- **各廠商各維護一份 adapter / 副本**：內容重複、易漂移、維護成本高。→ 否決（標準已統一，無此必要）。
- **只支援一家、之後再擴充**：與「起步就三家」需求衝突。→ 否決。
