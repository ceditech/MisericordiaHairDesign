import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Doc = Record<string, unknown> | undefined;

const state = vi.hoisted(() => ({
    drafts: {} as Record<string, Doc>,
    orders: {} as Record<string, Doc>,
    products: {} as Record<string, Doc>,
    events: {} as Record<string, Doc>,
    writes: [] as Array<{ op: string; col: string; id: string; data: Record<string, unknown> }>,
    event: {} as Record<string, unknown>,
    failBookingSet: false,
    failEmails: false,
    emails: [] as string[],
}));

vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "sig" }) }));
vi.mock("@/src/lib/payments/stripeServer", () => ({
    getStripeServer: () => ({ webhooks: { constructEvent: () => state.event } }),
}));
vi.mock("@/src/lib/firebase/admin", () => {
    const store = (col: string): Record<string, Doc> =>
        col === "bookingDrafts" ? state.drafts : col === "shopOrders" ? state.orders : col === "paymentEvents" ? state.events : col === "products" ? state.products : {};
    const ref = (col: string, id: string) => ({
        col,
        id,
        get: async () => ({ exists: store(col)[id] !== undefined, data: () => store(col)[id] }),
        set: async (data: Record<string, unknown>) => {
            if (col === "bookings" && state.failBookingSet) throw new Error("firestore down");
            state.writes.push({ op: "set", col, id, data });
            if (col === "paymentEvents") state.events[id] = data;
        },
        update: async (data: Record<string, unknown>) => {
            state.writes.push({ op: "update", col, id, data });
        },
        delete: async () => {},
    });
    return {
        adminDb: {
            collection: (col: string) => ({ doc: (id: string) => ref(col, id) }),
            batch: () => {
                const ops: Array<{ op: string; col: string; id: string; data: Record<string, unknown> }> = [];
                return {
                    update: (r: { col: string; id: string }, data: Record<string, unknown>) => void ops.push({ op: "update", col: r.col, id: r.id, data }),
                    commit: async () => void state.writes.push(...ops),
                };
            },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({
    FieldValue: { serverTimestamp: () => "TS", increment: (n: number) => ({ increment: n }) },
}));
vi.mock("@/src/lib/email/EmailManager", () => ({ EmailManager: { sendEmail: async (m: { to: string }) => { if (state.failEmails) throw new Error("smtp down"); state.emails.push(m.to); } } }));
vi.mock("@/src/lib/payments/receipt-generator", () => ({ generateHtmlReceipt: () => "<p/>" }));
vi.mock("@/src/lib/email/templates/receiptTemplate", () => ({ generateElegantReceiptEmail: () => "<p/>" }));
vi.mock("@/src/lib/affiliate/affiliateTracker", () => ({ processAffiliateConversion: async () => {} }));

import { POST } from "@/app/api/stripe/webhook/route";

const session = (over: Record<string, unknown> = {}) => ({
    id: "cs_1",
    payment_status: "paid",
    amount_total: 5000,
    currency: "usd",
    customer_email: "ann@example.com",
    payment_intent: "pi_1",
    metadata: { sessionType: "booking", draftId: "d1" },
    ...over,
});
const sendEvent = (obj: Record<string, unknown>, id = "evt_1") => {
    state.event = { id, type: "checkout.session.completed", data: { object: obj } };
    return POST(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
};
const draft = (over: Record<string, unknown> = {}) => ({
    styleName: "Knotless",
    date: "2026-12-01",
    time: "10:00",
    clientName: "Ann",
    clientEmail: "ann@example.com",
    clientPhone: "555",
    payment: { provider: "stripe", sessionId: "cs_1", amountCents: 5000, choice: "deposit", status: "pending_payment" },
    ...over,
});
const order = (over: Record<string, unknown> = {}) => ({
    status: "pending_payment",
    items: [{ productId: "edge", quantity: 2 }],
    totals: { totalCents: 2500 },
    payment: { provider: "stripe", sessionId: "cs_1", status: "pending_payment" },
    ...over,
});
const shopSession = (over: Record<string, unknown> = {}) => session({ amount_total: 2500, metadata: { sessionType: "shop", orderId: "shop_1" }, ...over });
const wrote = (col: string) => state.writes.filter((w) => w.col === col);

beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    state.drafts = { d1: draft() };
    state.orders = { shop_1: order() };
    state.products = { edge: { inventory: 10 } };
    state.events = {};
    state.writes = [];
    state.emails = [];
    state.failBookingSet = false;
    state.failEmails = false;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Stripe webhook: bookings", () => {
    it("confirms a verified payment: booking created, draft paid, emails sent, event recorded", async () => {
        const res = await sendEvent(session());
        expect(res.status).toBe(200);
        expect(wrote("bookings")[0].data).toMatchObject({ bookingId: "booking_d1", amountPaidCents: 5000, status: "confirmed", provider: "stripe" });
        expect(wrote("bookingDrafts")[0].data).toMatchObject({ "payment.status": "paid", status: "confirmed" });
        expect(state.emails).toContain("ann@example.com");
        expect(wrote("paymentEvents")).toHaveLength(1);
    });

    it("sends the owner's new-booking email to the owner notification address", async () => {
        await sendEvent(session());
        expect(state.emails).toEqual(["ann@example.com", "mariefleurekpe@gmail.com"]);
    });

    it("OWNER_NOTIFICATION_EMAIL redirects the owner's new-booking email", async () => {
        vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "orders@example.com");
        try {
            await sendEvent(session());
            expect(state.emails).toEqual(["ann@example.com", "orders@example.com"]);
        } finally {
            vi.unstubAllEnvs();
        }
    });

    it("holds the booking for review (no booking, no emails) when the amount differs", async () => {
        await sendEvent(session({ amount_total: 100 }));
        expect(wrote("bookings")).toHaveLength(0);
        expect(wrote("bookingDrafts")[0].data).toMatchObject({ status: "payment_review", "payment.status": "payment_review" });
        expect(state.emails).toHaveLength(0);
    });

    it("holds the booking for review when the session is not the one created for the draft", async () => {
        await sendEvent(session({ id: "cs_OLD" }));
        expect(wrote("bookings")).toHaveLength(0);
        expect(wrote("bookingDrafts")[0].data.status).toBe("payment_review");
    });

    it("holds the booking for review when the payment is not paid yet", async () => {
        await sendEvent(session({ payment_status: "unpaid" }));
        expect(wrote("bookings")).toHaveLength(0);
        expect(wrote("bookingDrafts")[0].data.status).toBe("payment_review");
    });

    it("skips an already confirmed draft (no second booking write or emails)", async () => {
        state.drafts.d1 = draft({ status: "confirmed" });
        const res = await sendEvent(session(), "evt_2");
        expect(res.status).toBe(200);
        expect(wrote("bookings")).toHaveLength(0);
        expect(state.emails).toHaveLength(0);
    });

    it("ignores a duplicate event id", async () => {
        state.events.evt_1 = { provider: "stripe" };
        await sendEvent(session());
        expect(state.writes).toHaveLength(0);
    });

    it("returns 500 (so Stripe retries) and does not record the event when finalizing fails", async () => {
        state.failBookingSet = true;
        const res = await sendEvent(session());
        expect(res.status).toBe(500);
        expect(wrote("paymentEvents")).toHaveLength(0);
    });
});

describe("Stripe webhook: shop orders", () => {
    it("marks a verified order paid and decrements inventory", async () => {
        const res = await sendEvent(shopSession());
        expect(res.status).toBe(200);
        expect(wrote("shopOrders")[0].data).toMatchObject({ status: "paid", "payment.status": "paid", "payment.stripeSessionId": "cs_1" });
        expect(wrote("products").map((w) => [w.id, w.data.inventory])).toEqual([["edge", { increment: -2 }]]);
    });

    it("emails the customer and the owner once the order is paid, and records the email status", async () => {
        state.orders.shop_1 = order({ customerName: "Ann Lee", customerEmail: "ann@example.com", fulfillmentType: "pickup", totals: { totalCents: 2500, subtotalCents: 2000, taxCents: 500, shippingCents: 0, discountCents: 0 } });
        await sendEvent(shopSession());
        expect(state.emails).toEqual(["ann@example.com", "mariefleurekpe@gmail.com"]);
        expect(wrote("shopOrders").some((w) => w.data["emails.customerSent"] === true && w.data["emails.ownerSent"] === true)).toBe(true);
    });

    it("still marks the order paid and returns 200 when the emails fail", async () => {
        state.failEmails = true;
        const res = await sendEvent(shopSession());
        expect(res.status).toBe(200);
        expect(wrote("shopOrders")[0].data).toMatchObject({ status: "paid" });
    });

    it("sends no emails for an order held for review or already paid", async () => {
        await sendEvent(shopSession({ amount_total: 1 }));
        state.orders.shop_1 = order({ status: "paid" });
        await sendEvent(shopSession(), "evt_2");
        expect(state.emails).toHaveLength(0);
    });

    it("holds the order for review and leaves inventory alone when the amount differs", async () => {
        await sendEvent(shopSession({ amount_total: 1 }));
        expect(wrote("shopOrders")[0].data).toMatchObject({ status: "payment_review" });
        expect(wrote("products")).toHaveLength(0);
    });

    it("holds the order for review when the session is not the one created for the order", async () => {
        await sendEvent(shopSession({ id: "cs_OLD" }));
        expect(wrote("shopOrders")[0].data.status).toBe("payment_review");
        expect(wrote("products")).toHaveLength(0);
    });

    it("does not decrement inventory again for an order that is already paid", async () => {
        state.orders.shop_1 = order({ status: "paid" });
        await sendEvent(shopSession(), "evt_2");
        expect(state.writes.filter((w) => w.col !== "paymentEvents")).toHaveLength(0);
    });
});
