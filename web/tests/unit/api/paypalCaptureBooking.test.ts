import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Doc = Record<string, unknown> | undefined;

const state = vi.hoisted(() => ({
    drafts: {} as Record<string, Doc>,
    events: {} as Record<string, Doc>,
    writes: [] as Array<{ op: "set" | "update"; col: string; id: string; data: Record<string, unknown> }>,
    captureCalls: [] as string[],
    captureResult: {} as Record<string, unknown>,
    emails: [] as string[],
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const ref = (col: string, id: string) => ({
        col,
        id,
        get: async () => {
            const data = col === "bookingDrafts" ? state.drafts[id] : col === "paymentEvents" ? state.events[id] : undefined;
            return { exists: data !== undefined, data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
            state.writes.push({ op: "set", col, id, data });
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
                const ops: Array<{ op: "set" | "update"; col: string; id: string; data: Record<string, unknown> }> = [];
                return {
                    set: (r: { col: string; id: string }, data: Record<string, unknown>) => ops.push({ op: "set", col: r.col, id: r.id, data }),
                    update: (r: { col: string; id: string }, data: Record<string, unknown>) => ops.push({ op: "update", col: r.col, id: r.id, data }),
                    commit: async () => {
                        state.writes.push(...ops);
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

const completed = (value: string) => ({
    status: "COMPLETED",
    purchase_units: [{ payments: { captures: [{ amount: { value, currency_code: "USD" } }] } }],
});
const draft = (over: Record<string, unknown> = {}) => ({
    styleName: "Knotless",
    date: "2026-12-01",
    time: "10:00",
    clientName: "Ann",
    clientEmail: "ann@example.com",
    clientPhone: "555",
    payment: { provider: "paypal", sessionId: "PP-1", status: "pending_payment", amountCents: 5000, choice: "deposit" },
    ...over,
});
const call = (body: Record<string, unknown>) =>
    POST(new NextRequest("http://localhost/api/payments/paypal/capture", { method: "POST", body: JSON.stringify(body) }));
const bookingCall = (over: Record<string, unknown> = {}) => call({ sessionType: "booking", draftId: "d1", paypalOrderId: "PP-1", ...over });

beforeEach(() => {
    state.drafts = { d1: draft() };
    state.events = {};
    state.writes = [];
    state.captureCalls = [];
    state.emails = [];
    state.captureResult = completed("50.00");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("PayPal capture: bookings", () => {
    it("captures, creates the booking, confirms the draft and records the event together", async () => {
        const res = await bookingCall();
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "confirmed", bookingId: "booking_d1" });
        expect(state.captureCalls).toEqual(["PP-1"]);

        const booking = state.writes.find((w) => w.col === "bookings")!;
        expect(booking.data).toMatchObject({ bookingId: "booking_d1", amountPaidCents: 5000, status: "confirmed", provider: "paypal", paypalOrderId: "PP-1" });
        expect(state.writes.find((w) => w.col === "bookingDrafts")!.data).toMatchObject({ "payment.status": "paid", status: "confirmed" });
        expect(state.writes.some((w) => w.col === "paymentEvents" && w.id === "paypal_PP-1")).toBe(true);
        expect(state.emails).toContain("ann@example.com");
    });

    it("does NOT capture when the draft is missing (404) or draftId is missing (400)", async () => {
        expect((await bookingCall({ draftId: "nope" })).status).toBe(404);
        expect((await bookingCall({ draftId: undefined })).status).toBe(400);
        expect(state.captureCalls).toHaveLength(0);
    });

    it("does NOT capture when the PayPal order is not the one created for this draft", async () => {
        const res = await bookingCall({ paypalOrderId: "PP-OTHER" });
        expect(res.status).toBe(409);
        expect(state.captureCalls).toHaveLength(0);
        expect(state.writes).toHaveLength(0);
    });

    it("does NOT capture when the draft was never started with PayPal", async () => {
        state.drafts.d1 = draft({ payment: { provider: "stripe", sessionId: "PP-1", amountCents: 5000 } });
        expect((await bookingCall()).status).toBe(409);
        expect(state.captureCalls).toHaveLength(0);
    });

    it("does not capture or create a second booking for an already confirmed draft", async () => {
        state.drafts.d1 = draft({ status: "confirmed" });
        const res = await bookingCall();
        expect((await res.json()).status).toBe("already_processed");
        expect(state.captureCalls).toHaveLength(0);
        expect(state.writes).toHaveLength(0);
    });

    it("flags the draft for review and creates no booking when the captured amount differs", async () => {
        state.captureResult = completed("1.00");
        const res = await bookingCall();
        expect(res.status).toBe(409);
        expect(state.writes.some((w) => w.col === "bookings")).toBe(false);
        expect(state.writes.find((w) => w.col === "bookingDrafts")!.data).toMatchObject({ status: "payment_review", "payment.status": "amount_mismatch" });
    });

    it("changes nothing when PayPal does not complete the capture", async () => {
        state.captureResult = { status: "PAYER_ACTION_REQUIRED" };
        const res = await bookingCall();
        expect(res.status).toBe(400);
        expect(state.writes).toHaveLength(0);
    });

    it("is idempotent: a repeated capture of the same PayPal order is ignored", async () => {
        state.events["paypal_PP-1"] = { provider: "paypal" };
        const res = await bookingCall();
        expect((await res.json()).status).toBe("already_processed");
        expect(state.captureCalls).toHaveLength(0);
    });
});
