import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Firestore/Storage security-rules tests. Run through `npm run test:rules`,
// which starts the Firebase emulators first.
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    },
    test: {
        environment: "node",
        testTimeout: 30_000,
        hookTimeout: 60_000,
        include: ["tests/rules/**/*.test.ts"],
        passWithNoTests: true,
        // Rules tests share one emulator instance: run files sequentially.
        fileParallelism: false,
    },
});
