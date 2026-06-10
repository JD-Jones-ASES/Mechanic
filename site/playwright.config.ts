import { defineConfig } from "@playwright/test";

// E2E invariants run against the BUILT site (astro preview over dist/), not a
// dev server — "the sim renders and produces correct numbers" is a testable
// property of the deployable artifact (CLAUDE.md verification policy).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4321/Mechanic/",
  },
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4321/Mechanic/",
    reuseExistingServer: !process.env.CI,
  },
});
