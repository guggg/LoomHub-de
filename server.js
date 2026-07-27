import express from "express";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Databricks Apps assigns the port via DATABRICKS_APP_PORT and expects the
// process to listen on 0.0.0.0 — binding to localhost makes the app
// unreachable from the platform's proxy.
const PORT = process.env.DATABRICKS_APP_PORT ?? process.env.PORT ?? 8000;
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "site", "dist");

const app = express();
app.use(express.static(DIST));

// HashRouter keeps all routes in the URL fragment, so the only server-side
// route needed is the index itself (Spec §7.2.3 / ADR-0005).
app.get("*", (_req, res) => res.sendFile(join(DIST, "index.html")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LoomHub-de catalog listening on ${PORT}`);
});
