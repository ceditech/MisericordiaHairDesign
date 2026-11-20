import { describe, it, expect } from "vitest";
import { errorCode, errorMessage, isAbortError } from "@/src/lib/errors";

describe("errorMessage", () => {
    it("reads Error and message-bearing objects, else the fallback", () => {
        expect(errorMessage(new Error("boom"))).toBe("boom");
        expect(errorMessage({ message: "plain" })).toBe("plain");
        expect(errorMessage("text")).toBe("Internal server error");
        expect(errorMessage(new Error(""), "custom")).toBe("custom");
        expect(errorMessage(null, "custom")).toBe("custom");
    });
});

describe("errorCode", () => {
    it("returns a string code only", () => {
        expect(errorCode({ code: "auth/user-not-found" })).toBe("auth/user-not-found");
        expect(errorCode({ code: 5 })).toBeUndefined();
        expect(errorCode(undefined)).toBeUndefined();
    });
});

describe("isAbortError", () => {
    it("matches AbortError by name only", () => {
        const abort = new Error("aborted");
        abort.name = "AbortError";
        expect(isAbortError(abort)).toBe(true);
        expect(isAbortError({ name: "AbortError" })).toBe(true);
        expect(isAbortError(new Error("other"))).toBe(false);
        expect(isAbortError("AbortError")).toBe(false);
        expect(isAbortError(null)).toBe(false);
    });
});
