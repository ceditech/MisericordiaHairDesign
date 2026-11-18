import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
    products: {} as Record<string, Record<string, unknown> | undefined>,
    codes: {} as Record<string, Record<string, unknown> | undefined>,
    orders: {} as Record<string, Record<string, unknown> | undefined>,
    tokens: {} as Record<string, { uid: string }>,
    writes: [] as Array<{ id: string; data: Record<string, unknown> }>,
    setThrows: false,
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const store = (col: string) => (col === "products" ? state.products : col === "codes" ? state.codes : state.orders);
    return {
        adminDb: {
            collection: (col: string) => ({
                doc: (id: string) => ({
                    get: async () => ({ exists: store(col)[id] !== undefined, data: () => store(col)[id] }),
                    set: async (data: Record<string, unknown>) => {
                        if (state.setThrows) throw new Error("internal firestore detail");
                        state.writes.push({ id, data });
                    },
                }),
            }),
        },
        adminAuth: {
            verifyIdToken: async (t: string) => {
                const d = state.tokens[t];
                if (!d) throw new Error("bad token");
                return d;
            },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));

import { POST } from "@/app/api/shop/orders/route";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const validBody = () => ({
    orderId: `shop_${UUID}`,
    items: [{ productId: "edge", quantity: 2 }],
    fulfillmentType: "pickup",
    customer: { name: "Jane Doe", email: "jane@example.com", phone: "(512) 555-1234" },
});

let ipCounter = 0;
function post(body: unknown, opts: { token?: string; ip?: string; raw?: string } = {}) {
    const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": opts.ip ?? `10.1.0.${++ipCounter}` };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    return POST(
        new NextRequest("http://localhost/api/shop/orders", { method: "POST", headers, body: opts.raw ?? JSON.stringify(body) }),
    );
}

beforeEach(() => {
    state.products = {
        edge: { name: "Edge Control", priceCents: 1500, stockStatus: "in_stock" },
        gel: { name: "Gel", priceCents: 1800, inventory: 1 },
    };
    state.codes = { "DB-AFF-ABC123": { active: true, discountPercent: 10 }, "DB-AFF-OFF000": { active: false, discountPercent: 10 } };
    state.orders = {};
    state.tokens = { "user-t": { uid: "user1" } };
    state.writes = [];
    state.setThrows = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/shop/orders: success", () => {
    it("creates the order with SERVER prices and returns the totals (guest checkout)", async () => {
        const res = await post(validBody());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({ success: true, orderId: `shop_${UUID}` });
        expect(body.totals).toEqual({ subtotalCents: 3000, discountCents: 0, taxCents: 248, shippingCents: 0, totalCents: 3248 });

        const written = state.writes[0];
        expect(written.id).toBe(`shop_${UUID}`);
        expect(written.data).toMatchObject({
            userId: null,
            customerName: "Jane Doe",
            customerEmail: "jane@example.com",
            fulfillmentType: "pickup",
            status: "pending_payment",
            totalCents: 3248,
            taxCents: 248,
            totals: { totalCents: 3248 },
            items: [{ productId: "edge", name: "Edge Control", quantity: 2, priceCents: 1500 }],
        });
    });

    it("ignores any price, total or status sent by the browser", async () => {
        const body = {
            ...validBody(),
            items: [{ productId: "edge", quantity: 2, priceCents: 1, name: "Free stuff" }],
            totalCents: 1,
            totals: { totalCents: 1 },
            status: "paid",
        };
        const res = await post(body);
        expect(res.status).toBe(200);
        const data = state.writes[0].data as { items: Array<{ priceCents: number; name: string }>; totalCents: number; status: string };
        expect(data.items[0]).toMatchObject({ priceCents: 1500, name: "Edge Control" });
        expect(data.totalCents).toBe(3248);
        expect(data.status).toBe("pending_payment");
    });

    it("adds shipping and requires an address for shipping orders", async () => {
        const noAddress = await post({ ...validBody(), fulfillmentType: "shipping" });
        expect(noAddress.status).toBe(400);
        const res = await post({
            ...validBody(),
            fulfillmentType: "shipping",
            shipping: { address: "1 Main St", city: "Manor", state: "TX", zip: "78653" },
        });
        expect(res.status).toBe(200);
        const data = state.writes[0].data as { totals: { shippingCents: number; totalCents: number }; shipping: { zipCode: string } };
        expect(data.totals.shippingCents).toBe(1500);
        expect(data.totals.totalCents).toBe(3248 + 1500);
        expect(data.shipping.zipCode).toBe("78653");
    });

    it("links the order to the signed-in user (valid token) and treats a bad token as a guest", async () => {
        await post(validBody(), { token: "user-t" });
        expect((state.writes[0].data as { userId: string }).userId).toBe("user1");
        await post(validBody(), { token: "garbage" });
        expect((state.writes[1].data as { userId: string | null }).userId).toBeNull();
    });
});

describe("POST /api/shop/orders: promo codes", () => {
    it("applies the discountPercent of an active code stored in Firestore", async () => {
        const res = await post({ ...validBody(), promoCode: "db-aff-abc123" });
        expect(res.status).toBe(200);
        const t = (await res.json()).totals;
        // subtotal 3000, discount 300, taxable 2700, tax 223
        expect(t).toEqual({ subtotalCents: 3000, discountCents: 300, taxCents: 223, shippingCents: 0, totalCents: 2923 });
        expect((state.writes[0].data as { promoCode: string }).promoCode).toBe("DB-AFF-ABC123");
    });

    it("rejects inactive, unknown and prefix-only codes, and the retired AFFILIATE10", async () => {
        for (const promoCode of ["DB-AFF-OFF000", "DB-AFF-ZZZZZZ", "AFFILIATE10", "DB-AFF-"]) {
            const res = await post({ ...validBody(), promoCode });
            expect(res.status).toBe(400);
            expect((await res.json()).error).toMatch(/promo/i);
        }
        expect(state.writes).toHaveLength(0);
    });
});

describe("POST /api/shop/orders: validation and safety", () => {
    it("400 for invalid JSON, a bad order id, bad items or bad customer data; nothing is written", async () => {
        const v = validBody();
        const bad: unknown[] = [
            { ...v, orderId: "shop_1" },
            { ...v, orderId: `order_${UUID}` },
            { ...v, items: [] },
            { ...v, items: [{ productId: "edge", quantity: 0 }] },
            { ...v, items: [{ productId: "edge", quantity: 21 }] },
            { ...v, items: [{ productId: 5, quantity: 1 }] },
            { ...v, fulfillmentType: "drone" },
            { ...v, customer: { ...v.customer, email: "nope" } },
            { ...v, customer: { ...v.customer, name: "" } },
            { ...v, customer: { ...v.customer, phone: "123" } },
        ];
        for (const b of bad) expect((await post(b)).status).toBe(400);
        expect((await post(null, { raw: "{not json" })).status).toBe(400);
        expect(state.writes).toHaveLength(0);
    });

    it("400 with a clear message for unknown, out-of-stock and over-inventory items", async () => {
        const unknown = await post({ ...validBody(), items: [{ productId: "nope", quantity: 1 }] });
        expect(unknown.status).toBe(400);
        const over = await post({ ...validBody(), items: [{ productId: "gel", quantity: 2 }] });
        expect(over.status).toBe(400);
        expect((await over.json()).error).toMatch(/only 1/i);
    });

    it("409 when the order id belongs to an order that is already paid; a pending one is re-priced", async () => {
        state.orders[`shop_${UUID}`] = { status: "paid" };
        expect((await post(validBody())).status).toBe(409);
        expect(state.writes).toHaveLength(0);
        state.orders[`shop_${UUID}`] = { status: "pending_payment" };
        expect((await post(validBody())).status).toBe(200);
    });

    it("429 after 30 order requests from one IP", async () => {
        const ip = "10.9.9.9";
        for (let i = 0; i < 30; i++) expect((await post(validBody(), { ip })).status).toBe(200);
        const res = await post(validBody(), { ip });
        expect(res.status).toBe(429);
        expect(res.headers.get("retry-after")).toBeTruthy();
    });

    it("500 without leaking internal error text", async () => {
        state.setThrows = true;
        const res = await post(validBody());
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("internal firestore detail");
    });
});
