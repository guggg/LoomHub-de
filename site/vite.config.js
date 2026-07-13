import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps all asset + data URLs relative so the built dist/ works
// when opened offline (file://) or served from any subpath (GitHub Pages /
// Azure Static Web Apps). Paired with HashRouter this keeps the site purely
// static — no server rewrites needed (Spec §7.2.2 / §7.2.3).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
