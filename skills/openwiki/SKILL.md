---
name: openwiki
description: External npm CLI (langchain-ai/openwiki) that writes and maintains agent-readable wikis for a codebase or a personal knowledge base, keeping docs in sync via `openwiki --update` and emitting Google Open Knowledge Format bundles. Recorded here as a pointer for the team; not installed into any agent.
type: tool
category: docs
tags: [docs, cli, external, wiki, agent-docs, okf]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-22
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
docs pipeline it's happy with, wants full prose control, or needs docs in a to
than OKF Markdown.

## 使用方式 / How

Install globally, then run `openwiki --init` in a repo to generate the initial
`openwiki/` docs and configure a model/provider + API key; run `openwiki --update` to
refresh them. `openwiki personal --init` / `--update` do the same for the local personal
brain wiki. See the project's own README for provider setup (OpenAI / Anthropic /
Gemini / Bedrock), connector auth (`openwiki auth slack`, etc.), and CI integration
details — this entry is a pointer, not a re-hosted manual.

## 來源 / 出處

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
