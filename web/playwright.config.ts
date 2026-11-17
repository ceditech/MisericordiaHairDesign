import { defineConfig } from "@playwright/test";

// End-to-end tests for the critical flows (booking+payment, owner login, shop).
// Not part of the default CI gate yet; run with `npm run test:e2e`.
export default defineConfig({
    testDir: "./tests/e2e",
    retries: 0,
    use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
    webServer: {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
