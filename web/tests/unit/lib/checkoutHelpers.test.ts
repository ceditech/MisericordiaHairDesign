import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDraft } from "@/src/lib/bookingDraft";
import { calculateBookingPrice } from "@/src/lib/pricing";
import { normalizePromoCode, promoDiscountPercent } from "@/src/lib/checkout/promo";
import { parsePhotoDataUrl, resolveInspirationPhotoUrl } from "@/src/lib/checkout/photo";
import { attemptAccountCreation } from "@/src/lib/checkout/accountCreation";
import { createPayPalOrder } from "@/src/lib/checkout/paypal";
import { buildBookingDraftDocument, buildConfirmedBooking } from "@/src/lib/checkout/draftDocument";

// Unit tests for the helpers extracted from app/checkout/page.tsx. The page-level behaviour is pinned separately
// in tests/unit/components/checkoutPage.test.tsx; these cover edges that test cannot reach cheaply.

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("promo codes", () => {
    it("normalizes what the visitor typed", () => {
        expect(normalizePromoCode("  summer10 ")).toBe("SUMMER10");
    });

    it.each([
        [{ active: true, discountPercent: 25 }, 25],
        [{ active: true, discountPercent: 100 }, 100],
        [{ active: true, discountPercent: 0.5 }, 0.5],
        [{ active: true }, 10],
        [{ active: true, discountPercent: 0 }, 10],
        [{ active: true, discountPercent: -1 }, 10],
        [{ active: true, discountPercent: 101 }, 10],
        [{ active: true, discountPercent: "25" }, 10],
        [{ active: true, discountPercent: NaN }, 10],
    ])("%j -> %s", (data, pct) => {
        expect(promoDiscountPercent(data)).toBe(pct);
    });

    it.each([[null], [undefined], [{ active: false, discountPercent: 20 }], [{ active: "true", discountPercent: 20 }], [{ discountPercent: 20 }]])(
        "%j is not a usable code",
        (data) => {
            expect(promoDiscountPercent(data as Record<string, unknown> | null | undefined)).toBeNull();
        }
    );
});

describe("parsePhotoDataUrl", () => {
    it.each([
        ["data:image/png;base64,AAAA", "image/png", "png"],
        ["data:image/jpeg;base64,AAAA", "image/jpeg", "jpeg"],
        ["data:image/svg+xml;base64,AAAA", "image/svg+xml", "svg+xml"],
        ["data:image;base64,AAAA", "image", "jpg"],
        ["not a data url", "image/jpeg", "jpeg"],
    ])("%s", (url, mimeType, extension) => {
        expect(parsePhotoDataUrl(url)).toEqual({ mimeType, extension });
    });
});

describe("resolveInspirationPhotoUrl", () => {
    const PHOTO = "data:image/webp;base64,AAAA";
    const deps = (over: Partial<Parameters<typeof resolveInspirationPhotoUrl>[2]> = {}) => ({
        upload: vi.fn().mockResolvedValue(undefined),
        getUrl: vi.fn().mockResolvedValue("https://storage.test/p.webp"),
        now: () => 1234,
        ...over,
    });

    it("uploads under the draft's folder and returns the download link", async () => {
        const d = deps();
        await expect(resolveInspirationPhotoUrl(PHOTO, "draft_1", d)).resolves.toBe("https://storage.test/p.webp");
        expect(d.upload).toHaveBeenCalledWith("bookingDrafts/draft_1/inspiration_1234.webp", PHOTO, "image/webp");
        expect(d.getUrl).toHaveBeenCalledWith("bookingDrafts/draft_1/inspiration_1234.webp");
    });

    it("keeps an existing link and ignores empty or other values", async () => {
        const d = deps();
        await expect(resolveInspirationPhotoUrl("https://cdn.test/a.jpg", "d", d)).resolves.toBe("https://cdn.test/a.jpg");
        await expect(resolveInspirationPhotoUrl("", "d", d)).resolves.toBeNull();
        await expect(resolveInspirationPhotoUrl(undefined, "d", d)).resolves.toBeNull();
        await expect(resolveInspirationPhotoUrl("blob:xyz", "d", d)).resolves.toBeNull();
        expect(d.upload).not.toHaveBeenCalled();
    });

    it("gives null when the upload fails or the link cannot be read", async () => {
        await expect(resolveInspirationPhotoUrl(PHOTO, "d", deps({ upload: vi.fn().mockRejectedValue(new Error("x")) }))).resolves.toBeNull();
        await expect(resolveInspirationPhotoUrl(PHOTO, "d", deps({ getUrl: vi.fn().mockRejectedValue(new Error("x")) }))).resolves.toBeNull();
    });

    it("gives up on an upload that takes longer than the timeout", async () => {
        vi.useFakeTimers();
        try {
            const never = deps({ upload: vi.fn(() => new Promise(() => {})), timeoutMs: 15000 });
            const result = resolveInspirationPhotoUrl(PHOTO, "d", never);
            await vi.advanceTimersByTimeAsync(15000);
            await expect(result).resolves.toBeNull();
            expect(never.getUrl).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it("does not leave the timeout timer running after a quick upload", async () => {
        vi.useFakeTimers();
        try {
            await resolveInspirationPhotoUrl(PHOTO, "d", deps());
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("attemptAccountCreation", () => {
    const draft = { createAccount: true, password: "pw", email: "a@b.co", name: "Ada", phone: "(214) 555-0100", currentStep: 4, date: "", time: "" } as BookingDraft;
    const make = (over: Record<string, unknown> = {}) => ({
        signUp: vi.fn().mockResolvedValue({ user: { uid: "u1" } }),
        writeProfile: vi.fn().mockResolvedValue(undefined),
        ...over,
    }) as Parameters<typeof attemptAccountCreation>[2] & { signUp: ReturnType<typeof vi.fn>; writeProfile: ReturnType<typeof vi.fn> };

    it("creates the account and its profile and returns the new id", async () => {
        const deps = make();
        await expect(attemptAccountCreation(false, draft, deps)).resolves.toBe("u1");
        expect(deps.signUp).toHaveBeenCalledWith("a@b.co", "pw");
        expect(deps.writeProfile).toHaveBeenCalledWith("u1", draft);
    });

    it.each([
        ["a signed-in visitor", true, draft],
        ["no account requested", false, { ...draft, createAccount: false }],
        ["no password", false, { ...draft, password: "" }],
        ["a missing flag", false, { ...draft, createAccount: undefined }],
    ])("does nothing for %s", async (_label, signedIn, d) => {
        const deps = make();
        await expect(attemptAccountCreation(signedIn as boolean, d as BookingDraft, deps)).resolves.toBeNull();
        expect(deps.signUp).not.toHaveBeenCalled();
    });

    it("keeps going as a guest when the email is taken or sign-up fails otherwise", async () => {
        await expect(attemptAccountCreation(false, draft, make({ signUp: vi.fn().mockRejectedValue({ code: "auth/email-already-in-use" }) }))).resolves.toBeNull();
        await expect(attemptAccountCreation(false, draft, make({ signUp: vi.fn().mockRejectedValue(new Error("boom")) }))).resolves.toBeNull();
    });

    it("throws a message for an invalid email", async () => {
        await expect(attemptAccountCreation(false, draft, make({ signUp: vi.fn().mockRejectedValue({ code: "auth/invalid-email" }) })))
            .rejects.toThrow("The email provided is invalid. Please double-check it.");
    });

    it("still returns the new user's id when only the profile write fails", async () => {
        const deps = make({ writeProfile: vi.fn().mockRejectedValue(new Error("rules")) });
        await expect(attemptAccountCreation(false, draft, deps)).resolves.toBe("u1");
    });
});

describe("createPayPalOrder", () => {
    const args = { draftId: "d1", choice: "full" as const, origin: "https://shop.test" };
    const respond = (res: unknown) => vi.fn().mockResolvedValue(res) as unknown as typeof fetch;

    it("posts the booking session and returns the approval link", async () => {
        const fetchFn = respond({ ok: true, status: 200, json: async () => ({ approvalLink: "https://paypal.test/a" }) });
        await expect(createPayPalOrder(args, fetchFn)).resolves.toBe("https://paypal.test/a");

        const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toBe("/api/payments/paypal/create-order");
        expect(init.method).toBe("POST");
        expect(init.headers).toEqual({ "Content-Type": "application/json" });
        expect(JSON.parse(init.body)).toEqual({
            sessionType: "booking",
            draftId: "d1",
            choice: "full",
            returnUrl: "https://shop.test/booking/success?provider=paypal&draftId=d1",
            cancelUrl: "https://shop.test/checkout?cancelled=true",
        });
    });

    it.each([
        ["a 401", { ok: false, status: 401, json: async () => ({ error: "ignored" }) }, /PayPal configuration error/],
        ["a server message", { ok: false, status: 500, json: async () => ({ error: "Order exploded" }) }, /^Order exploded$/],
        ["a body that is not JSON", { ok: false, status: 502, json: async () => { throw new Error("x"); } }, /^Server error \(502\)$/],
        ["a missing link", { ok: true, status: 200, json: async () => ({}) }, /^No PayPal approval link returned by server\.$/],
        ["an empty link", { ok: true, status: 200, json: async () => ({ approvalLink: "" }) }, /No PayPal approval link/],
    ])("throws for %s", async (_label, res, message) => {
        await expect(createPayPalOrder(args, respond(res))).rejects.toThrow(message);
    });

    it("lets a network failure through", async () => {
        const fetchFn = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
        await expect(createPayPalOrder(args, fetchFn)).rejects.toThrow("offline");
    });
});

describe("booking draft document", () => {
    const draft: BookingDraft = {
        styleId: "box", sizeId: "size-small", lengthId: "gone", washingAddon: true, currentStep: 4,
        date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100", notes: "n",
        photoPreview: "data:image/png;base64,AAAA", password: "pw", createAccount: true,
    };
    const sizePresets = [{ id: "size-small", type: "size", label: "Small", description: "", priceGuidance: "", priceAdjustment: 4000 }] as never[];
    const pricing = calculateBookingPrice({
        stylePrice: "$120", sizeId: "size-small", lengthId: "", washingAddon: true, takeDownAddon: false,
        sizePresets: sizePresets as never, lengthPresets: [], addons: [],
    });
    const base = {
        draft, id: "draft_1", userId: "u1", style: { name: "Box Braids" }, sizePresets, lengthPresets: [],
        photoUrl: "https://storage.test/p.png", amountDueCents: pricing.depositCents, paymentChoice: "deposit" as const,
        promoCode: null, provider: "stripe" as const, pricing,
    };

    it("never includes the password, account flag or raw photo", () => {
        const doc = buildBookingDraftDocument(base);
        for (const key of ["password", "createAccount", "photoPreview", "inspirationPhoto"]) expect(doc).not.toHaveProperty(key);
        expect(doc.photoUrl).toBe("https://storage.test/p.png");
    });

    it("names the style and presets, and uses null for what is missing", () => {
        const doc = buildBookingDraftDocument({ ...base, userId: null, photoUrl: null });
        expect(doc).toMatchObject({ id: "draft_1", userId: null, styleId: "box", styleName: "Box Braids", sizeName: "Small", lengthName: null, photoUrl: null, promoCode: null, provider: "stripe" });
    });

    it("snapshots the pricing with the amount due now", () => {
        const doc = buildBookingDraftDocument({ ...base, promoCode: "SUMMER" });
        expect(doc.promoCode).toBe("SUMMER");
        expect(doc.pricing).toEqual({
            baseCents: pricing.baseCents, subtotalCents: pricing.subtotalCents, discountCents: pricing.discountCents,
            taxCents: pricing.taxCents, totalCents: pricing.totalCents, depositCents: pricing.depositCents, amountDueCents: pricing.depositCents,
        });
        expect(doc.amountPaidLabel).toMatch(/^\$\d+\.\d{2}$/);
    });

    it("builds the confirmed booking with fallback preset names", () => {
        const confirmed = buildConfirmedBooking({
            draft, id: "draft_1", style: { name: "Box Braids", duration: "3-4 hours", price: 120 }, sizePresets, lengthPresets: [],
            amountDueCents: 5000, paymentChoice: "deposit", provider: "paypal",
        });
        expect(confirmed).toEqual({
            styleName: "Box Braids", sizeName: "Small", lengthName: "Shoulder", washingAddon: true, takeDownAddon: false,
            duration: "3-4 hours", price: "120", date: "November 25, 2026", time: "10:00 AM",
            clientName: "Ada", clientEmail: "a@b.co", clientPhone: "(214) 555-0100",
            amountPaidLabel: "$50.00", paymentChoice: "deposit", provider: "paypal", draftId: "draft_1",
        });
        expect(buildConfirmedBooking({ ...{ draft: { ...draft, sizeId: "gone" }, id: "x", style: { name: "B", duration: "d", price: "$1" }, sizePresets, lengthPresets: [], amountDueCents: 0, paymentChoice: "full" as const, provider: "stripe" as const } }).sizeName).toBe("Medium");
    });
});
