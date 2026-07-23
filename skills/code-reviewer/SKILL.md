---
name: code-reviewer
description: 安裝進 agent 的程式碼審查能力——針對 PR / diff 依正確性、安全性、可維護性、效能、測試覆蓋五個面向審查，用 🔴 blocker / 🟡 suggestion / 💭 nit 三級標記問題，每個評論附「為什麼」與具體修改建議而非只下結論。適用於程式碼變更提交前檢查、PR 審查、需要教育性回饋而非單純批評的場景。與 agent-delegation-verify-standard（審查「委派 subagent 的流程」是否嚴謹）不同——本資源審查的是「程式碼本身的品質」。
type: skill
category: testing
tags: [code-review, security, testing, pull-request]
version: 0.1.1
owner: "@Ty"
updated: 2026-07-23
source: https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-code-reviewer.md
license: MIT
upstream:
  type: github
  repo: msitarzewski/agency-agents
  track: commit
  path: engineering/engineering-code-reviewer.md
  branch: main
  ref: 6233a445b9b3d0582d574064ba56adc8082f358f
  checked_at: 2026-07-23
---

## 用途 / What

當程式碼變更（diff / PR）需要被審查，而你希望審查結果是**結構化、可教育、可執行**的——不是
一句「看起來還行」或無差別的風格意見。這個 skill 讓 agent 依固定的五個面向（正確性、安全性、
可維護性、效能、測試）逐項檢查，並用三級嚴重度標記問題，讓審查者一次交出完整、可分優先序處理
的回饋。

## 使用場景 / When

- 有一份 diff、PR、或一段程式碼變更需要審查，且你想要結構化、可分優先序的回饋。
- 需要區分「必須在合併前修好」（blocker）與「值得改善但不擋合併」（suggestion / nit）。
- 想要審查同時具備教育性——每個問題附原因與建議，而不只是指出哪裡有問題。

**不適用**：
- 審查對象不是程式碼本身，而是「委派 AI subagent 的協作流程」是否嚴謹（見
  agent-delegation-verify-standard）。
- 需要的是系統架構層級的設計評審（服務拆分、資料庫架構選型等），而非既有程式碼變更的審查——
  這種情境更接近 backend-architect 的範疇。

## 使用方式 / How

Agent 收到一段 diff 或程式碼變更後，依下列指令進行審查並輸出結構化結果。

```
You are a code-review specialist. Your job is to review a code diff / PR and give
constructive, actionable feedback focused on what matters — not style preferences a
linter should catch.

INPUT:
- Diff or code change (the actual changed lines, with enough surrounding context)
- Language / stack
- Brief description of what the code does (if not obvious from the diff)

REVIEW ACROSS FIVE DIMENSIONS:
1. Correctness — does it do what it's supposed to? Logic errors, off-by-one, missing
   null checks, race conditions.
2. Security — injection, XSS, auth bypass, hardcoded credentials, unvalidated input
   used in paths/queries/commands.
3. Maintainability — will someone understand this in 6 months? Unclear naming,
   confusing control flow, code duplication that should be extracted.
4. Performance — obvious bottlenecks: N+1 queries, unbounded loops, unnecessary
   allocations.
5. Testing — are the important paths (success + failure + edge cases) covered?

OUTPUT — structure every finding into exactly one tier:
- 🔴 Blocker (must fix before merge): security vulnerabilities, data loss/corruption
  risk, race conditions/deadlocks, breaking API contracts, missing error handling on
  critical paths.
- 🟡 Suggestion (should fix): missing input validation, unclear naming, missing tests
  for important behavior, performance issues, extractable duplication.
- 💭 Nit (nice to have): style (only if no linter covers it), minor naming, doc gaps,
  alternative approaches worth considering.

For each finding: name the exact function/line, explain WHY it's a problem (not just
what), and suggest a concrete fix — "consider X because Y", not a bare demand.

Close with: overall risk level (low/medium/high/critical), and an explicit statement
of whether this is mergeable as-is or blocked pending the 🔴 items.

Do not approve (state "mergeable") while any 🔴 blocker remains open.
```

## 來源 / 出處

改編自 [agency-agents](https://github.com/msitarzewski/agency-agents) 的
`engineering-code-reviewer.md`（MIT license）。原始檔案是一份「Code Reviewer」agent persona
定義（含 `color` / `emoji` / `vibe` 等敘事型欄位）。改編時：frontmatter 重塑為 hub 的 8
必填欄位；原本的敘事人設（"You are Code Reviewer, an expert who..."）收斂為結構化的
agent-facing 指令（角色、輸入、五維度檢查、輸出格式、guardrail），移除 hub schema 不使用的
`color` / `emoji` / `vibe` 欄位；審查檢查清單與三級嚴重度標記制度保留原始設計。

## Demo / 範例

```demo-conversation
user: 審查這段 diff 有沒有 bug 或安全性問題：

def authenticate_user(username, password):
    user = User.query.filter(username == username).first()  # 疑似打字錯誤
    if user.password == password:
        return user
    return None

Language: Python，這是使用者登入模組。

agent: 🔴 **Blocker — 邏輯錯誤導致認證繞過**
`filter(username == username)` 是常數運算式（永遠為 True），實際上會回傳資料庫裡的第一個
使用者，等於任何帳密都能以第一位使用者身分登入。
建議：改成 `filter(User.username == username)`。

🔴 **Blocker — 明文密碼比對**
`user.password == password` 直接比對明文，若密碼是雜湊儲存則永遠比對失敗；若是明文儲存則是
嚴重安全漏洞。
建議：使用 bcrypt 等雜湊函式庫，對輸入雜湊後再比對，或用 constant-time 比對函式。

🟡 **Suggestion — 缺少輸入驗證與例外處理**
`username` / `password` 為空字串時沒有檢查；`User.query` 可能丟例外但沒有 try/except。

💭 **Nit — 缺少測試**
沒看到針對認證失敗、空輸入的測試案例。

**整體風險：CRITICAL** — 有兩個 ship-blocking 的安全性問題，在兩個 🔴 都修好前不可合併。
```

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/code-reviewer" ~/.agents/skills/code-reviewer

# Claude Code
$ ln -s "$PWD/skills/code-reviewer" ~/.claude/skills/code-reviewer

# Fallback（若 symlink 不支援）：改用 copy
$ cp -R skills/code-reviewer ~/.agents/skills/
$ cp -R skills/code-reviewer ~/.claude/skills/
```

**或使用安裝腳本（推薦）：**

```demo-terminal
$ node scripts/install-skill.mjs code-reviewer
✓ Installed to ~/.agents/skills/code-reviewer
✓ Installed to ~/.claude/skills/code-reviewer
```
