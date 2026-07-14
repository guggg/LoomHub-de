import { defineConfig } from "vitest/config";

// Root-level config covers scripts/ tests only (Node ESM scripts, no DOM).
// site/ has its own vitest.config.js (jsdom environment for React).
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.test.mjs"],
  },
});
