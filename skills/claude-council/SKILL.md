---
name: claude-council
description: 外部 Claude Code plugin（hex/claude-council），把同一個問題並行丟給多家 AI（Gemini、OpenAI、Grok、Perplexity 的 API，或已登入的 codex / antigravity CLI），並排顯示各家答案再綜合出共識、分歧與建議；支援 --debate 兩輪交叉批判與 --agents 深度分析。適用於架構決策、技術選型、卡關 debug、安全審查等「單一模型偏誤可能誤導你」的場合。此處僅收錄為連結指標，不裝進任何 agent，安裝需自備至少一家 API key 或 codex/antigravity 訂閱。External Claude Code plugin that fans one question out to multiple AI providers in parallel and shows their answers side-by-side with a synthesis of consensus, divergence, and recommendation. Recorded as a pointer; not installed into any agent.
type: tool
category: general
tags: [multi-agent, second-opinion, architecture-decision, code-review, cli, external, claude-code-plugin, 跨模型, 架構決策, 第二意見]
version: 0.1.1
owner: "@Miles"
updated: 2026-07-27
source: https://github.com/hex/claude-council
license: MIT
---

## 用途 / What

claude-council is an external Claude Code **plugin** (not a hub-installable skill) that
fans a single question out to several AI providers in parallel, prints their answers
side-by-side, and then synthesizes consensus, divergence, unique insights, and a
recommendation. Providers are the Gemini, OpenAI, Grok, and Perplexity HTTP APIs, plus
the `codex` and `antigravity` CLIs when they are installed and logged in — the CLI path
means a subscription can stand in for a paid API key.

Two heavier modes are worth knowing about. `--debate` runs a second round in which every
provider sees all the round-1 answers and critiques them, so a weak recommendation gets
challenged by the other vendors rather than surviving unopposed. `--agents` gives each
provider a Claude subagent that grades the reply's quality, asks follow-ups, and reports
blind spots with a confidence rating. Recording the plugin here so the team knows a
cross-vendor second opinion is an option that already exists and works.

## 使用場景 / When

Reach for it when one model's bias could genuinely mislead you and the right call depends
on cross-checking: architecture decisions, framework or database picks, a debugging
dead-end after several failed attempts, build-vs-buy, or a security tradeoff. `--debate`
is the mode that fits a straight "A or B" decision, since it shows whether a position
survives the other vendors' criticism.

Not a fit for questions with a single clear answer, routine implementation, or quick
fixes — the parallel calls cost real tokens and add latency for nothing. Also not a fit
if you have neither an API key for one of the four providers nor a `codex` /
`antigravity` login, since there would be no second vendor to consult.

How this differs from the other `general` assets. `grill-me` also scrutinizes a decision
before you build, but it is a single agent interrogating **your own** plan with Socratic
questions until nothing is left undecided; claude-council instead has several
**different vendors' models** answer the same question independently so you can see where
they diverge. The two compose in sequence — grill-me to surface which decisions are still
open, claude-council to get cross-vendor input on the hard ones. `loom` shares the
category but not the purpose: it drafts new hub assets rather than evaluating a decision.

## 使用方式 / How

Install it as a Claude Code plugin from the author's marketplace, then ask the council a
question with `/claude-council:ask`. Companion commands: `/claude-council:status` reports
which providers are configured and reachable, and `/claude-council:result <job-id>`
fetches an `--async` run. `jq` is a hard prerequisite (`brew install jq` on macOS).

Provider credentials are read from the environment — `GEMINI_API_KEY`, `OPENAI_API_KEY`,
`XAI_API_KEY`, `PERPLEXITY_API_KEY` — and any installed `codex` or `antigravity` CLI is
detected automatically and used with its own subscription auth, no key needed. At least
one provider must resolve or there is nothing to consult. See the project's own README
for the full flag reference, the ~50 `COUNCIL_*` tuning variables, and per-provider model
selection — this entry is a pointer, not a re-hosted manual.

## 來源 / 出處

> **中文導讀：** 這是 hex 做的**外部 Claude Code plugin**，核心價值是「同一個問題同時問多家模型，把答案並排給你看，再整理出共識、分歧與建議」——用來對抗單一模型的偏誤。Provider 可以是 Gemini / OpenAI / Grok / Perplexity 的 API key，也可以是已登入的 `codex` 或 `antigravity` CLI（走訂閱、不用另外買 API key，這是實務上最省的路）。兩個進階模式：`--debate` 讓第二輪每家看到別人的答案後互相批判，適合「A 還是 B」的抉擇；`--agents` 給每家配一個 Claude 子代理做品質評分與盲點分析。**它是完整的 plugin（85 個檔案、含 shell scripts 與 hooks），不是可裝進 agent 的單一 skill**，所以此處只收錄連結、不轉載內容——安裝走它自己的 marketplace。前置條件是 `jq`，以及至少一家 provider 可用。以下正文保留英文原文，方便日後與上游對帳。

- **Project:** https://github.com/hex/claude-council
- **Maintainer:** hex (`https://github.com/hex`)
- **License:** MIT

## 連結 / 前往

```demo-terminal
$ brew install jq
$ /plugin marketplace add hex/claude-marketplace
$ /plugin install claude-council
$ /claude-council:ask "PostgreSQL 還是 MongoDB 適合這個 workload？"
```

前往 https://github.com/hex/claude-council 看完整 flag 清單、provider 設定與 `COUNCIL_*` 環境變數說明。
