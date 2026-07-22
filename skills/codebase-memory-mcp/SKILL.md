---
name: codebase-memory-mcp
description: Local MCP server (DeusData/codebase-memory-mcp) that indexes a codebase into a persistent tree-sitter knowledge graph — 158 languages, sub-ms structural queries, ~10x fewer tokens than file-by-file grep. Exposes 14+ tools for search, call-graph tracing, architecture overview, git-diff impact analysis, and Cypher-like queries. Single static binary, zero dependencies, 100% local, no telemetry.
type: mcp-server
category: development
tags: [mcp, code-intelligence, knowledge-graph, tree-sitter, code-search, architecture, external]
version: 0.1.0
owner: "@Ty"
updated: 2026-07-22
source: https://github.com/DeusData/codebase-memory-mcp
license: MIT
---

## 用途 / What

codebase-memory-mcp wraps a **local, structural code-analysis engine** as an MCP server.
It parses a repository with tree-sitter (158 languages, enhanced with Hybrid LSP-style
type resolution for 10+ languages) and builds a persistent knowledge graph of functions,
classes, call chains, HTTP routes, and cross-service links, stored locally
(`~/.cache/codebase-memory-mcp/`). The agent gains tools to search, trace call paths,
inspect architecture, map git-diff impact, and run Cypher-like graph queries — replacing
many rounds of grep/Read with a handful of structural queries.

**Why useful:** benchmarked at ~3,400 tokens for 5 structural queries vs. ~412,000 tokens
via file-by-file exploration (~99% reduction); indexes an average repo in milliseconds
and the Linux kernel (28M LOC) in ~3 minutes.

**Safety:** runs 100% locally, no telemetry, no LLM embedded — it is a pure structural
backend; the connected agent is the one translating natural language into graph queries.
All tools shown below are read/query/index-management only; there is no tool that
executes arbitrary shell commands or writes to the source tree.

## 使用場景 / When

Use when an agent needs to understand an unfamiliar or large codebase quickly:
"what calls `ProcessOrder`?", "what's the blast radius of this diff?", "give me the
architecture overview", or when repeated grep/Read cycles are burning excessive tokens on
structural questions. Also useful for dead-code detection and near-duplicate (`SIMILAR_TO`)
detection. Not a fit for editing/refactoring itself (it has no write tools) or for
semantic understanding of business logic beyond what's derivable from code structure.

## 使用方式 / How

Once mounted, the agent calls `index_repository` on first use of a project (auto-sync
keeps it fresh afterward via a background watcher), then queries with tools like
`search_graph`, `trace_path`, `get_architecture`, or `query_graph`. No manual query
language is required from the human — the agent composes the calls.

## 提供的工具 / 資源

### Indexing

| Tool | Parameters | Returns | Purpose | Constraints |
|---|---|---|---|---|
| `index_repository` | project path (implicit/cwd) | index stats | Index a repository into the graph; auto-sync keeps it fresh after | First run on a large repo (e.g. Linux kernel scale) takes minutes |
| `list_projects` | none | `[{ project, nodes, edges }]` | List all indexed projects with node/edge counts | Read-only |
| `delete_project` | `project` | status | Remove a project and all its graph data | Destructive — deletes local graph data for that project only |
| `index_status` | `project` | status | Check indexing status of a project | Read-only |

### Querying

| Tool | Parameters | Returns | Purpose | Constraints |
|---|---|---|---|---|
| `search_graph` | label, `name_pattern` (regex), file pattern, min/max degree, limit/offset | matching nodes | Structured search with pagination | Read-only |
| `trace_path` (alias `trace_call_path`) | `function_name`, `direction` (inbound/outbound), `depth` (1-5) | call chain | BFS traversal of who calls / is called by a function | Depth capped at 5 |
| `detect_changes` | git diff (implicit) | affected symbols + risk classification | Map uncommitted changes to blast radius | Requires a git working tree |
| `query_graph` | Cypher-like read query | rows | Execute read-only graph queries (openCypher read subset) | Read-only; no writes via Cypher |
| `get_graph_schema` | none | node/edge counts, relationship patterns, property defs | Inspect the graph schema — run first | Read-only |
| `get_code_snippet` | qualified function name | source text | Read source code for a function by qualified name | Read-only |
| `get_architecture` | none | languages, packages, entry points, routes, hotspots, clusters | Single-call codebase overview | Read-only |
| `search_code` | pattern | matches | Grep-like text search scoped to indexed files | Read-only |
| `manage_adr` | ADR fields | ADR record | CRUD for Architecture Decision Records, persisted across sessions | Local persistence only |
| `ingest_traces` | runtime trace data | validation result | Validate `HTTP_CALLS` edges against real runtime traces | Optional; for cross-service accuracy |

> Full graph data model (node labels, edge types incl. `CALLS`/`SIMILAR_TO`/`SEMANTICALLY_RELATED`, qualified-name format, supported Cypher subset) is documented in the upstream README — not duplicated here.

## 設定 / Config

No API keys or secrets are required — this is a local binary with no external network
calls (aside from an optional startup update check).

**Claude Code / most MCP clients** — add to `~/.claude.json` (user scope) or project
`.mcp.json`:

```json
{
  "mcpServers": {
    "codebase-memory-mcp": {
      "command": "/path/to/codebase-memory-mcp",
      "args": []
    }
  }
}
```

### Optional Environment Variables

| Variable | Purpose | Notes |
|---|---|---|
| `CBM_DIAGNOSTICS` | Enable diagnostics logging | Set to `1` to write memory/perf trajectory NDJSON to `$TMPDIR` for leak/perf reports; off by default |

### Security Considerations

- **100% local, no telemetry** — code, queries, and environment never leave the machine.
- **No write tools** — every exposed tool above is read/query/index-management; nothing mutates source files.
- **Destructive scope is narrow** — only `delete_project` removes data, and only for the named project's local graph cache.

## Demo / 範例

```demo-conversation
user: What calls ProcessOrder, and is it safe to change its signature?

agent: [calls: trace_path(function_name="ProcessOrder", direction="inbound", depth=3)]
Found 4 callers across order-service and billing-service.

[calls: detect_changes()]
Uncommitted diff touches ProcessOrder's signature — blast radius: 4 call sites,
2 files, risk: medium (crosses a service boundary via HTTP_CALLS edge).

result: Changing the signature affects 4 call sites in 2 files; one caller is in a
different service reached via an HTTP route, so the change needs a coordinated API update.
```

## 來源 / 出處

- **Original source:** https://github.com/DeusData/codebase-memory-mcp (MIT licensed)
- **Why we collected it:** teams repeatedly burn tokens on grep/Read cycles to understand
  unfamiliar codebases; this open-source, zero-dependency structural graph server
  addresses that directly without standing up any infrastructure.
- **What we changed:** nothing — recorded as-is; this hub entry only documents the tools
  and config surface relevant to mounting it. No fork, no modifications.
- **License:** MIT (unchanged).

## 安裝 / 啟動

### Step 1: Install the binary

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

(Windows: see upstream README for the PowerShell installer. Also available via npm,
PyPI, Homebrew, Scoop, Winget, Chocolatey, AUR, or `go install`.)

### Step 2: Add to MCP Config

Use the auto-detecting `install` command (configures Claude Code, Codex, Gemini CLI, and
40+ other supported client surfaces automatically), or add the manual config from §設定
above.

### Step 3: Restart Your Agent

Restart the agent so it reloads the MCP config and discovers the new server.

### Step 4: Test with Agent

Ask the agent to index the current project ("Index this project") and then ask a
structural question ("what calls X?" or "give me the architecture overview").
Verify with `/mcp` — the server should list its tools (14 documented above; upstream
lists 15 including internal coverage-check tooling used by its auto-installed subagents).
