import { describe, expect, it } from "vitest";
import { newDraftId, sanitizeDraftForPersistence, type BookingDraft } from "@/lib/bookingDraft";

const draft: BookingDraft = {
    currentStep: 4,
    styleId: "knotless-braids",
    date: "2026-12-01",
    time: "10:00 AM",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "5551234567",
    notes: "hello",
    photoPreview: "data:image/png;base64,AAAA",
    password: "plaintext-secret",
    createAccount: true,
};

describe("sanitizeDraftForPersistence", () => {
    it("never lets the account password reach the persisted draft", () => {
        const out = sanitizeDraftForPersistence(draft);
        expect(out).not.toHaveProperty("password");
        expect(JSON.stringify(out)).not.toContain("plaintext-secret");
    });

    it("drops account-creation flags and the raw photo data URL", () => {
        const out = sanitizeDraftForPersistence({ ...draft, inspirationPhoto: "blob" } as BookingDraft);
        expect(out).not.toHaveProperty("createAccount");
        expect(out).not.toHaveProperty("photoPreview");
        expect(out).not.toHaveProperty("inspirationPhoto");
    });

    it("keeps the booking fields and removes undefined values", () => {
        const out = sanitizeDraftForPersistence({ ...draft, sizeId: undefined });
        expect(out).toMatchObject({ styleId: "knotless-braids", date: "2026-12-01", name: "Jane Doe", email: "jane@example.com" });
        expect(out).not.toHaveProperty("sizeId");
    });

    it("does not mutate the input draft (the checkout still needs the password to create the account)", () => {
        sanitizeDraftForPersistence(draft);
        expect(draft.password).toBe("plaintext-secret");
        expect(draft.photoPreview).toBeDefined();
    });
});

describe("newDraftId", () => {
    it("returns an unguessable draft_<uuid> id", () => {
        expect(newDraftId()).toMatch(/^draft_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("returns a different id each time", () => {
        const ids = new Set(Array.from({ length: 50 }, () => newDraftId()));
        expect(ids.size).toBe(50);
    });
});
