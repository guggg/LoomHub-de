---
name: athena-query-optimizer
description: 一組可重用 prompt，用來診斷並優化 AWS Athena SQL 查詢——找出全表掃描、缺少分區裁剪、低效 JOIN，給出改寫建議與預估掃描量下降。當你的 Athena query 太慢或掃描成本太高時使用。
type: prompt
category: development
tags: [aws, athena, sql, query-optimization, presto]
version: 1.0.1
owner: "@carol"
updated: 2026-07-13
---

## 用途 / What

一組可重用的 prompt 範本，讓 agent 扮演 Athena / Presto 查詢調校顧問：讀入一段 SQL 與（選用的）
表結構 / 分區資訊，診斷效能問題（全表掃描、未用到分區裁剪、SELECT *、低效 JOIN 順序、未壓縮
格式等），並產出可直接套用的改寫版本與預估的掃描量 / 成本下降。

## 使用場景 / When

- 某條 Athena 查詢執行很慢，或 scanned bytes 過高導致成本偏高時。
- 想在把查詢放進 ETL pipeline 前先做一輪效能檢視時。
- 教學 / code review 時想快速指出一段 SQL 的效能反模式時。

不適用：需要實際建置或跑資料管線（用 workflow / skill 類）；或非 Athena/Presto 方言的 SQL。

## 使用方式 / How

1. 觸發：對 agent 說「用 athena-query-optimizer 看這段 SQL」，貼上查詢。
2. 輸入：SQL 查詢；選用：表的分區欄位、資料格式（Parquet/CSV）、大致資料量。
3. 輸出：問題清單（按影響排序）＋改寫後 SQL ＋預估掃描量下降 ＋為何有效的說明。
4. 注意：這是 prompt（診斷 + 建議），不會替你執行查詢；改寫後仍請在小範圍驗證正確性。

## Demo / 範例

```demo-conversation
user: 用 athena-query-optimizer 看這段：SELECT * FROM events WHERE dt = '2026-07-01'
agent: 兩個問題：(1) SELECT * 拉了所有欄位，掃描量偏高；(2) dt 若是分區欄，寫法 OK，但沒限制只取需要的欄位。建議改寫：
result: SELECT user_id, action FROM events WHERE dt = '2026-07-01' — 只取兩欄，預估掃描量下降約 85%（視欄位寬度）。
```

```demo-terminal
貼入查詢後，agent 產出診斷：
[問題 1｜高] SELECT * → 建議只列出需要的欄位（Parquet 為列式儲存，選欄直接降掃描量）
[問題 2｜中] JOIN 大表在前 → 建議小表在前、大表在後以利 broadcast
[改寫] 見上；預估 scanned bytes：4.2 GB → 0.6 GB
```

## 安裝 / Install

先確認本機已 clone hub repo，然後安裝到各家 agent 的 skill 目錄：

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/athena-query-optimizer" ~/.agents/skills/athena-query-optimizer
# Claude Code
$ ln -s "$PWD/skills/athena-query-optimizer" ~/.claude/skills/athena-query-optimizer
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/athena-query-optimizer ~/.agents/skills/
$ cp -R skills/athena-query-optimizer ~/.claude/skills/
```
