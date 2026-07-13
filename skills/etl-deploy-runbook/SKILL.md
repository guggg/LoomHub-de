---
name: etl-deploy-runbook
description: ETL pipeline 上線的多步驟 runbook——前置檢查、部署到 Azure Data Factory、跑 smoke test、監控與 rollback。當你要把一條 ETL pipeline 從 staging 推到 production 時，依此流程逐步執行以降低上線風險。
type: workflow
category: ops
tags: [etl, azure, deployment, data-factory, runbook]
version: 1.1.0
owner: "@bob"
updated: 2026-07-13
---

## 用途 / What

一條可重用的 ETL 上線流程（runbook），把「把 pipeline 推上 production」這件容易出錯、
步驟繁多的工作標準化：上線前置檢查 → 部署到 Azure Data Factory → smoke test → 監控觀察窗
→ 出問題時 rollback。目的是讓任何團隊成員都能一致、低風險地完成上線。

## 使用場景 / When

- 一條 ETL pipeline 在 staging 驗證完成，要推到 production 時。
- 例行的排程 pipeline 有重大變更（來源 schema 改變、新增轉換邏輯）要重新上線時。
- 上線後出狀況需要快速、有序地 rollback 時。

不適用：一次性的手動資料補跑；或還在開發 / 除錯階段的 pipeline（尚未進 staging）。

## 使用方式 / How

1. 觸發：對 agent 說「跑 etl-deploy-runbook 上線 `<pipeline 名稱>`」。
2. 輸入：pipeline 名稱、目標 Data Factory、變更摘要、負責人。
3. agent 逐步引導並在每個關卡要求確認（前置檢查未過不進部署）。
4. 輸出：一份上線紀錄（各步驟結果 + 時間戳 + smoke test 結果），可存檔追溯。
5. 注意：rollback 步驟需事先確認上一個穩定版本的 artifact 仍可取得。

## Demo / 範例

```demo-terminal
$ agent run etl-deploy-runbook --pipeline sales-daily --target adf-prod
[前置檢查] staging 最近一次執行：成功 ✓  來源 schema 無漂移 ✓  已通知 on-call ✓
[部署] 發佈 sales-daily 到 adf-prod… done（version tag: 2026-07-13）
[smoke test] 觸發一次手動執行… 3/3 activity 成功，輸出列數在預期範圍 ✓
[監控] 開啟 30 分鐘觀察窗；如失敗率 > 0 將提示 rollback。
上線完成，紀錄已寫入 runbook-log/sales-daily-20260713.md
```

```demo-conversation
user: 我要把 sales-daily 這條 pipeline 上 prod
agent: 好，跑 etl-deploy-runbook。先做前置檢查：staging 最近一次成功嗎？來源 schema 有沒有漂移？on-call 通知了嗎？
user: 都 OK
result: 前置檢查通過 → 已部署到 adf-prod、smoke test 3/3 通過，現在進 30 分鐘監控窗。若這段期間失敗我會引導你 rollback。
```

## 安裝 / Install

先確認本機已 clone hub repo，然後安裝到各家 agent 的 skill 目錄：

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/etl-deploy-runbook" ~/.agents/skills/etl-deploy-runbook
# Claude Code
$ ln -s "$PWD/skills/etl-deploy-runbook" ~/.claude/skills/etl-deploy-runbook
# 若該 agent 不支援 symlink，改用 copy 作為 fallback
$ cp -R skills/etl-deploy-runbook ~/.agents/skills/
$ cp -R skills/etl-deploy-runbook ~/.claude/skills/
```
