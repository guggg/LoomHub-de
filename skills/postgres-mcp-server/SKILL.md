---
name: postgres-mcp-server
description: 唯讀 Postgres MCP server 設定，讓 agent 能安全查詢資料倉儲——掛上後 agent 多出 list_schemas / list_tables / describe_table / run_query 等工具，且鎖定只允許 SELECT / EXPLAIN，禁止任何寫入或 DDL。適用於讓 AI agent 探索資料表結構、跑分析查詢、debug 資料問題，而不必擔心誤改 production 資料。
type: mcp-server
category: development
tags: [postgres, mcp, database, read-only, warehouse]
version: 0.1.0
owner: "@Ty"
source: https://github.com/example/postgres-mcp
license: MIT
updated: 2026-07-13
---

## 用途 / What

一個掛在 agent 上的 MCP server，提供**唯讀**的資料倉儲查詢能力。它讓 agent 能自己
查 schema、看表結構、跑 SELECT 分析，而不需要人工複製貼上查詢結果。核心安全設計是
**強制唯讀**：連線使用唯讀角色，且 server 端在執行前擋掉任何 `INSERT/UPDATE/DELETE/DDL`，
只放行 `SELECT` 與 `EXPLAIN`，避免 agent 誤傷 production。

## 使用場景 / When

- 想讓 agent 自主探索資料倉儲（有哪些 schema、表、欄位、型別）來回答資料問題。
- Debug 資料異常時，讓 agent 直接跑查詢驗證假設，而非來回貼 SQL 結果。
- 做 ad-hoc 分析、資料剖析（profiling）、產報表前的探索。

不適用：需要寫入 / 建表 / migration 的情境（本 server 刻意封死寫入，請走正規 pipeline）。

## 使用方式 / How

在 agent 的 MCP 設定檔加入下方 server 條目並提供連線 env。啟動後 agent 會自動發現新增
的工具。實務上直接對 agent 說「列出 analytics schema 底下的表」或「查上個月各產品的營收」，
agent 會呼叫對應工具。所有查詢受唯讀角色 + server 端語句白名單雙重保護。

## 提供的工具 / 資源

| 工具 | 作用 |
|---|---|
| `list_schemas` | 列出可見的 schema |
| `list_tables` | 列出指定 schema 下的表 |
| `describe_table` | 回傳某表的欄位、型別、註解 |
| `run_query` | 執行唯讀查詢（僅 `SELECT` / `EXPLAIN`；其餘語句一律拒絕） |

## 設定 / Config

MCP client 設定（例如 `mcp.json` 或各 agent 的等效設定）：

```
{
  "mcpServers": {
    "postgres-warehouse": {
      "command": "npx",
      "args": ["-y", "@example/postgres-mcp"],
      "env": {
        "PG_CONNECTION_STRING": "postgresql://readonly_user:${PG_PASSWORD}@warehouse.internal:5432/analytics",
        "PG_READ_ONLY": "true",
        "PG_MAX_ROWS": "1000"
      }
    }
  }
}
```

- `PG_CONNECTION_STRING`：務必使用**唯讀角色**（如 `readonly_user`）。
- `PG_PASSWORD`：從 secret manager / 環境變數注入，勿寫死。
- `PG_READ_ONLY=true`：開啟 server 端語句白名單。
- `PG_MAX_ROWS`：單次查詢回傳上限，避免拉爆 context。

## 安裝 / 啟動

```demo-terminal
# 先把 skill 裝進 agent（見下方 Install），再測試 server 能否啟動
$ export PG_PASSWORD='***'
$ npx -y @example/postgres-mcp --check
✔ connected to warehouse.internal:5432/analytics as readonly_user
✔ read-only mode ON (write statements will be rejected)
✔ exposing tools: list_schemas, list_tables, describe_table, run_query
```

## Demo / 範例

```demo-terminal
$ # agent 已掛上 postgres-warehouse server 後的一次互動
agent> list_tables(schema="analytics")
["fct_sales", "dim_product", "dim_customer", "stg_orders"]
agent> run_query(sql="SELECT product_id, SUM(amount) rev FROM analytics.fct_sales WHERE month='2026-06' GROUP BY 1 ORDER BY rev DESC LIMIT 3")
product_id | rev
P-1001     | 128400
P-1042     | 96550
P-1007     | 71230
agent> run_query(sql="DELETE FROM analytics.fct_sales")
ERROR: read-only mode — statement type DELETE is not allowed
```

## 來源 / 出處

- **原始出處**：`https://github.com/example/postgres-mcp`（開源 Postgres MCP server，MIT 授權）。
- **收錄原因**：團隊常需要讓 agent 探索資料倉儲，這個開源 server 現成好用，直接收進 hub 省得重造。
- **我們改了什麼**：
  1. 預設**鎖定唯讀**——加上 `PG_READ_ONLY` 開關與 server 端語句白名單，非 `SELECT/EXPLAIN` 一律拒絕（原版允許任意 SQL）。
  2. 附上團隊的**連線設定範本**（`readonly_user` 角色、`warehouse.internal`、`PG_MAX_ROWS` 上限）。
  3. 補上這份中文 SKILL.md 與安裝 / 啟動說明，接上 hub 的安裝機制。
- **授權**：MIT，允許團隊內部使用與修改；沿用原始 LICENSE。`owner` 為 hub 內維護對口（負責追上游更新）。

## 安裝 / Install

```demo-terminal
# Codex + Gemini（共用 ~/.agents/skills）
$ ln -s "$PWD/skills/postgres-mcp-server" ~/.agents/skills/postgres-mcp-server
# Claude Code
$ ln -s "$PWD/skills/postgres-mcp-server" ~/.claude/skills/postgres-mcp-server
# 若該 agent 不支援 symlink，改用 copy 作為 fallback（兩處都裝）
$ cp -R skills/postgres-mcp-server ~/.agents/skills/
$ cp -R skills/postgres-mcp-server ~/.claude/skills/
```
