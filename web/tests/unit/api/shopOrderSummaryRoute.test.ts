import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
    orders: {} as Record<string, Record<string, unknown> | undefined>,
    getThrows: false,
}));

vi.mock("@/src/lib/firebase/admin", () => ({
    adminDb: {
        collection: () => ({
            doc: (id: string) => ({
                get: async () => {
                    if (state.getThrows) throw new Error("internal firestore detail");
                    return { exists: state.orders[id] !== undefined, data: () => state.orders[id] };
                },
            }),
        }),
    },
}));

import { GET } from "@/app/api/shop/orders/[orderId]/route";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const ID = `shop_${UUID}`;

let ipCounter = 0;
const get = (orderId: string, ip = `10.2.0.${++ipCounter}`) =>
    GET(new NextRequest(`http://localhost/api/shop/orders/${orderId}`, { headers: { "x-forwarded-for": ip } }), {
        params: Promise.resolve({ orderId }),
    });

beforeEach(() => {
    state.orders = {
        [ID]: {
            userId: "user1",
            status: "paid",
            customerName: "Jane Doe",
            customerEmail: "jane@example.com",
            customerPhone: "5125551234",
            fulfillmentType: "shipping",
            shipping: { address: "1 Main St", city: "Manor", state: "TX", zipCode: "78653", shippingCostCents: 1500 },
            items: [{ productId: "edge", name: "Edge Control", quantity: 2, priceCents: 1500, selectedOptions: null }],
            totals: { subtotalCents: 3000, discountCents: 0, taxCents: 248, shippingCents: 1500, totalCents: 4748 },
            totalCents: 4748,
            payment: { provider: "paypal", status: "paid", paypalOrderId: "PP-SECRET", stripeSessionId: "cs_secret" },
        },
    };
    state.getThrows = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/shop/orders/[orderId]", () => {
    it("400 for a malformed order id (no database lookup)", async () => {
        for (const bad of ["shop_1", "booking_123", "../x", `order_${UUID}`]) {
            expect((await get(bad)).status).toBe(400);
        }
    });

    it("404 for an unknown order", async () => {
        expect((await get(`shop_00000000-0000-4000-8000-000000000000`)).status).toBe(404);
    });

    it("returns a customer-safe summary of the order", async () => {
        const res = await get(ID);
        expect(res.status).toBe(200);
        const { order } = await res.json();
        expect(order).toEqual({
            id: ID,
            status: "paid",
            provider: "paypal",
            amountCents: 4748,
            customerName: "Jane Doe",
            fulfillmentType: "shipping",
            shipping: { address: "1 Main St", city: "Manor", state: "TX", zipCode: "78653" },
            items: [{ productId: "edge", name: "Edge Control", quantity: 2, priceCents: 1500, selectedOptions: null }],
            totals: { subtotalCents: 3000, discountCents: 0, taxCents: 248, shippingCents: 1500, totalCents: 4748 },
        });
    });

    it("never exposes the user id, email, phone or payment identifiers", async () => {
        const text = JSON.stringify(await (await get(ID)).json());
        for (const secret of ["user1", "jane@example.com", "5125551234", "PP-SECRET", "cs_secret"]) {
            expect(text).not.toContain(secret);
        }
    });

    it("reports a pending order as pending", async () => {
        state.orders[ID] = { ...state.orders[ID], status: "pending_payment" };
        expect((await (await get(ID)).json()).order.status).toBe("pending_payment");
    });

    it("429 after too many lookups from one IP", async () => {
        const ip = "10.7.7.7";
        for (let i = 0; i < 200; i++) expect((await get(ID, ip)).status).toBe(200);
        expect((await get(ID, ip)).status).toBe(429);
    });

    it("500 without leaking internal error text", async () => {
        state.getThrows = true;
        const res = await get(ID);
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("internal firestore detail");
    });
});
