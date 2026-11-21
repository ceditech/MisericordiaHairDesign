import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = vi.hoisted(() => ({ doc: [] as string[], collection: [] as string[] }));

vi.mock("firebase/firestore", () => ({
    collection: (_db: unknown, name: string) => { calls.collection.push(name); return { name }; },
    query: (c: unknown) => c,
    orderBy: () => ({}),
    onSnapshot: () => () => {},
    doc: (_db: unknown, name: string) => { calls.doc.push(name); return { name }; },
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: () => "ts",
    getDocs: vi.fn(),
    limit: () => ({}),
    Timestamp: class {},
}));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("@/src/lib/firebase/client", () => ({ getDb: () => ({}), getStorageInstance: () => ({}) }));
vi.mock("@/src/lib/affiliate/affiliateService", () => ({ subscribeToAffiliates: vi.fn() }));

import { PRESETS_COLLECTION } from "@/src/constants/braidPresets";
import { subscribeToPresets, upsertPreset, deletePreset } from "@/src/lib/firebase/ownerService";

describe("owner preset collection", () => {
    beforeEach(() => { calls.doc.length = 0; calls.collection.length = 0; });

    it("is the collection pricing and the storefront read", () => {
        expect(PRESETS_COLLECTION).toBe("presets");
    });

    it("reads, saves and deletes presets in the same collection", async () => {
        subscribeToPresets(() => {});
        await upsertPreset({ id: "size-small", type: "size", label: "Small", priceAdjustment: 40 });
        await deletePreset("size-small");
        expect(calls.collection).toEqual([PRESETS_COLLECTION]);
        expect(calls.doc).toEqual([PRESETS_COLLECTION, PRESETS_COLLECTION]);
    });
});
