import { describe, it, expect } from "vitest";
import { parseContactInput, isBookingDateParam } from "@/src/lib/http/validate";

const valid = { name: "Ada", email: "ada@example.com", service: "Knotless Braids", message: "Hello" };

describe("parseContactInput", () => {
    it("accepts a valid body and trims text", () => {
        const r = parseContactInput({ ...valid, name: "  Ada  ", message: " Hello " });
        expect(r).toEqual({ ok: true, value: { ...valid, name: "Ada", message: "Hello" } });
    });

    it("drops unknown fields", () => {
        const r = parseContactInput({ ...valid, role: "admin" });
        expect(r.ok && "role" in r.value).toBe(false);
    });

    it.each([null, undefined, "text", 5, []])("rejects a non-object body (%s)", (body) => {
        expect(parseContactInput(body).ok).toBe(false);
    });

    it.each(["name", "email", "service", "message"])("rejects a missing %s", (field) => {
        expect(parseContactInput({ ...valid, [field]: "" }).ok).toBe(false);
        expect(parseContactInput({ ...valid, [field]: "   " }).ok).toBe(false);
    });

    it("rejects non-string fields", () => {
        expect(parseContactInput({ ...valid, name: { $ne: "" } }).ok).toBe(false);
        expect(parseContactInput({ ...valid, message: 123 }).ok).toBe(false);
    });

    it("rejects an invalid email", () => {
        expect(parseContactInput({ ...valid, email: "not-an-email" }).ok).toBe(false);
    });

    it("rejects over-long fields", () => {
        expect(parseContactInput({ ...valid, name: "a".repeat(101) }).ok).toBe(false);
        expect(parseContactInput({ ...valid, service: "a".repeat(101) }).ok).toBe(false);
        expect(parseContactInput({ ...valid, message: "a".repeat(5001) }).ok).toBe(false);
        expect(parseContactInput({ ...valid, email: `${"a".repeat(250)}@x.co` }).ok).toBe(false);
    });

    it("accepts fields at the limit", () => {
        expect(parseContactInput({ ...valid, name: "a".repeat(100), message: "a".repeat(5000) }).ok).toBe(true);
    });
});

describe("isBookingDateParam", () => {
    it("accepts the format the booking page sends", () => {
        expect(isBookingDateParam("November 21, 2026")).toBe(true);
        expect(isBookingDateParam("March 3, 2027")).toBe(true);
    });

    it.each(["", null, "2026-11-21", "tomorrow", "November 21 2026", "x".repeat(40), "Nov 21, 2026 <script>"])(
        "rejects %s",
        (value) => {
            expect(isBookingDateParam(value as string | null)).toBe(false);
        }
    );
});
