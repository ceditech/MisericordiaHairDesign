import { describe, expect, it, vi } from "vitest";
import { confirmShopOrder } from "@/src/lib/shop/confirmShopOrder";

const ID = "shop_123e4567-e89b-42d3-a456-426614174000";
const order = (status: string) => ({ id: ID, status, provider: "stripe", amountCents: 1000 });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = async () => {};

type Call = { url: string; method: string; body?: unknown };
function makeFetch(handler: (c: Call) => Response) {
    const calls: Call[] = [];
    const fn = vi.fn(async (url: string, init?: RequestInit) => {
        const call = { url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined };
        calls.push(call);
        return handler(call);
    });
    return { fn: fn as unknown as typeof fetch, calls };
}

describe("confirmShopOrder", () => {
    it("Stripe: does not call capture, and returns paid once the order is paid", async () => {
        const { fn, calls } = makeFetch(() => json({ success: true, order: order("paid") }));
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "stripe", paypalToken: null, fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("paid");
        expect(calls.every((c) => c.url.startsWith("/api/shop/orders/"))).toBe(true);
    });

    it("Stripe: polls while the webhook has not finished, then returns paid", async () => {
        let n = 0;
        const { fn, calls } = makeFetch(() => json({ success: true, order: order(++n < 3 ? "pending_payment" : "paid") }));
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "stripe", paypalToken: null, fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("paid");
        expect(calls).toHaveLength(3);
    });

    it("returns pending (not an error) when the order is still unpaid after the last attempt", async () => {
        const { fn, calls } = makeFetch(() => json({ success: true, order: order("pending_payment") }));
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "stripe", paypalToken: null, fetchFn: fn, sleep: noSleep, maxAttempts: 4 });
        expect(r.state).toBe("pending");
        expect(calls).toHaveLength(4);
    });

    it("returns not_found for an unknown order", async () => {
        const { fn } = makeFetch(() => json({ success: false, error: "Order not found" }, 404));
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "stripe", paypalToken: null, fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("not_found");
    });

    it("PayPal: captures once with the PayPal token, then reads the order", async () => {
        const { fn, calls } = makeFetch((c) =>
            c.method === "POST" ? json({ status: "paid", orderId: ID }) : json({ success: true, order: order("paid") }),
        );
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "paypal", paypalToken: "PP-1", fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("paid");
        const capture = calls.filter((c) => c.method === "POST");
        expect(capture).toHaveLength(1);
        expect(capture[0].url).toBe("/api/payments/paypal/capture");
        expect(capture[0].body).toEqual({ sessionType: "shop", orderId: ID, paypalOrderId: "PP-1" });
    });

    it("PayPal: an already_processed capture (page reload) still shows the order", async () => {
        const { fn } = makeFetch((c) =>
            c.method === "POST" ? json({ status: "already_processed" }) : json({ success: true, order: order("paid") }),
        );
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "paypal", paypalToken: "PP-1", fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("paid");
    });

    it("PayPal: a failed capture returns a failed result with the server message and does not poll", async () => {
        const { fn, calls } = makeFetch((c) =>
            c.method === "POST" ? json({ error: "PayPal order does not match this order" }, 409) : json({ success: true, order: order("paid") }),
        );
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "paypal", paypalToken: "PP-1", fetchFn: fn, sleep: noSleep });
        expect(r).toEqual({ state: "failed", message: "PayPal order does not match this order" });
        expect(calls).toHaveLength(1);
    });

    it("returns failed when the network call throws", async () => {
        const fn = vi.fn(async () => {
            throw new Error("offline");
        }) as unknown as typeof fetch;
        const r = await confirmShopOrder({ shopOrderId: ID, provider: "stripe", paypalToken: null, fetchFn: fn, sleep: noSleep });
        expect(r.state).toBe("failed");
    });
});
