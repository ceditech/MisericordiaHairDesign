import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BRAID_STYLES } from "@/src/lib/styles";
import { parseStylePriceCents } from "@/src/lib/pricing";

type Doc = Record<string, unknown> | undefined;

const state = vi.hoisted(() => ({
    drafts: {} as Record<string, Doc>,
    codes: {} as Record<string, Doc>,
    charged: [] as number[],
}));

vi.mock("@/src/lib/firebase/admin", () => ({
    adminDb: {
        collection: (col: string) => ({
            get: async () => ({ docs: [] }),
            doc: (id: string) => ({
                get: async () => {
                    const data = col === "bookingDrafts" ? state.drafts[id] : col === "codes" ? state.codes[id] : undefined;
                    return { exists: data !== undefined, data: () => data };
                },
                update: async () => {},
            }),
        }),
    },
}));
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/payments/stripeServer", () => ({
    getStripeServer: () => ({
        checkout: {
            sessions: {
                create: async (args: { line_items: Array<{ price_data: { unit_amount: number } }> }) => {
                    state.charged.push(args.line_items[0].price_data.unit_amount);
                    return { id: "cs_1", url: "https://stripe.example/pay" };
                },
            },
        },
    }),
}));
vi.mock("@/src/lib/payments/paypalServer", () => ({
    paypalServer: {
        createOrder: async (amount: number) => {
            state.charged.push(amount);
            return { id: "PP-1", links: [{ rel: "approve", href: "https://paypal.example/a" }] };
        },
    },
}));

import { POST as stripePOST } from "@/app/api/payments/stripe/create-session/route";
import { POST as paypalPOST } from "@/app/api/payments/paypal/create-order/route";

const style = BRAID_STYLES[0];
const fullPrice = parseStylePriceCents(style.price);

const draft = (promoCode?: string) => ({ styleId: style.id, styleName: style.name, clientEmail: "a@b.co", promoCode });
const stripeCall = () =>
    stripePOST(
        new NextRequest("http://localhost/api/payments/stripe/create-session", {
            method: "POST",
            body: JSON.stringify({ sessionType: "booking", draftId: "d1", choice: "full", successUrl: "http://localhost/s", cancelUrl: "http://localhost/c" }),
        }),
    );
const paypalCall = () =>
    paypalPOST(
        new NextRequest("http://localhost/api/payments/paypal/create-order", {
            method: "POST",
            body: JSON.stringify({ sessionType: "booking", draftId: "d1", choice: "full", returnUrl: "http://localhost/r", cancelUrl: "http://localhost/c" }),
        }),
    );

beforeEach(() => {
    state.charged = [];
    state.drafts = { d1: draft() };
    state.codes = { "DB-AFF-ABC123": { active: true, discountPercent: 20 }, "DB-AFF-OFF000": { active: false, discountPercent: 10 } };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each([
    ["Stripe", stripeCall],
    ["PayPal", paypalCall],
])("%s booking payment: promo codes", (_name, call) => {
    it("charges the full price when there is no promo code", async () => {
        expect((await call()).status).toBe(200);
        expect(state.charged).toEqual([fullPrice]);
    });

    it("applies the stored percent of an active code", async () => {
        state.drafts.d1 = draft("db-aff-abc123");
        expect((await call()).status).toBe(200);
        expect(state.charged).toEqual([fullPrice - Math.round(fullPrice * 0.2)]);
    });

    it("rejects an invented DB-AFF- code, an inactive code and AFFILIATE10 (400) and charges nothing", async () => {
        for (const code of ["DB-AFF-FAKE00", "DB-AFF-OFF000", "AFFILIATE10"]) {
            state.drafts.d1 = draft(code);
            expect((await call()).status).toBe(400);
        }
        expect(state.charged).toEqual([]);
    });
});

describe.each([
    ["Stripe", stripeCall],
    ["PayPal", paypalCall],
])("%s booking payment: unknown style", (_name, call) => {
    it("rejects a draft whose style id is unknown instead of pricing it as another style", async () => {
        state.drafts.d1 = { ...draft(), styleId: "no-such-style" };
        expect((await call()).status).toBe(400);
        expect(state.charged).toEqual([]);
    });

    it("rejects a draft with no style id", async () => {
        state.drafts.d1 = { clientEmail: "a@b.co" };
        expect((await call()).status).toBe(400);
        expect(state.charged).toEqual([]);
    });
});
