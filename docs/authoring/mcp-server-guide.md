# MCP Server Asset Authoring Guide

**State:** Draft | **Last updated:** 2026-07-17 | **Owner:** DE Team

> **Audience:** Contributors authoring `type: mcp-server` assets, and Loom (skill-authoring assistant) when documenting MCP servers.
>
> **Shared rules live in [`docs/authoring/README.md`](./README.md) §3** (frontmatter 8 fields, common contributor checklist items, how Loom uses these guides, reference links) — this file only covers what's **specific to `type: mcp-server`**: the tools table, the config/security section, and installation/startup.

---

## 1. What Is an MCP Server Asset?

**Definition:** An MCP server asset (`type: mcp-server`) is a **configuration + documentation** for a Model Context Protocol server that agents can mount to gain new tool capabilities. Unlike a `skill` (agent-side instructions), an MCP server is a **separate service** that exposes tools via MCP; the agent calls those tools.

**When to use `type: mcp-server`:**
- You are **wrapping an external service** (database, API, cloud platform) as a tool server so agents can call it.
- The server exposes **concrete tools** (functions the agent can invoke) — e.g., `query_database`, `upload_file`, `describe_resource`.
- Setup requires **configuration** (connection strings, API keys, settings) beyond simple text.
- Multiple team members will want their agents to mount this server.

> For how `mcp-server` differs from `skill` / `prompt` / `workflow`, see [`docs/authoring/README.md`](./README.md) §1.

---

## 2. Required Structure

Every MCP server asset **must follow this section order** in `SKILL.md` (after frontmatter):

1. **用途 / What** — What problem does this MCP server solve? What tools does it expose?
2. **使用場景 / When** — Concrete situations where an agent would mount this server; what it's *not* for.
3. **使用方式 / How** — Brief explanation of how to mount and interact with the server (not the full server setup, just the agent's side).
4. **提供的工具 / 資源** — Table of every tool the server exposes: tool name, parameters, what it does.
5. **設定 / Config** — Connection settings, environment variables, API keys, secrets — and **critical security notes**.
6. **Demo / 範例** — Real or realistic walkthrough showing an agent mounting and using the tools.
7. *(Optional)* **來源 / 出處** — If the server is from an external source and collected into the hub.
8. **安裝 / 啟動** — *Last section*. How to register the server in agent MCP configs and start it.

> ✅ Spec §3.2 / §3.2.2 define core + type-specific sections. This guide elaborates the `mcp-server`-specific ones, especially **§4** (提供的工具 / 資源) and **§5** (設定 / Config), which are the load-bearing sections.

---

## 3. The Problem & Benefit (用途 / What)

Clearly state:
- **What external service does this wrap?** (e.g., "Postgres database," "AWS S3," "Slack workspace").
- **What new tools does the agent gain?** (e.g., "can query the warehouse directly without copy-paste," "can upload files to S3 on behalf of user").
- **Why is this useful?** (e.g., "reduces latency of data fetches," "allows agent to self-service infra queries," "improves document processing workflows").
- **What safety measures are in place?** If relevant (e.g., "read-only mode enforced," "all writes logged").

**Example:**
```markdown
## 用途 / What

This MCP server wraps AWS S3, giving agents the ability to list buckets, upload files, and download objects without needing you to manually transfer files. It's useful for agents that need to:
- Ingest raw data from S3 (CSV, Parquet) for analysis.
- Save processing results back to S3 for your team to review.
- Browse bucket structures to understand what data exists.

**Safety:** All operations are performed using a service account with strict IAM policies (ListBucket, GetObject, PutObject only; no DeleteObject or bucket configuration changes allowed).
```

---

## 4. The Tools List (提供的工具 / 資源) — THE CRITICAL SECTION

**This is where most contributors fail.** Vague descriptions hide missing functionality and make agents uncertain what they can do.

### 4.1 The Rule: Concrete & Complete

You must **list every tool** the server exposes, with:

1. **Tool name** — Exact name the agent will call (e.g., `run_query`, not "query").
2. **Parameters** — Each input parameter: name, type, description, whether optional or required.
3. **Returns** — What the tool returns: type, structure, examples.
4. **What it does** — One-sentence description of purpose.
5. **Constraints** — Any limits (max rows, max query time, allowed statement types, etc.).

### 4.2 BAD Example (Anti-pattern)

| Tool | Purpose |
|---|---|
| `query` | Run database queries |
| `list` | List database objects |

**Why this is bad:**
- No parameter documentation; agent doesn't know what to pass.
- No return type; agent doesn't know what to expect.
- "list database objects" is vague — tables, views, columns, schemas?
- No constraints; agent might accidentally query 1 GB of data.

### 4.3 GOOD Example (Pattern to follow)

| Tool | Parameters | Returns | Purpose | Constraints |
|---|---|---|---|---|
| `list_schemas` | None | `string[]` (array of schema names) | Return all visible schemas in the database | Read-only; no auth checks needed (caller has DB access already) |
| `list_tables` | `schema: string` (required) | `string[]` (array of table names) | List all tables in a given schema | Max 1000 tables returned; read-only |
| `describe_table` | `schema: string` (req), `table: string` (req) | `{ columns: [ { name, type, nullable, description } ], primary_key: string, row_count: int }` | Return the schema, column info, and row count for a table | Read-only; queries are optimized for speed, row_count may be approximate |
| `run_query` | `sql: string` (required), `max_rows: int` (optional, default 1000) | `{ rows: [ { col1, col2, … } ], columns: [{ name, type }], query_time_ms: int }` | Execute a SELECT / EXPLAIN query | Only SELECT and EXPLAIN allowed; INSERT/UPDATE/DELETE/DDL rejected; 5-minute timeout; max 10k rows returned |

**Why this is good:**
- Each tool is named explicitly.
- Parameters are documented: name, type, required vs. optional.
- Return type and structure are clear (including nested objects and arrays).
- Constraints are visible: what's forbidden, what limits apply.

### 4.4 Table Template

```markdown
| Tool | Parameters | Returns | Purpose | Constraints |
|---|---|---|---|---|
| `tool_name` | `param1: type (req/optional, default), param2: type` | `{ field: type }` or `type[]` | One sentence | Max X, no Y, only Z allowed |
| ... | ... | ... | ... | ... |
```

---

## 5. Configuration & Security (設定 / Config)

This section must cover:

1. **Where to add the server config** — Which file? (e.g., `mcp.json`, `claude_desktop_config.json`, agent-specific config).
2. **Example config** — Exact JSON/YAML snippet with all required fields.
3. **Environment variables** — What env vars the server needs (connection string, API key, etc.).
4. **Credentials & secrets** — HOW to provide them safely (**never** write secrets into code).
5. **Security considerations** — What access does the server have? Is it read-only? Are there rate limits?

### 5.1 The Critical Security Rule

**NEVER commit real secrets.** Always use env var placeholders:

```json
❌ WRONG:
"env": {
  "PG_PASSWORD": "super-secret-123"  // DO NOT COMMIT
}

✅ RIGHT:
"env": {
  "PG_PASSWORD": "${PG_PASSWORD}"  // Injected at runtime
}
// Then set: export PG_PASSWORD='...' before running
```

### 5.2 Example (Good Pattern)

```markdown
## 設定 / Config

Add this server to your agent's MCP configuration:

**Claude Code:**
Edit `~/.claude/mcp.json` (or create if missing):

\```json
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
\```

**Codex / Gemini:**
Similar structure in `.agents/mcp.json` or your agent's MCP config file.

### Required Environment Variables

| Variable | Purpose | Example / Notes |
|---|---|---|
| `PG_CONNECTION_STRING` | Postgres connection URI | Use a **read-only user**, not admin. Format: `postgresql://user:password@host:port/db` |
| `PG_PASSWORD` | Password (injected from env) | Run: `export PG_PASSWORD='...'` before starting agent. Never hardcode. |
| `PG_READ_ONLY` | Enable read-only mode | Set to `"true"` to enforce SELECT/EXPLAIN only; server rejects INSERT/UPDATE/DELETE. |
| `PG_MAX_ROWS` | Max rows per query | Default 1000; prevents runaway queries from filling memory. |

### Security Considerations

- **Credentials:** Store `PG_PASSWORD` in your shell profile, 1Password, or another secret manager. Export before starting your agent.
- **Read-only enforcement:** `PG_READ_ONLY=true` + server-side check on statement type. Agent cannot bypass this (even if agent requests DELETE, server rejects it).
- **Rate limits:** Queries timeout after 5 minutes; if agent hits timeout, tell it to simplify or split query.
- **Who can access:** This server runs locally on your machine. Only your agent has access. Do not expose it publicly.
```

---

## 6. Demo / 範例 — Server in Action

Show the agent mounting and using the server's tools.

### 6.1 GOOD Demo (Pattern to follow)

```demo-terminal
$ # Agent with postgres-warehouse server mounted
$ # (Assume config from §5 is in place and server is running)

$ agent> list_schemas()
["public", "analytics", "staging"]

$ agent> list_tables(schema="analytics")
["fct_sales", "dim_product", "dim_customer", "stg_orders"]

$ agent> describe_table(schema="analytics", table="fct_sales")
{
  "columns": [
    { "name": "sale_id", "type": "bigint", "nullable": false, "description": "Primary key" },
    { "name": "product_id", "type": "integer", "nullable": false, "description": "Foreign key to dim_product" },
    { "name": "amount", "type": "decimal", "nullable": false, "description": "Sale amount in USD" },
    { "name": "sale_date", "type": "date", "nullable": false, "description": "Sale date" }
  ],
  "primary_key": "sale_id",
  "row_count": 15234567
}

$ agent> run_query(sql="SELECT product_id, SUM(amount) as revenue FROM analytics.fct_sales WHERE sale_date >= '2026-06-01' GROUP BY 1 ORDER BY revenue DESC LIMIT 5")
{
  "columns": [
    { "name": "product_id", "type": "integer" },
    { "name": "revenue", "type": "numeric" }
  ],
  "rows": [
    { "product_id": 1042, "revenue": 96550.00 },
    { "product_id": 1001, "revenue": 128400.00 },
    { "product_id": 1007, "revenue": 71230.00 },
    { "product_id": 1015, "revenue": 54890.00 },
    { "product_id": 1003, "revenue": 48120.00 }
  ],
  "query_time_ms": 1200
}

$ agent> run_query(sql="DELETE FROM analytics.fct_sales")
ERROR: read-only mode — statement type DELETE is not allowed. Only SELECT and EXPLAIN are permitted.
```

**Why this is good:**
- Shows each tool being called with realistic parameters.
- Shows successful output for each tool.
- Shows a **security win**: DELETE attempt is rejected by the server.
- Readers can trace: "agent called this tool → got this result → can do X with it."

### 6.2 Conversation-Style Demo (Alternative)

```demo-conversation
user: I need to analyze sales by product for June 2026. First, explore the analytics schema for me.

agent: OK. Let me list the tables in analytics schema.
[calls: list_tables(schema="analytics")]
Tables: fct_sales, dim_product, dim_customer, stg_orders

Let me check the fct_sales schema:
[calls: describe_table(schema="analytics", table="fct_sales")]
Columns: sale_id (bigint), product_id (int), amount (decimal), sale_date (date)
Primary key: sale_id
Row count: 15M+

Now let me run the query:
[calls: run_query(sql="SELECT product_id, SUM(amount) as revenue FROM analytics.fct_sales WHERE sale_date >= '2026-06-01' GROUP BY 1 ORDER BY revenue DESC LIMIT 5")]

result: Top 5 products by revenue in June:
- Product 1042: $96,550
- Product 1001: $128,400
- Product 1007: $71,230
```

---

## 7. Source / Attribution (來源 / 出處) — If Applicable

If this MCP server is collected from an external source:

```markdown
## 來源 / 出處

- **Original source:** `https://github.com/example/postgres-mcp` (Open-source Postgres MCP server, MIT licensed)
- **Why we collected it:** Team regularly needs to let agents query the data warehouse; this open-source server is robust and saves us building our own.
- **What we changed:**
  1. Added `PG_READ_ONLY` flag with server-side enforcement to prevent accidental writes.
  2. Included team's connection template (read-only user role, warehouse.internal hostname, row limits).
  3. Wrote this documentation in Chinese and integrated with our hub's install mechanism.
- **License:** MIT (unchanged). Shipped as-is with original LICENSE file. `owner` is hub maintainer (responsible for tracking upstream updates).
```

---

## 8. Installation & Startup (安裝 / 啟動) — Last Section

Explain how to:
1. **Get the server code** (npm install, git clone, etc.).
2. **Configure it** (reference §5, with quick step-by-step).
3. **Start it** (command to run, how to verify it's running).
4. **Integrate with agent** (register in MCP config, restart agent).

### 8.1 GOOD Example

```markdown
## 安裝 / 啟動

### Step 1: Install the Server Package

\```bash
npm install -g @example/postgres-mcp
# or
yarn global add @example/postgres-mcp
\```

### Step 2: Configure Environment

Set the required environment variable:

\```bash
export PG_PASSWORD='your-readonly-password-here'
\```

Store this in your shell profile (`~/.zshrc`, `~/.bashrc`) to persist across sessions. Better yet, use a secret manager (1Password, LastPass, etc.) and export only when needed.

### Step 3: Add to MCP Config

Edit your agent's MCP config file (see §5 for exact path). Add the postgres-warehouse server entry with the config from §5.

### Step 4: Verify Server Starts

\```bash
$ export PG_PASSWORD='...'
$ npx @example/postgres-mcp --check
✔ Connected to warehouse.internal:5432/analytics as readonly_user
✔ Read-only mode ON (write statements will be rejected)
✔ Exposing tools: list_schemas, list_tables, describe_table, run_query
\```

If you see ✔ on all lines, you're ready.

### Step 5: Restart Your Agent

Restart your AI agent (Claude Code / Codex / Gemini) so it reloads the MCP config and discovers the new server.

### Step 6: Test with Agent

Ask your agent: "What tables are in the analytics schema?"
Agent should respond by calling list_tables() and returning the result.
```

---

## 9. Frontmatter Example

**Example frontmatter** (field definitions are shared — see [`README.md`](./README.md) §3.1):
```yaml
---
name: my-mcp-server
description: Read-only Postgres warehouse MCP server exposing list_schemas / list_tables / describe_table / run_query tools, so agents can explore and query the analytics warehouse without manual SQL copy-paste.
type: mcp-server
category: development
tags: [postgres, mcp, database, read-only, warehouse]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-14
---
```

---

## 10. Contributor Checklist (mcp-server-specific)

In addition to the shared checklist ([`README.md`](./README.md) §3.2), verify:

- [ ] **Section order:** 用途 / 使用場景 / 使用方式 / 提供的工具 / Config / Demo / (optional 來源 / 出處) / 安裝 / 啟動.
- [ ] **提供的工具 / 資源:** Table with ALL tools; each has: name, parameters (name + type + required/optional), return type, purpose, constraints.
  - [ ] NO vague descriptions (bad: "query database"; good: "execute SELECT queries, max 10k rows, 5-min timeout").
  - [ ] Constraints are explicit (what's forbidden, what limits exist).
- [ ] **設定 / Config:** Exact config snippets for each vendor (Claude Code, Codex, Gemini); environment variable table; **SECURITY: no hardcoded secrets**.
  - [ ] Secrets use `${ENV_VAR}` placeholders.
  - [ ] Instructions on where/how to set real values.
- [ ] **Demo / 範例:** Shows agent mounting server; calls each tool; shows output. Uses `demo-terminal` or `demo-conversation`.
- [ ] **來源 / 出處** (if applicable): Original URL; why collected; what changes made; license retained.
- [ ] **安裝 / 啟動:** Step-by-step: get code, configure env, add to MCP config, verify, restart agent, test.

---

## 11. Loom-Specific Note

Loom must check §5 (設定 / Config) for security: no hardcoded secrets, env var placeholders only — this is non-negotiable for `mcp-server` drafts. (Shared Loom workflow: [`README.md`](./README.md) §3.3.)

---

## 12. Reference

- **Existing MCP Server Sample:** None currently in the hub — see the structural requirements and frontmatter example above instead.
- Shared references (spec sections, schema, AGENTS.md, Loom): see [`docs/authoring/README.md`](./README.md) §3.5.
