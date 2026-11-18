import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type StripeArgs = {
    line_items: Array<{ price_data: { unit_amount: number; product_data: { name: string } }; quantity: number }>;
    discounts?: Array<{ coupon: string }>;
    customer_email?: string;
    metadata?: Record<string, string>;
};

const state = vi.hoisted(() => ({
    orders: {} as Record<string, Record<string, unknown> | undefined>,
    updates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    stripeSessions: [] as Array<StripeArgs>,
    coupons: [] as Array<Record<string, unknown>>,
    paypalOrders: [] as Array<{ amount: number; currency: string; description: string }>,
}));

vi.mock("@/src/lib/firebase/admin", () => ({
    adminDb: {
        collection: () => ({
            doc: (id: string) => ({
                get: async () => ({ exists: state.orders[id] !== undefined, data: () => state.orders[id] }),
                update: async (data: Record<string, unknown>) => { state.updates.push({ id, data }); },
            }),
        }),
    },
}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/payments/stripeServer", () => ({
    getStripeServer: () => ({
        checkout: {
            sessions: {
                create: async (args: StripeArgs) => {
                    state.stripeSessions.push(args);
                    return { id: "cs_test_1", url: "https://stripe.example/pay" };
                },
            },
        },
        coupons: {
            create: async (args: Record<string, unknown>) => {
                state.coupons.push(args);
                return { id: "coupon_1" };
            },
        },
    }),
}));
vi.mock("@/src/lib/payments/paypalServer", () => ({
    paypalServer: {
        createOrder: async (amount: number, currency: string, description: string) => {
            state.paypalOrders.push({ amount, currency, description });
            return { id: "PAYPAL-1", links: [{ rel: "approve", href: "https://paypal.example/approve" }] };
        },
    },
}));

import { POST as stripePOST } from "@/app/api/payments/stripe/create-session/route";
import { POST as paypalPOST } from "@/app/api/payments/paypal/create-order/route";

const order = (over: Record<string, unknown> = {}) => ({
    status: "pending_payment",
    customerEmail: "jane@example.com",
    items: [
        { productId: "edge", name: "Edge Control", quantity: 2, priceCents: 1500 },
        { productId: "gel", name: "Gel", quantity: 1, priceCents: 1800 },
    ],
    promoCode: null,
    // subtotal 4800, tax round(4800*0.0825)=396, shipping 1500
    totals: { subtotalCents: 4800, discountCents: 0, taxCents: 396, shippingCents: 1500, totalCents: 6696 },
    ...over,
});

const stripeCall = (body: Record<string, unknown>) =>
    stripePOST(
        new NextRequest("http://localhost/api/payments/stripe/create-session", {
            method: "POST",
            body: JSON.stringify({ sessionType: "shop", successUrl: "https://x/s", cancelUrl: "https://x/c", ...body }),
        }),
    );
const paypalCall = (body: Record<string, unknown>) =>
    paypalPOST(
        new NextRequest("http://localhost/api/payments/paypal/create-order", {
            method: "POST",
            body: JSON.stringify({ sessionType: "shop", returnUrl: "https://x/r", cancelUrl: "https://x/c", ...body }),
        }),
    );

const sumLineItems = (items: Array<{ price_data: { unit_amount: number }; quantity: number }>) =>
    items.reduce((s, i) => s + i.price_data.unit_amount * i.quantity, 0);

beforeEach(() => {
    state.orders = { shop_1: order() };
    state.updates = [];
    state.stripeSessions = [];
    state.coupons = [];
    state.paypalOrders = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("Stripe create-session: shop orders", () => {
    it("accepts the shopOrderId the checkout sends (and the legacy orderId)", async () => {
        expect((await stripeCall({ shopOrderId: "shop_1" })).status).toBe(200);
        expect((await stripeCall({ orderId: "shop_1" })).status).toBe(200);
    });

    it("charges items + tax + shipping: the Stripe total equals the order total", async () => {
        const res = await stripeCall({ shopOrderId: "shop_1" });
        expect(await res.json()).toMatchObject({ url: "https://stripe.example/pay", sessionId: "cs_test_1" });
        const session = state.stripeSessions[0];
        expect(sumLineItems(session.line_items)).toBe(6696);
        const names = session.line_items.map((i: { price_data: { product_data: { name: string } } }) => i.price_data.product_data.name);
        expect(names).toEqual(expect.arrayContaining(["Edge Control", "Gel", "Sales tax", "Shipping"]));
        expect(session.discounts).toBeUndefined();
        expect(session.customer_email).toBe("jane@example.com");
        expect(session.metadata).toMatchObject({ sessionType: "shop", orderId: "shop_1" });
    });

    it("omits the tax and shipping lines when they are zero (pickup, tax-free total)", async () => {
        state.orders.shop_1 = order({ totals: { subtotalCents: 4800, discountCents: 0, taxCents: 0, shippingCents: 0, totalCents: 4800 } });
        await stripeCall({ shopOrderId: "shop_1" });
        const names = state.stripeSessions[0].line_items.map((i: { price_data: { product_data: { name: string } } }) => i.price_data.product_data.name);
        expect(names).toEqual(["Edge Control", "Gel"]);
    });

    it("applies a one-time coupon for the discount so the Stripe total still equals the order total", async () => {
        state.orders.shop_1 = order({
            promoCode: "DB-AFF-ABC123",
            totals: { subtotalCents: 4800, discountCents: 480, taxCents: 357, shippingCents: 1500, totalCents: 6177 },
        });
        await stripeCall({ shopOrderId: "shop_1" });
        expect(state.coupons[0]).toMatchObject({ amount_off: 480, currency: "usd", duration: "once" });
        const session = state.stripeSessions[0];
        expect(session.discounts).toEqual([{ coupon: "coupon_1" }]);
        expect(sumLineItems(session.line_items) - 480).toBe(6177);
    });

    it("rejects a missing order (404), a missing id (400), a paid order (409) and an order without totals (400)", async () => {
        expect((await stripeCall({ shopOrderId: "nope" })).status).toBe(404);
        expect((await stripeCall({})).status).toBe(400);
        state.orders.shop_1 = order({ status: "paid" });
        expect((await stripeCall({ shopOrderId: "shop_1" })).status).toBe(409);
        state.orders.shop_1 = order({ totals: undefined });
        expect((await stripeCall({ shopOrderId: "shop_1" })).status).toBe(400);
        expect(state.stripeSessions).toHaveLength(0);
    });

    it("records the Stripe session on the order", async () => {
        await stripeCall({ shopOrderId: "shop_1" });
        expect(state.updates[0].data).toMatchObject({ "payment.provider": "stripe", "payment.sessionId": "cs_test_1", status: "pending_payment" });
    });
});

describe("PayPal create-order: shop orders", () => {
    it("charges totals.totalCents from the server-created order and returns the approval link", async () => {
        const res = await paypalCall({ shopOrderId: "shop_1" });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ approvalLink: "https://paypal.example/approve", paypalOrderId: "PAYPAL-1" });
        expect(state.paypalOrders[0]).toMatchObject({ amount: 6696, currency: "USD" });
        expect(state.updates[0].data).toMatchObject({ "payment.provider": "paypal", "payment.sessionId": "PAYPAL-1" });
    });

    it("also accepts the legacy orderId field", async () => {
        expect((await paypalCall({ orderId: "shop_1" })).status).toBe(200);
    });

    it("rejects a missing order, a missing id, a paid order and an order without totals; no PayPal order is created", async () => {
        expect((await paypalCall({ shopOrderId: "nope" })).status).toBe(404);
        expect((await paypalCall({})).status).toBe(400);
        state.orders.shop_1 = order({ status: "paid" });
        expect((await paypalCall({ shopOrderId: "shop_1" })).status).toBe(409);
        state.orders.shop_1 = order({ totals: undefined });
        expect((await paypalCall({ shopOrderId: "shop_1" })).status).toBe(400);
        expect(state.paypalOrders).toHaveLength(0);
    });
});
