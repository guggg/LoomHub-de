---
name: build-rag-knowledge-base
description: 為新資料源建立 RAG 知識庫的標準流程與 prompt 模板——切塊、嵌入、寫入向量庫、驗證檢索品質。當你要把一批文件 / 資料表沈澱成可被 agent 檢索的知識庫時使用。
type: kb-template
category: development
tags: [rag, ai, knowledge-base, embedding, vector-db]
version: 1.0.0
owner: "@alice"
updated: 2026-07-13
---

## 用途 / What

把一批原始資料源（Markdown 文件、Confluence 匯出、資料表 schema、runbook 等）建成一個可被
AI agent 檢索的 RAG 知識庫。此 skill 提供固定的建置流程與 prompt 模板：資料清理 → 切塊
（chunking）→ 產生 embedding → 寫入向量庫 → 檢索品質驗證，讓每次建 KB 的結果一致、可重跑。

## 使用場景 / When

- 有新的資料源（如一個新專案的技術文件夾）要讓團隊 agent 能問答時。
- 既有知識庫檢索品質不佳，需要重新切塊 / 調整 embedding 策略時。
- 要為某個領域（如 ETL runbook、資料字典）建立專屬問答 agent 的底層知識時。

不適用：只是要跑一次性的資料查詢（用 `athena-query-optimizer`）；或要把上線流程文件化成
SOP（那屬於 `ops`）。

## 使用方式 / How

1. 準備資料源目錄，agent 讀取本 skill 的 `references/chunking-guide.md`（若提供）決定切塊策略。
2. 觸發：對 agent 說「用 build-rag-knowledge-base 為 `<資料源路徑>` 建 KB」。
3. 輸入：資料源路徑、目標向量庫連線、embedding 模型名稱。
4. 輸出：寫入向量庫的 chunks + 一份檢索品質報告（抽樣 query → 命中率 / 相關度）。
5. 注意：切塊大小與 overlap 會顯著影響檢索品質；預設 512 token / 64 overlap，可依資料調整。

## Demo / 範例

```demo-terminal
$ agent run build-rag-knowledge-base --source ./docs/etl-runbooks --collection etl-kb
[1/4] 清理與載入 42 份文件…
[2/4] 切塊：842 chunks（512 token / 64 overlap）
[3/4] 產生 embedding（text-embedding-3-large）… done
[4/4] 寫入向量庫 collection=etl-kb
檢索品質抽樣（10 條 query）：命中率 9/10，平均相關度 0.81
KB 建置完成。
```

```demo-conversation
user: 幫我把 ./docs/etl-runbooks 建成一個可以問答的知識庫
agent: 我會用 build-rag-knowledge-base 流程：切塊 → embedding → 寫入 etl-kb collection，完成後給你一份檢索品質報告。要用預設 512/64 切塊嗎？
user: 好
result: 已建立 842 chunks，抽樣命中率 9/10。你現在可以對 etl-kb 提問了。
```

## 安裝 / Install

先確認本機已 clone hub repo，然後安裝到各家 agent 的 skill 目錄：

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/build-rag-knowledge-base" ~/.agents/skills/build-rag-knowledge-base
# Claude Code
$ ln -s "$PWD/skills/build-rag-knowledge-base" ~/.claude/skills/build-rag-knowledge-base
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/build-rag-knowledge-base ~/.agents/skills/
$ cp -R skills/build-rag-knowledge-base ~/.claude/skills/
```
