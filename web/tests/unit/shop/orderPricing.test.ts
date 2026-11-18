import { describe, expect, it } from "vitest";
import {
    MAX_QUANTITY_PER_ITEM,
    ShopOrderError,
    priceShopOrder,
    type CatalogProduct,
} from "@/src/lib/shop/orderPricing";

const catalog: Record<string, CatalogProduct> = {
    edge: { id: "edge", name: "Edge Control", priceCents: 1500, stockStatus: "in_stock" },
    gel: { id: "gel", name: "Gel", priceCents: 1800, stockStatus: "low_stock", inventory: 3 },
    wig: { id: "wig", name: "Wig", priceCents: 8500, variants: [{ name: "Color", options: ["Black", "Brown"] }] },
    gone: { id: "gone", name: "Sold Out", priceCents: 1000, stockStatus: "out_of_stock" },
    zero: { id: "zero", name: "Zero Stock", priceCents: 1000, inventory: 0 },
};

const price = (items: Array<{ productId: string; quantity: number; selectedOptions?: Record<string, string> }>, extra = {}) =>
    priceShopOrder({ items, catalog, fulfillmentType: "pickup", ...extra });

function errorOf(fn: () => unknown): string | null {
    try {
        fn();
        return null;
    } catch (e) {
        if (e instanceof ShopOrderError) return e.message;
        throw e;
    }
}

describe("priceShopOrder totals", () => {
    it("prices lines from the catalog and adds 8.25% tax (pickup: no shipping)", () => {
        const r = price([{ productId: "edge", quantity: 2 }]);
        expect(r.lines).toEqual([{ productId: "edge", name: "Edge Control", quantity: 2, priceCents: 1500, selectedOptions: null }]);
        // subtotal 3000, tax round(3000 * 0.0825) = 248
        expect(r.totals).toEqual({ subtotalCents: 3000, discountCents: 0, taxCents: 248, shippingCents: 0, totalCents: 3248 });
    });

    it("adds the flat $15 shipping for shipping orders (shipping is not taxed)", () => {
        const r = price([{ productId: "edge", quantity: 1 }], { fulfillmentType: "shipping" });
        expect(r.totals).toEqual({ subtotalCents: 1500, discountCents: 0, taxCents: 124, shippingCents: 1500, totalCents: 3124 });
    });

    it("applies a promo percent to the subtotal and taxes the discounted amount", () => {
        const r = price([{ productId: "wig", quantity: 1 }], { promo: { code: "DB-AFF-ABC123", discountPercent: 10 } });
        // subtotal 8500, discount 850, taxable 7650, tax round(631.125) = 631
        expect(r.totals).toEqual({ subtotalCents: 8500, discountCents: 850, taxCents: 631, shippingCents: 0, totalCents: 8281 });
    });

    it("always returns whole cents that add up", () => {
        const r = price([{ productId: "edge", quantity: 3 }, { productId: "gel", quantity: 1 }], {
            fulfillmentType: "shipping",
            promo: { code: "X", discountPercent: 15 },
        });
        const t = r.totals;
        expect(Number.isInteger(t.totalCents)).toBe(true);
        expect(t.totalCents).toBe(t.subtotalCents - t.discountCents + t.taxCents + t.shippingCents);
    });

    it("keeps valid selected options on the line", () => {
        const r = price([{ productId: "wig", quantity: 1, selectedOptions: { Color: "Brown" } }]);
        expect(r.lines[0].selectedOptions).toEqual({ Color: "Brown" });
    });
});

describe("priceShopOrder validation", () => {
    it("rejects an empty order and unknown products", () => {
        expect(errorOf(() => price([]))).toMatch(/at least one/i);
        expect(errorOf(() => price([{ productId: "nope", quantity: 1 }]))).toMatch(/no longer available/i);
    });

    it("rejects invalid quantities", () => {
        for (const quantity of [0, -1, 1.5, NaN, MAX_QUANTITY_PER_ITEM + 1]) {
            expect(errorOf(() => price([{ productId: "edge", quantity }]))).toMatch(/quantity/i);
        }
        expect(errorOf(() => price([{ productId: "edge", quantity: MAX_QUANTITY_PER_ITEM }]))).toBeNull();
    });

    it("rejects out-of-stock products and quantities above tracked inventory (summed across lines)", () => {
        expect(errorOf(() => price([{ productId: "gone", quantity: 1 }]))).toMatch(/out of stock/i);
        expect(errorOf(() => price([{ productId: "zero", quantity: 1 }]))).toMatch(/out of stock/i);
        expect(errorOf(() => price([{ productId: "gel", quantity: 4 }]))).toMatch(/only 3/i);
        expect(
            errorOf(() => price([{ productId: "gel", quantity: 2 }, { productId: "gel", quantity: 2, selectedOptions: {} }])),
        ).toMatch(/only 3/i);
        expect(errorOf(() => price([{ productId: "gel", quantity: 3 }]))).toBeNull();
    });

    it("rejects options the product does not offer", () => {
        expect(errorOf(() => price([{ productId: "wig", quantity: 1, selectedOptions: { Color: "Pink" } }]))).toMatch(/option/i);
        expect(errorOf(() => price([{ productId: "wig", quantity: 1, selectedOptions: { Size: "L" } }]))).toMatch(/option/i);
        expect(errorOf(() => price([{ productId: "edge", quantity: 1, selectedOptions: { Color: "Red" } }]))).toMatch(/option/i);
    });

    it("rejects a catalog product with an invalid price", () => {
        const bad = { ...catalog, bad: { id: "bad", name: "Bad", priceCents: 0 } };
        expect(
            errorOf(() => priceShopOrder({ items: [{ productId: "bad", quantity: 1 }], catalog: bad, fulfillmentType: "pickup" })),
        ).toMatch(/no longer available/i);
    });

    it("rejects a promo percent outside 1 to 100", () => {
        for (const discountPercent of [0, -5, 101, NaN]) {
            expect(errorOf(() => price([{ productId: "edge", quantity: 1 }], { promo: { code: "X", discountPercent } }))).toMatch(/promo/i);
        }
    });
});
