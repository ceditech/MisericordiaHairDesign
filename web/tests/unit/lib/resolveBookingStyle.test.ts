import { describe, it, expect } from "vitest";
import { BRAID_STYLES, resolveBookingStyle, type BraidStyle } from "@/src/lib/styles";

const live: BraidStyle = { ...BRAID_STYLES[1], price: "$999" };

describe("resolveBookingStyle", () => {
    it("prefers the live style over the built-in one with the same id", () => {
        expect(resolveBookingStyle(live.id, [live])?.price).toBe("$999");
    });

    it("falls back to the built-in style when the live list lacks it", () => {
        expect(resolveBookingStyle(BRAID_STYLES[0].id, [])).toBe(BRAID_STYLES[0]);
    });

    it("returns null for an unknown or missing id", () => {
        expect(resolveBookingStyle("nope", [live])).toBeNull();
        expect(resolveBookingStyle(undefined, [live])).toBeNull();
        expect(resolveBookingStyle("", [live])).toBeNull();
    });
});
