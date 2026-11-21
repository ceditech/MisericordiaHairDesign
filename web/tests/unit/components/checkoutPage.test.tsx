// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Characterization test for the checkout page (app/checkout/page.tsx), written before its helpers were extracted
// (Phase 9.5b) and run unchanged afterwards. It pins what the page writes to Firestore before payment, what it sends
// to the PayPal route, how it creates an account, and how promo codes are applied.
// Firebase, auth, Stripe's button and fetch are mocked; pricing and the draft module are real.

const mocks = vi.hoisted(() => ({
    setDoc: vi.fn(),
    getDoc: vi.fn(),
    uploadString: vi.fn(),
    getDownloadURL: vi.fn(),
    signUpUser: vi.fn(),
    showToast: vi.fn(),
    fetch: vi.fn(),
    auth: { user: null } as { user: unknown },
}));

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/ui", () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock("@/src/providers/AuthProvider", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/src/lib/firebase/auth", () => ({ signUpUser: mocks.signUpUser }));
vi.mock("@/src/lib/firebase", () => ({ getDb: () => ({ __db: true }) }));
vi.mock("@/src/lib/firebase/client", () => ({ getStorageInstance: () => ({ __storage: true }) }));
vi.mock("firebase/firestore", () => ({
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
    setDoc: mocks.setDoc,
    getDoc: mocks.getDoc,
    serverTimestamp: () => "SERVER_TS",
}));
vi.mock("firebase/storage", () => ({
    ref: (_s: unknown, path: string) => ({ path }),
    uploadString: mocks.uploadString,
    getDownloadURL: mocks.getDownloadURL,
}));
vi.mock("@/src/lib/firebase/ownerService", () => ({
    subscribeToStyles: (cb: (d: unknown[]) => void) => {
        cb([{ id: "box", name: "Box Braids", price: "$120", duration: "3-4 hours", image: "/b.jpg" }]);
        return () => {};
    },
    subscribeToPresets: (cb: (d: unknown[]) => void) => {
        cb([
            { id: "size-small", type: "size", label: "Small", description: "Dense", priceGuidance: "+$40", priceAdjustment: 40 },
            { id: "length-mid", type: "length", label: "Mid-back", inches: "~20 inches", priceAdjustment: 0 },
        ]);
        return () => {};
    },
    subscribeToAddons: (cb: (d: unknown[]) => void) => {
        cb([]);
        return () => {};
    },
}));
// Stripe's hosted-checkout button: here it only exposes the page's before-redirect hook.
vi.mock("@/components/StripeCheckout", () => ({
    default: ({ onBeforeRedirect }: { onBeforeRedirect?: () => Promise<void> }) => (
        <button id="stripe-pay" onClick={() => onBeforeRedirect?.()}>stripe-pay</button>
    ),
}));

import CheckoutPage from "@/app/checkout/page";

const DRAFT_ID = "draft_fixed";
const PHOTO = "data:image/png;base64,AAAA";
const draft = {
    styleId: "box", sizeId: "size-small", lengthId: "length-mid", washingAddon: true, takeDownAddon: false,
    currentStep: 4, date: "November 25, 2026", time: "10:00 AM",
    name: "Ada Lovelace", email: "ada@example.com", phone: "(214) 555-0100", notes: "Fine braids",
    photoPreview: PHOTO, password: "s3cret-pass", createAccount: true,
};

const seed = (over: Record<string, unknown> = {}) => {
    sessionStorage.setItem("dedes_booking_draft", JSON.stringify({ ...draft, ...over }));
    sessionStorage.setItem("checkoutDraftId", DRAFT_ID);
};
const writes = () => mocks.setDoc.mock.calls.map(([ref, data]) => ({ path: (ref as { path: string }).path, data: data as Record<string, unknown> }));
const draftWrite = () => writes().find((w) => w.path === `bookingDrafts/${DRAFT_ID}`);
const payPal = async () => {
    fireEvent.click(await screen.findByRole("button", { name: /PayPal/ }));
    fireEvent.click(document.getElementById("paypal-pay-button") as HTMLElement);
};

beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mocks.auth = { user: null };
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
    mocks.getDoc.mockReset();
    mocks.uploadString.mockReset().mockResolvedValue(undefined);
    mocks.getDownloadURL.mockReset().mockResolvedValue("https://storage.test/photo.png");
    mocks.signUpUser.mockReset().mockResolvedValue({ user: { uid: "new-uid" } });
    mocks.showToast.mockReset();
    mocks.fetch.mockReset().mockResolvedValue({ ok: true, status: 200, json: async () => ({ approvalLink: "https://paypal.test/approve" }) });
    vi.stubGlobal("fetch", mocks.fetch);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("checkout page", () => {
    it("shows the empty state when there is no usable draft", async () => {
        render(<CheckoutPage />);
        expect(await screen.findByText("No Booking Found")).toBeTruthy();
    });

    it("writes the booking draft the server reads, then calls the PayPal route", async () => {
        seed({ createAccount: false });
        render(<CheckoutPage />);
        await payPal();

        await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
        const written = draftWrite()!.data;

        // Fields from the draft that are safe to store...
        expect(written).toMatchObject({
            id: DRAFT_ID, styleId: "box", styleName: "Box Braids", sizeName: "Small", lengthName: "Mid-back",
            date: "November 25, 2026", time: "10:00 AM", notes: "Fine braids", washingAddon: true, takeDownAddon: false,
            clientName: "Ada Lovelace", clientEmail: "ada@example.com", clientPhone: "(214) 555-0100",
            paymentChoice: "deposit", promoCode: null, provider: "paypal", userId: null, updatedAt: "SERVER_TS",
        });
        // ...and the ones that must never reach Firestore.
        expect(written).not.toHaveProperty("password");
        expect(written).not.toHaveProperty("createAccount");
        expect(written).not.toHaveProperty("photoPreview");

        const pricing = written.pricing as Record<string, number>;
        expect(Object.keys(pricing).sort()).toEqual(["amountDueCents", "baseCents", "depositCents", "discountCents", "subtotalCents", "taxCents", "totalCents"]);
        expect(pricing.amountDueCents).toBe(pricing.depositCents); // deposit is the default choice
        expect(pricing.depositCents).toBeGreaterThan(0);
        expect(written.amountPaidLabel).toMatch(/^\$\d+\.\d{2}$/);

        const [url, init] = mocks.fetch.mock.calls[0];
        expect(url).toBe("/api/payments/paypal/create-order");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({
            sessionType: "booking",
            draftId: DRAFT_ID,
            choice: "deposit",
            returnUrl: `${window.location.origin}/booking/success?provider=paypal&draftId=${DRAFT_ID}`,
            cancelUrl: `${window.location.origin}/checkout?cancelled=true`,
        });
    });

    it("saves the confirmed booking for the success page", async () => {
        seed({ createAccount: false });
        render(<CheckoutPage />);
        await payPal();
        await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());

        const confirmed = JSON.parse(localStorage.getItem("dedes_confirmed_booking") ?? "{}");
        expect(confirmed).toMatchObject({
            styleName: "Box Braids", sizeName: "Small", lengthName: "Mid-back", washingAddon: true, takeDownAddon: false,
            duration: "3-4 hours", price: "$120", date: "November 25, 2026", time: "10:00 AM",
            clientName: "Ada Lovelace", clientEmail: "ada@example.com", clientPhone: "(214) 555-0100",
            paymentChoice: "deposit", provider: "paypal", draftId: DRAFT_ID,
        });
        expect(confirmed.amountPaidLabel).toBe((draftWrite()!.data as { amountPaidLabel: string }).amountPaidLabel);
    });

    it("pays the full amount when the visitor chooses to", async () => {
        seed({ createAccount: false });
        render(<CheckoutPage />);
        await screen.findByRole("button", { name: /PayPal/ });
        fireEvent.click(document.getElementById("choice-full") as HTMLElement);
        await payPal();

        await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
        const pricing = draftWrite()!.data.pricing as Record<string, number>;
        expect(pricing.amountDueCents).toBe(pricing.totalCents);
        expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).choice).toBe("full");
        expect(draftWrite()!.data.paymentChoice).toBe("full");
    });

    it("writes the same kind of draft before the Stripe redirect, without calling the PayPal route", async () => {
        seed({ createAccount: false });
        render(<CheckoutPage />);
        fireEvent.click(await screen.findByRole("button", { name: "stripe-pay" }));

        await waitFor(() => expect(draftWrite()).toBeTruthy());
        expect(draftWrite()!.data).toMatchObject({ provider: "stripe", clientEmail: "ada@example.com" });
        expect(mocks.fetch).not.toHaveBeenCalled();
    });

    describe("PayPal errors", () => {
        const failWith = async (response: unknown) => {
            mocks.fetch.mockResolvedValue(response);
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await payPal();
        };

        it("explains a 401 as a configuration problem", async () => {
            await failWith({ ok: false, status: 401, json: async () => ({}) });
            expect(await screen.findByText(/PayPal configuration error/)).toBeTruthy();
        });

        it("shows the server's message", async () => {
            await failWith({ ok: false, status: 500, json: async () => ({ error: "Order exploded" }) });
            expect(await screen.findByText("Order exploded")).toBeTruthy();
        });

        it("falls back to the status code when the body is not JSON", async () => {
            await failWith({ ok: false, status: 502, json: async () => { throw new Error("not json"); } });
            expect(await screen.findByText("Server error (502)")).toBeTruthy();
        });

        it("fails when the server returns no approval link", async () => {
            await failWith({ ok: true, status: 200, json: async () => ({}) });
            expect(await screen.findByText("No PayPal approval link returned by server.")).toBeTruthy();
        });
    });

    describe("account creation", () => {
        it("creates the account and profile for a guest who asked for one, and links the draft to it", async () => {
            seed();
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());

            expect(mocks.signUpUser).toHaveBeenCalledWith("ada@example.com", "s3cret-pass");
            const profile = writes().find((w) => w.path === "users/new-uid")!;
            expect(profile.data).toMatchObject({ userId: "new-uid", email: "ada@example.com", displayName: "Ada Lovelace", phone: "(214) 555-0100", role: "client" });
            expect(draftWrite()!.data.userId).toBe("new-uid");
        });

        it("does not create an account for a signed-in visitor, and links the draft to them", async () => {
            mocks.auth = { user: { uid: "existing-uid" } };
            seed();
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());

            expect(mocks.signUpUser).not.toHaveBeenCalled();
            expect(draftWrite()!.data.userId).toBe("existing-uid");
        });

        it("does not create an account when the visitor did not ask for one", async () => {
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(mocks.signUpUser).not.toHaveBeenCalled();
        });

        it("carries on as a guest when the email already has an account", async () => {
            mocks.signUpUser.mockRejectedValue({ code: "auth/email-already-in-use" });
            seed();
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(draftWrite()!.data.userId).toBeNull();
        });

        it("carries on as a guest when account creation fails for another reason", async () => {
            mocks.signUpUser.mockRejectedValue({ code: "auth/network-request-failed" });
            seed();
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(draftWrite()!.data.userId).toBeNull();
        });

        it("stops with a message when the email is invalid", async () => {
            mocks.signUpUser.mockRejectedValue({ code: "auth/invalid-email" });
            seed();
            render(<CheckoutPage />);
            await payPal();

            expect(await screen.findByText("The email provided is invalid. Please double-check it.")).toBeTruthy();
            expect(draftWrite()).toBeUndefined();
            expect(mocks.fetch).not.toHaveBeenCalled();
        });
    });

    describe("inspiration photo", () => {
        it("uploads the photo with its own type and stores the download link", async () => {
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());

            expect(mocks.uploadString).toHaveBeenCalledTimes(1);
            const [ref, data, format, metadata] = mocks.uploadString.mock.calls[0];
            expect(ref.path).toMatch(new RegExp(`^bookingDrafts/${DRAFT_ID}/inspiration_\\d+\\.png$`));
            expect(data).toBe(PHOTO);
            expect(format).toBe("data_url");
            expect(metadata).toEqual({ contentType: "image/png" });
            expect(draftWrite()!.data.photoUrl).toBe("https://storage.test/photo.png");
        });

        it("keeps booking when the upload fails, with no photo link", async () => {
            mocks.uploadString.mockRejectedValue(new Error("storage down"));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(draftWrite()!.data.photoUrl).toBeNull();
        });

        it("reuses a photo that is already a link, without uploading", async () => {
            seed({ createAccount: false, photoPreview: "https://cdn.test/p.jpg" });
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(mocks.uploadString).not.toHaveBeenCalled();
            expect(draftWrite()!.data.photoUrl).toBe("https://cdn.test/p.jpg");
        });

        it("stores no photo link when there is no photo", async () => {
            seed({ createAccount: false, photoPreview: "" });
            render(<CheckoutPage />);
            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            expect(mocks.uploadString).not.toHaveBeenCalled();
            expect(draftWrite()!.data.photoUrl).toBeNull();
        });
    });

    describe("promo codes", () => {
        const apply = async (code: string) => {
            fireEvent.change(await screen.findByPlaceholderText("Promo Code"), { target: { value: code } });
            fireEvent.click(screen.getByRole("button", { name: "Apply" }));
        };
        const snap = (data: Record<string, unknown> | null) => ({ exists: () => data !== null, data: () => data });

        it("looks the code up upper-cased, applies its discount and records it on the draft", async () => {
            mocks.getDoc.mockResolvedValue(snap({ active: true, discountPercent: 20 }));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await apply("  summer ");

            await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("SUMMER applied! 20% discount added.", "success"));
            expect((mocks.getDoc.mock.calls[0][0] as { path: string }).path).toBe("codes/SUMMER");
            expect(screen.getByText("Code Applied")).toBeTruthy();

            await payPal();
            await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
            const written = draftWrite()!.data;
            expect(written.promoCode).toBe("SUMMER");
            expect((written.pricing as Record<string, number>).discountCents).toBeGreaterThan(0);
        });

        it("uses 10% when the stored percent is missing or out of range", async () => {
            for (const bad of [undefined, 0, -5, 150, "20"]) {
                cleanup();
                mocks.showToast.mockReset();
                mocks.getDoc.mockResolvedValue(snap({ active: true, discountPercent: bad }));
                seed({ createAccount: false });
                render(<CheckoutPage />);
                await apply("code");
                await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("CODE applied! 10% discount added.", "success"));
            }
        });

        it("accepts exactly 100%", async () => {
            mocks.getDoc.mockResolvedValue(snap({ active: true, discountPercent: 100 }));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await apply("free");
            await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith("FREE applied! 100% discount added.", "success"));
        });

        it.each([
            ["a code that does not exist", null],
            ["a code that is not active", { active: false, discountPercent: 20 }],
            ["a code whose active flag is not exactly true", { active: "true", discountPercent: 20 }],
        ])("rejects %s", async (_label, data) => {
            mocks.getDoc.mockResolvedValue(snap(data));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await apply("nope");

            expect(await screen.findByText("Invalid or expired promotional code.")).toBeTruthy();
            expect(screen.queryByText("Code Applied")).toBeNull();
        });

        it("asks the visitor to try again when the lookup fails", async () => {
            mocks.getDoc.mockRejectedValue(new Error("offline"));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await apply("nope");
            expect(await screen.findByText("Error validating code. Please try again.")).toBeTruthy();
        });

        it("removes an applied code", async () => {
            mocks.getDoc.mockResolvedValue(snap({ active: true, discountPercent: 20 }));
            seed({ createAccount: false });
            render(<CheckoutPage />);
            await apply("summer");
            await screen.findByText("Code Applied");
            fireEvent.click(screen.getByRole("button", { name: "Remove" }));
            expect(await screen.findByPlaceholderText("Promo Code")).toBeTruthy();
        });
    });
});
