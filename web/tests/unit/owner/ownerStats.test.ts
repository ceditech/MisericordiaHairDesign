import { describe, it, expect } from "vitest";
import {
    buildBusinessTrends,
    computeAffiliateMetrics,
    computeBlogStats,
    computeConversionRate,
    computeSalesMetrics,
    computeTopPerformers,
    countRecentClients,
    formatShortDate,
    isConvertedBooking,
    parsePrice,
} from "@/src/lib/owner/ownerStats";
import type { OwnerBooking, OwnerShopOrder } from "@/src/lib/owner/types";

const b = (o: Partial<OwnerBooking> = {}): OwnerBooking => ({ id: "b", ...o });
const order = (o: Partial<OwnerShopOrder> = {}): OwnerShopOrder => ({ id: "o", ...o });

describe("computeSalesMetrics", () => {
    it("counts only completed bookings as service revenue (real bookings: paid, then due, then deposit)", () => {
        const m = computeSalesMetrics(
            [
                b({ status: "completed", amountPaidCents: 10000 }),
                b({ status: "completed", pricing: { amountDueCents: 5000, depositCents: 1000 } }),
                b({ status: "completed", pricing: { depositCents: 2500 } }),
                b({ status: "confirmed", amountPaidCents: 99999 }),
            ],
            []
        );
        expect(m.serviceRevenue).toBe(175);
    });

    it("uses total/amount/price cents for seed bookings", () => {
        const m = computeSalesMetrics(
            [
                b({ status: "completed", isSeedData: true, totalCents: 20000, amountPaidCents: 1 }),
                b({ status: "completed", isSeedData: true, amountCents: 3000 }),
                b({ status: "completed", isSeedData: true, priceCents: 500 }),
            ],
            []
        );
        expect(m.serviceRevenue).toBe(235);
    });

    it("sums shop orders except cancelled, falling back to legacy dollar totalAmount", () => {
        const m = computeSalesMetrics(
            [],
            [
                order({ totalAmountCents: 4000 }),
                order({ totalAmount: 12.5 }),
                order({ status: "cancelled", totalAmountCents: 9999 }),
                order({}),
            ]
        );
        expect(m.shopRevenue).toBe(52.5);
    });

    it("totals revenue, deposits (excluding cancelled) and counts", () => {
        const m = computeSalesMetrics(
            [
                b({ status: "completed", amountPaidCents: 10000, pricing: { depositPaidCents: 5000 } }),
                b({ status: "confirmed", depositCents: 3000 }),
                b({ status: "cancelled", depositCents: 7000 }),
            ],
            [order({ totalAmountCents: 2000 })]
        );
        expect(m.totalRevenue).toBe(120);
        expect(m.totalDeposits).toBe(80);
        expect(m.bookingsCount).toBe(3);
        expect(m.ordersCount).toBe(1);
        expect(m.revenueTarget).toBe(15000);
    });

    it("returns zeros for empty input", () => {
        expect(computeSalesMetrics([], [])).toEqual({
            totalRevenue: 0,
            serviceRevenue: 0,
            shopRevenue: 0,
            totalDeposits: 0,
            bookingsCount: 0,
            ordersCount: 0,
            revenueTarget: 15000,
        });
    });
});

describe("computeAffiliateMetrics", () => {
    it("counts affiliates by type and sums usages by code category and payouts due", () => {
        const m = computeAffiliateMetrics(
            [
                { type: "client", payoutsDueCents: 1500 },
                { type: "general", payoutsDueCents: 500 },
                { type: "client" },
            ],
            [
                { id: "1", category: "client", usageCount: 3 },
                { id: "2", category: "general", usageCount: 2 },
                { id: "3", category: "other", usageCount: 4 },
                { id: "4" },
            ]
        );
        expect(m).toEqual({
            totalCount: 3,
            clientCount: 2,
            generalCount: 1,
            totalUsages: 9,
            clientUsages: 3,
            generalUsages: 2,
            payoutsDue: 20,
        });
    });
});

describe("conversion", () => {
    it("treats cancelled bookings as converted only when the refund was forfeited", () => {
        expect(isConvertedBooking(b({ status: "confirmed" }))).toBe(true);
        expect(isConvertedBooking(b({ status: "cancelled" }))).toBe(false);
        expect(isConvertedBooking(b({ status: "cancelled", forfeited: true }))).toBe(true);
        expect(isConvertedBooking(b({ status: "cancelled", refundStatus: "forfeited" }))).toBe(true);
        expect(isConvertedBooking(b({ status: "cancelled", refundStatus: "refunded" }))).toBe(false);
    });

    it("computes a percentage, caps at 100 and is 0 with no drafts", () => {
        expect(computeConversionRate(1, 4)).toBe(25);
        expect(computeConversionRate(5, 4)).toBe(100);
        expect(computeConversionRate(3, 0)).toBe(0);
    });
});

describe("buildBusinessTrends", () => {
    const now = new Date(2026, 10, 20); // 20 Nov 2026

    it("returns the last N months oldest first", () => {
        const t = buildBusinessTrends([], 3, now);
        expect(t.map((p) => p.name)).toEqual(["Sep", "Oct", "Nov"]);
        expect(t.map((p) => p.year)).toEqual([2026, 2026, 2026]);
    });

    it("crosses the year boundary", () => {
        const t = buildBusinessTrends([], 3, new Date(2026, 0, 15));
        expect(t.map((p) => `${p.name} ${p.year}`)).toEqual(["Nov 2025", "Dec 2025", "Jan 2026"]);
    });

    it("counts completed and cancelled per month using Timestamp-like and Date values", () => {
        const t = buildBusinessTrends(
            [
                b({ createdAt: { toDate: () => new Date(2026, 10, 2) } }),
                b({ createdAt: new Date(2026, 10, 9), status: "cancelled" }),
                b({ createdAt: new Date(2026, 9, 9), status: "confirmed" }),
                b({ createdAt: new Date(2020, 0, 1) }), // outside the window
            ],
            2,
            now
        );
        expect(t.find((p) => p.name === "Nov")).toMatchObject({ completed: 1, cancelled: 1 });
        expect(t.find((p) => p.name === "Oct")).toMatchObject({ completed: 1, cancelled: 0 });
    });
});

describe("parsePrice", () => {
    it("reads cents fields as dollars", () => {
        expect(parsePrice(b({ amountCents: 12500 }))).toBe(125);
        expect(parsePrice(b({ amountPaidCents: 5000 }))).toBe(50);
    });
    it("parses formatted strings", () => {
        expect(parsePrice(b({ amountCents: "$1,200.50" }))).toBe(1200.5);
        expect(parsePrice(b({ amountCents: "abc" }))).toBe(0);
    });
    it("falls back to legacy dollar fields", () => {
        expect(parsePrice(b({ price: 80 }))).toBe(80);
        expect(parsePrice(b({ totalAmount: "$45" }))).toBe(45);
        expect(parsePrice(b())).toBe(0);
    });
});

describe("computeTopPerformers", () => {
    it("ranks services by count, keeping the first non-zero price and first image", () => {
        const { topServices } = computeTopPerformers(
            [
                b({ styleName: "Knotless", amountCents: 0 }),
                b({ styleName: "Knotless", amountCents: 15000, styleImage: "k.jpg" }),
                b({ styleName: "Knotless", amountCents: 20000, styleImage: "other.jpg" }),
                b({ styleName: "Twists", amountCents: 9000 }),
                b({}),
            ],
            []
        );
        expect(topServices[0]).toEqual({ name: "Knotless", count: 3, price: 150, img: "k.jpg" });
        expect(topServices.map((s) => s.name)).toContain("Unknown Service");
    });

    it("limits to three and counts product quantities, skipping cancelled orders", () => {
        const { topProducts } = computeTopPerformers(
            [],
            [
                order({ items: [{ name: "Oil", quantity: 2, priceCents: 1000 }, { name: "Comb" }] }),
                order({ items: [{ name: "Oil", quantity: 1 }, { name: "Gel" }, { name: "Brush" }] }),
                order({ status: "cancelled", items: [{ name: "Oil", quantity: 50 }] }),
            ]
        );
        expect(topProducts).toHaveLength(3);
        expect(topProducts[0]).toMatchObject({ name: "Oil", count: 3, price: 10 });
    });
});

describe("countRecentClients", () => {
    const since = new Date(2026, 9, 21);
    it("counts distinct clients created since the cutoff, preferring email then phone then name then id", () => {
        const n = countRecentClients(
            [
                b({ id: "1", createdAt: new Date(2026, 10, 1), clientEmail: "a@x.com" }),
                b({ id: "2", createdAt: new Date(2026, 10, 2), email: "a@x.com" }),
                b({ id: "3", createdAt: new Date(2026, 10, 3), clientPhone: "555" }),
                b({ id: "4", createdAt: new Date(2026, 10, 4) }),
                b({ id: "5", createdAt: new Date(2026, 0, 1), clientEmail: "old@x.com" }),
                b({ id: "6" }), // no date: not counted
            ],
            since
        );
        expect(n).toBe(3);
    });
});

describe("formatShortDate", () => {
    it("formats Timestamp-like, Date, string and number values", () => {
        expect(formatShortDate({ toDate: () => new Date(2026, 2, 4) })).toBe("Mar 4, 2026");
        expect(formatShortDate(new Date(2026, 10, 20))).toBe("Nov 20, 2026");
        expect(formatShortDate(new Date(2026, 0, 5).getTime())).toBe("Jan 5, 2026");
    });
    it("returns a dash for missing values or a throwing Timestamp", () => {
        expect(formatShortDate(undefined)).toBe("—");
        expect(formatShortDate(null)).toBe("—");
        expect(formatShortDate({ toDate: () => { throw new Error("bad"); } })).toBe("—");
    });
});

describe("computeBlogStats", () => {
    it("counts posts, views, drafts and published", () => {
        expect(
            computeBlogStats([
                { views: 10, status: "published" },
                { views: 5, status: "draft" },
                { status: "draft" },
            ])
        ).toEqual({ totalPosts: 3, totalViews: 15, draftCount: 2, publishedCount: 1 });
    });
    it("is all zeros for no posts", () => {
        expect(computeBlogStats([])).toEqual({ totalPosts: 0, totalViews: 0, draftCount: 0, publishedCount: 0 });
    });
});
