import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Databricks Apps serves the app at the domain root, so base is "/" —
// override with VITE_BASE if a deploy target ever mounts it on a subpath
// (GitHub Pages needed "/LoomHub-de/"). Vite injects this into
// import.meta.env.BASE_URL, which the app uses for the logo and the
// index.json / skills.json fetches. Paired with HashRouter the site stays
// purely static — routes live in the URL fragment, so no server rewrites are
// needed (Spec §7.2.2 / §7.2.3, ADR-0005).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
});
