import { defineConfig } from "vitest/config";

// Firestore/Storage security-rules tests. Run through `npm run test:rules`,
// which starts the Firebase emulators first.
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/rules/**/*.test.ts"],
        passWithNoTests: true,
        // Rules tests share one emulator instance: run files sequentially.
        fileParallelism: false,
    },
});
