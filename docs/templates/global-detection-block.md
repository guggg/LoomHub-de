# 全域偵測區塊範本 / Global Detection Block Template

> **這是唯一真實來源。** `README.md`（給 AI Agent 的安裝指示）與 `docs/03-spec.md`（§9.0）皆引用
> 本檔，不再各自逐字複製這段文字。若要調整區塊文字，只改這裡。
>
> 用途：安裝流程（見 `README.md` 的「給 AI Agent 的安裝指示」一節、Spec §9.0）把下方文字注入使用者
> 所選各廠商的**全域**指令檔（`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` / `~/.gemini/GEMINI.md`），
> 讓 agent 在任何專案的任何 session 都主動留意可沈澱成 hub 資產的工作。
>
> `{{REPO_PATH}}` 與 `{{OWNER_HANDLE}}` 為變數 placeholder：注入時 `{{REPO_PATH}}` 換成使用者實際的
> 本機 clone 路徑，`{{OWNER_HANDLE}}` 換成使用者在安裝時**親口指定**的署名（如 `@Ty`）——安裝流程
> **必須先問使用者要用什麼名稱署名、等到回答**，不可從 OS 使用者名稱或 git config 自行推斷。文字其餘
> 部分逐字使用，不改寫用語。合併規則（界標冪等）見引用處的說明，本檔只放文字本身。

```markdown
<!-- LoomHub-de:start -->
## LoomHub-de — skill 沈澱提醒

LoomHub-de 是團隊的 AI Agent 資產中心（skill / prompt / mcp-server / workflow）。
本機 repo 路徑：{{REPO_PATH}}
我在 LoomHub-de 分享資產時的署名（`owner` 欄一律填這個，切勿改用 OS 使用者名稱或自行猜測）：{{OWNER_HANDLE}}

在與我協作的過程中，若察覺當前工作**可能值得沈澱成可重用資產**——出現這些訊號時：
- 同一類操作重複做了幾次
- 我把某流程明確整理成步驟
- 我說「以後也會這樣做」「每次都要這樣」之類的話
- 一段可參數化、可重用的指令 / 查詢 / 流程

——請**主動、簡短地**問我一句：「這個要不要沈澱成 LoomHub-de 資產？」
若我同意，讀取 {{REPO_PATH}}/skills/loom/SKILL.md 並依它起草（Loom 會去讀 repo 內的
格式與檢核規則）。若我拒絕或說現在不要，就別再追問，繼續原本的工作。

原則：偵測是背景留意，不是打斷。不確定時傾向不問。
<!-- LoomHub-de:end -->
```
