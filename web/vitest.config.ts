import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit + route-handler tests. Rules tests (need the Firebase emulator) and
// Playwright e2e tests are run by their own configs/scripts.
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    },
    test: {
        environment: "node",
        // .tsx tests opt in to jsdom with a "// @vitest-environment jsdom" first line; everything else stays on node.
        include: ["tests/unit/**/*.test.{ts,tsx}"],
        passWithNoTests: false,
    },
});
