---
name: openwiki
description: 外部 npm CLI（langchain-ai/openwiki），為 codebase 或個人知識庫產生並維護「agent 可讀」的 wiki，透過 `openwiki --update` 讓文件與程式碼保持同步，輸出 Google Open Knowledge Format（OKF）套件。此處僅收錄為團隊指標，不裝進任何 agent。External npm CLI that writes and maintains agent-readable wikis for a codebase or personal knowledge base, kept in sync via `openwiki --update`, emitting Google Open Knowledge Format bundles. Recorded as a pointer; not installed into any agent.
type: tool
category: docs
tags: [docs, cli, external, wiki, agent-docs, okf, 文件, 知識庫, 自動文件]
version: 0.1.1
owner: "@Ty"
updated: 2026-07-24
source: https://github.com/langchain-ai/openwiki
license: check the repo before relying on it beyond personal use
---

## 用途 / What

OpenWiki is an external TypeScript CLI, built by the LangChain team, that generates and
maintains an agent-readable wiki for a repository (**code mode**) or for a personal
knowledge base pulled from connectors like Gmail, Notion, or web search (**personal
mode**). It ingests the codebase or configured sources and synthesizes them into a local
wiki under `openwiki/`, emitting bundles in [Google Open Knowledge Format
(OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
so the docs stay structured and cross-linked. Recording it here so the team knows it
exists as an option when repo documentation drifts from the code.

## 使用場景 / When

Use when a repo's documentation keeps going stale and you want an automated,
agent-friendly wiki instead of hand-maintained docs — especially paired with the
provided CI templates (GitHub Actions / GitLab CI / Bitbucket Pipelines) that auto-open a
PR with doc updates on `openwiki --update`. Also relevant for a personal "second brain"
wiki synthesized from multiple knowledge sources. Not a fit if the team already has a
docs pipeline it's happy with, wants full prose control, or needs docs in a
format other than OKF Markdown.

## 使用方式 / How

Install globally, then run `openwiki --init` in a repo to generate the initial
`openwiki/` docs and configure a model/provider + API key; run `openwiki --update` to
refresh them. `openwiki personal --init` / `--update` do the same for the local personal
brain wiki. See the project's own README for provider setup (OpenAI / Anthropic /
Gemini / Bedrock), connector auth (`openwiki auth slack`, etc.), and CI integration
details — this entry is a pointer, not a re-hosted manual.

## 來源 / 出處

> **中文導讀：** 這是 LangChain 團隊做的**外部 TypeScript CLI**，會為一個 repo（**code 模式**）或個人知識庫（**personal 模式**，串接 Gmail / Notion / 網搜等來源）自動產生並維護一份「agent 可讀」的 wiki，成果放在專案的 `openwiki/` 目錄，並以 Google Open Knowledge Format（OKF）輸出，讓文件保持結構化與交叉連結。適合「文件老是跟不上程式碼」時用——搭配它提供的 CI 範本（GitHub Actions / GitLab CI / Bitbucket）可在 `openwiki --update` 時自動開 PR 更新文件。**它是完全外部、獨立的工具，不裝進 agent、也不複製本文**；此處只是收錄一個指標，完整 provider 設定 / connector / CI 細節請看上游 README。以下正文保留英文原文，方便日後與上游對帳。

- **Project:** https://github.com/langchain-ai/openwiki
- **Maintainer:** LangChain (`langchain-ai`)
- **License:** check the repo before relying on it for anything beyond personal use.

## 連結 / 前往

```demo-terminal
$ npm install -g openwiki
$ openwiki --init
$ openwiki --update
```

前往 https://github.com/langchain-ai/openwiki 看完整 provider 設定、connector 清單與 CI 範本。
