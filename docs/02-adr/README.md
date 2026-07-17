# Architecture Decision Records (ADR)

記錄 LoomHub-de 的關鍵技術決策。每篇一個決策，格式：Context / Decision / Consequences / Alternatives。

| ADR | 主題 | 決策摘要 | 狀態 |
|---|---|---|---|
| [0001](./0001-repo-vs-webapp.md) | 呈現形態 | Git repo + 靜態目錄頁（非 web app） | Accepted |
| [0002](./0002-cross-vendor-compatibility.md) | 跨廠商相容 | 單一 agentskills.io 標準資料夾 + symlink 安裝（`.agents/skills` + `.claude/skills`） | Accepted |
| [0003](./0003-frontmatter-schema.md) | Frontmatter schema | 可攜核心（name/description）+ 團隊治理擴充（type/category/tags/version/owner/updated）；category 為通用活動分類 | Accepted |
| [0004](./0004-search-approach.md) | 搜尋方案 | 前端模糊搜尋（Fuse.js 類）+ index.json（非 Elasticsearch） | Accepted |
| [0005](./0005-catalog-hosting.md) | 目錄頁託管 | 靜態產生 + GitHub Pages，手動/半自動重建（原決策含 Azure 方案，實際僅落地 GitHub Pages，見 ADR 內狀態更新） | Accepted |
| [0006](./0006-ai-agent-checks.md) | AI 檢核 / 重疊偵測 | 本機 AI Agent 依 AGENTS.md 自檢；信任制免 PR；重疊偵測分類優先、允許並存但需寫明差異 | Accepted |
| [0007](./0007-loom-authoring-assistant.md) | Skill 製作助手 Loom | Loom 為 hub skill；只 reference spec、交棒既有檢核；一鍵開通（自動 clone+裝 skill）；起步讀寫全開無閘門 | Accepted |
