import { describe, expect, it } from "vitest";
import { cn, formatUSPhone } from "@/src/lib/utils";

// Smoke test: proves the harness runs TypeScript and resolves the "@/" alias.
// It also pins the current behavior of two pure helpers (characterization).
describe("test harness smoke", () => {
    it("formats a US phone number progressively", () => {
        expect(formatUSPhone("")).toBe("");
        expect(formatUSPhone("555")).toBe("555");
        expect(formatUSPhone("5551234")).toBe("(555) 123-4");
        expect(formatUSPhone("555-123-4567")).toBe("(555) 123-4567");
    });

    it("merges conflicting tailwind classes (last one wins)", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
    });
});
