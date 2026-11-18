import { describe, expect, it } from "vitest";
import { calculateBookingPrice } from "@/lib/pricing";

/**
 * Booking (service) pricing. Services are NOT taxed (Texas policy per the owner);
 * only shop products are taxed (see src/lib/shop/orderPricing.ts).
 */
const sizePresets = [{ id: "medium", label: "Medium", priceAdjustment: 20 }] as never;
const lengthPresets = [{ id: "waist", label: "Waist", priceAdjustment: 30 }] as never;

const base = { stylePrice: "$200 and up", sizeId: "none", lengthId: "none", washingAddon: false, takeDownAddon: false };

describe("calculateBookingPrice: no tax on services", () => {
    it("charges exactly the style price when there are no extras (no tax)", () => {
        const r = calculateBookingPrice(base);
        expect(r.baseCents).toBe(20000);
        expect(r.subtotalCents).toBe(20000);
        expect(r.taxCents).toBe(0);
        expect(r.totalCents).toBe(20000);
    });

    it("adds size and length adjustments and add-ons, still without tax", () => {
        const r = calculateBookingPrice({
            ...base,
            sizeId: "medium",
            lengthId: "waist",
            washingAddon: true,
            takeDownAddon: true,
            sizePresets,
            lengthPresets,
        });
        // 200 + 20 + 30 + 25 (wash) + 45 (take down) = 320
        expect(r.subtotalCents).toBe(32000);
        expect(r.taxCents).toBe(0);
        expect(r.totalCents).toBe(32000);
    });

    it("applies a validated promo at its own percent; total is subtotal minus discount (no tax)", () => {
        const r = calculateBookingPrice({ ...base, promo: { code: "DB-AFF-ABC123", discountPercent: 10 } });
        expect(r.discountCents).toBe(2000);
        expect(r.taxCents).toBe(0);
        expect(r.totalCents).toBe(18000);
        expect(calculateBookingPrice({ ...base, promo: { code: "DB-AFF-ABC123", discountPercent: 15 } }).discountCents).toBe(3000);
    });

    it("gives no discount without a validated promo (code text alone never earns one)", () => {
        expect(calculateBookingPrice(base).discountCents).toBe(0);
        expect(calculateBookingPrice({ ...base, promo: null }).discountCents).toBe(0);
        // a legacy caller passing only a code string is ignored
        expect(calculateBookingPrice({ ...base, promoCode: "DB-AFF-FAKE00" } as never).discountCents).toBe(0);
        expect(calculateBookingPrice({ ...base, promoCode: "AFFILIATE10" } as never).discountCents).toBe(0);
    });

    it("never discounts more than 100% or by a non-positive percent", () => {
        expect(calculateBookingPrice({ ...base, promo: { code: "X", discountPercent: 150 } }).totalCents).toBe(0);
        expect(calculateBookingPrice({ ...base, promo: { code: "X", discountPercent: 0 } }).discountCents).toBe(0);
        expect(calculateBookingPrice({ ...base, promo: { code: "X", discountPercent: -5 } }).discountCents).toBe(0);
    });

    it("accepts a numeric style price", () => {
        const r = calculateBookingPrice({ ...base, stylePrice: 220 });
        expect(r.baseCents).toBe(22000);
        expect(r.totalCents).toBe(22000);
    });

    it("keeps the deposit rule: fixed $50 plus the add-on deposits (unchanged)", () => {
        expect(calculateBookingPrice(base).depositCents).toBe(5000);
        expect(calculateBookingPrice({ ...base, washingAddon: true }).depositCents).toBe(7500);
        expect(calculateBookingPrice({ ...base, washingAddon: true, takeDownAddon: true }).depositCents).toBe(12000);
    });

    it("always keeps the result shape (taxCents stays a number for stored drafts and bookings)", () => {
        const r = calculateBookingPrice(base);
        expect(Object.keys(r).sort()).toEqual(
            ["addonCents", "baseCents", "depositCents", "discountCents", "lengthAdjustmentCents", "sizeAdjustmentCents", "subtotalCents", "taxCents", "totalCents"],
        );
        expect(typeof r.taxCents).toBe("number");
    });
});
