import { describe, expect, it, vi } from "vitest";
import { capturePayPalBooking } from "@/src/lib/bookings/capturePayPalBooking";

describe("capturePayPalBooking", () => {
    it("posts the draft and PayPal order id once and reports success", async () => {
        const fn = vi.fn(async () => new Response(JSON.stringify({ status: "confirmed" }), { status: 200 }));
        const r = await capturePayPalBooking({ draftId: "d1", paypalToken: "PP-1", fetchFn: fn as unknown as typeof fetch });
        expect(r).toEqual({ ok: true });
        expect(fn).toHaveBeenCalledTimes(1);
        const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("/api/payments/paypal/capture");
        expect(JSON.parse(String(init.body))).toEqual({ sessionType: "booking", draftId: "d1", paypalOrderId: "PP-1" });
    });

    it("treats an already_processed reload as success", async () => {
        const fn = vi.fn(async () => new Response(JSON.stringify({ status: "already_processed" }), { status: 200 }));
        expect((await capturePayPalBooking({ draftId: "d1", paypalToken: "PP-1", fetchFn: fn as unknown as typeof fetch })).ok).toBe(true);
    });

    it("returns the server message when capture fails", async () => {
        const fn = vi.fn(async () => new Response(JSON.stringify({ error: "PayPal order does not match this booking" }), { status: 409 }));
        const r = await capturePayPalBooking({ draftId: "d1", paypalToken: "PP-1", fetchFn: fn as unknown as typeof fetch });
        expect(r).toEqual({ ok: false, message: "PayPal order does not match this booking" });
    });

    it("returns a failure when the network throws", async () => {
        const fn = vi.fn(async () => {
            throw new Error("offline");
        });
        expect((await capturePayPalBooking({ draftId: "d1", paypalToken: "PP-1", fetchFn: fn as unknown as typeof fetch })).ok).toBe(false);
    });
});
