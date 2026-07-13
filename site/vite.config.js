import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "/LoomHub-de/" matches the GitHub Pages project-repo URL
// (https://<user>.github.io/LoomHub-de/). Vite injects this into
// import.meta.env.BASE_URL, which the app uses for the logo and the
// index.json / skills.json fetches, so all assets + data resolve under the
// subpath. Paired with HashRouter this keeps the site purely static — routes
// live in the URL fragment, so no server rewrites are needed (Spec §7.2.2 /
// §7.2.3, ADR-0005).
export default defineConfig({
  plugins: [react()],
  base: "/LoomHub-de/",
});
