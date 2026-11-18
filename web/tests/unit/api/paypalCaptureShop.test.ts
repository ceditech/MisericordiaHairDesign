import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Doc = Record<string, unknown> | undefined;

const state = vi.hoisted(() => ({
    orders: {} as Record<string, Doc>,
    products: {} as Record<string, Doc>,
    events: {} as Record<string, Doc>,
    updates: [] as Array<{ col: string; id: string; data: Record<string, unknown> }>,
    captureCalls: [] as string[],
    captureResult: { status: "COMPLETED" } as Record<string, unknown>,
    emails: [] as string[],
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const ref = (col: string, id: string) => ({
        col,
        id,
        get: async () => {
            const data =
                col === "shopOrders" ? state.orders[id] : col === "paymentEvents" ? state.events[id] : col === "products" ? state.products[id] : undefined;
            return { exists: data !== undefined, data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
            if (col === "paymentEvents") state.events[id] = data;
        },
        update: async (data: Record<string, unknown>) => {
            state.updates.push({ col, id, data });
        },
    });
    return {
        adminDb: {
            collection: (col: string) => ({ doc: (id: string) => ref(col, id) }),
            batch: () => {
                const ops: Array<{ col: string; id: string; data: Record<string, unknown> }> = [];
                return {
                    update: (r: { col: string; id: string }, data: Record<string, unknown>) => {
                        ops.push({ col: r.col, id: r.id, data });
                    },
                    commit: async () => {
                        state.updates.push(...ops);
                    },
                };
            },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({
    FieldValue: { serverTimestamp: () => "TS", increment: (n: number) => ({ increment: n }) },
}));
vi.mock("@/src/lib/payments/paypalServer", () => ({
    paypalServer: {
        captureOrder: async (id: string) => {
            state.captureCalls.push(id);
            return state.captureResult;
        },
    },
}));
vi.mock("@/src/lib/email/EmailManager", () => ({ EmailManager: { sendEmail: async (m: { to: string }) => void state.emails.push(m.to) } }));
vi.mock("@/lib/payments/receipt-generator", () => ({ generateHtmlReceipt: () => "<p/>" }));
vi.mock("@/src/lib/email/templates/receiptTemplate", () => ({ generateElegantReceiptEmail: () => "<p/>" }));

import { POST } from "@/app/api/payments/paypal/capture/route";

const ID = "shop_123e4567-e89b-42d3-a456-426614174000";
const completed = (value: string) => ({
    status: "COMPLETED",
    purchase_units: [{ payments: { captures: [{ amount: { value, currency_code: "USD" } }] } }],
});
const pendingOrder = (over: Record<string, unknown> = {}) => ({
    status: "pending_payment",
    items: [
        { productId: "edge", quantity: 2 },
        { productId: "gel", quantity: 1 },
    ],
    totals: { totalCents: 6696 },
    payment: { provider: "paypal", sessionId: "PP-1", status: "pending_payment" },
    ...over,
});
const call = (body: Record<string, unknown>) =>
    POST(new NextRequest("http://localhost/api/payments/paypal/capture", { method: "POST", body: JSON.stringify(body) }));
const shopCall = (over: Record<string, unknown> = {}) =>
    call({ sessionType: "shop", orderId: ID, paypalOrderId: "PP-1", ...over });

beforeEach(() => {
    state.orders = { [ID]: pendingOrder() };
    state.products = { edge: { inventory: 10 }, gel: { inventory: 5 } };
    state.events = {};
    state.updates = [];
    state.captureCalls = [];
    state.emails = [];
    state.captureResult = completed("66.96");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("PayPal capture: shop orders", () => {
    it("captures, marks the order paid and decrements inventory for every item", async () => {
        const res = await shopCall();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "paid", orderId: ID });
        expect(state.captureCalls).toEqual(["PP-1"]);

        const orderUpdate = state.updates.find((u) => u.col === "shopOrders")!;
        expect(orderUpdate.data).toMatchObject({ status: "paid", "payment.status": "paid", "payment.paypalOrderId": "PP-1" });
        const stock = state.updates.filter((u) => u.col === "products");
        expect(stock.map((u) => [u.id, u.data.inventory])).toEqual([
            ["edge", { increment: -2 }],
            ["gel", { increment: -1 }],
        ]);
    });

    it("emails the customer and the owner after a verified payment", async () => {
        state.orders[ID] = pendingOrder({ customerName: "Ann", customerEmail: "ann@example.com" });
        await shopCall();
        expect(state.emails).toEqual(["ann@example.com", "sales@edxstore.com"]);
        expect(state.updates.some((u) => u.col === "shopOrders" && u.data["emails.customerSent"] === true)).toBe(true);
    });

    it("sends no emails when the amount does not match", async () => {
        state.orders[ID] = pendingOrder({ customerEmail: "ann@example.com" });
        state.captureResult = completed("1.00");
        await shopCall();
        expect(state.emails).toHaveLength(0);
    });

    it("does not touch products that do not track inventory (no negative stock)", async () => {
        state.products = { edge: { inventory: 10 }, gel: {} };
        await shopCall();
        const stock = state.updates.filter((u) => u.col === "products");
        expect(stock.map((u) => u.id)).toEqual(["edge"]);
    });

    it("does NOT capture money for an unknown order (404), a missing order id (400) or an already processed order (409)", async () => {
        expect((await shopCall({ orderId: "shop_00000000-0000-4000-8000-000000000000" })).status).toBe(404);
        expect((await shopCall({ orderId: undefined })).status).toBe(400);
        state.orders[ID] = pendingOrder({ status: "paid" });
        expect((await shopCall()).status).toBe(409);
        expect(state.captureCalls).toHaveLength(0);
    });

    it("does NOT capture when the PayPal order is not the one created for this shop order", async () => {
        const res = await shopCall({ paypalOrderId: "PP-OTHER" });
        expect(res.status).toBe(409);
        expect(state.captureCalls).toHaveLength(0);
    });

    it("flags the order for review and does not mark it paid when the captured amount differs", async () => {
        state.captureResult = completed("1.00");
        const res = await shopCall();
        expect(res.status).toBe(409);
        const orderUpdates = state.updates.filter((u) => u.col === "shopOrders");
        expect(orderUpdates[0].data).toMatchObject({ status: "payment_review" });
        expect(state.updates.some((u) => u.col === "products")).toBe(false);
    });

    it("is idempotent: a second capture of the same PayPal order is ignored", async () => {
        await shopCall();
        state.updates = [];
        state.orders[ID] = pendingOrder({ status: "paid" });
        const again = await shopCall();
        expect((await again.json()).status).toBe("already_processed");
        expect(state.updates).toHaveLength(0);
    });

    it("returns an error and changes nothing when PayPal does not complete the capture", async () => {
        state.captureResult = { status: "PAYER_ACTION_REQUIRED" };
        const res = await shopCall();
        expect(res.status).toBe(400);
        expect(state.updates).toHaveLength(0);
    });
});
