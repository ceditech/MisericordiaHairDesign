// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

// Pins the public surface of src/lib/firebase/ownerService so splitting it into modules cannot drop an export
// that one of the ~25 importing files relies on. Firebase is mocked; nothing here touches the network.
vi.mock("firebase/firestore", () => ({
    collection: (_db: unknown, name: string) => ({ name }),
    query: (c: unknown) => c,
    orderBy: () => ({}),
    onSnapshot: () => () => {},
    doc: () => ({}),
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

import * as ownerService from "@/src/lib/firebase/ownerService";

const EXPECTED_EXPORTS = [
    "cancelBooking",
    "deleteAddon",
    "deleteBlogPost",
    "deletePreset",
    "deleteProduct",
    "deleteReview",
    "deleteStyle",
    "exportToCSV",
    "findUserByEmail",
    "getBlogStats",
    "subscribeToAddons",
    "subscribeToAssistants",
    "subscribeToBlogPosts",
    "subscribeToBookingDrafts",
    "subscribeToBookings",
    "subscribeToPresets",
    "subscribeToProducts",
    "subscribeToReviews",
    "subscribeToShopOrders",
    "subscribeToStyles",
    "updateMyProfile",
    "updateOrderStatus",
    "updateUserRole",
    "uploadFile",
    "upsertAddon",
    "upsertBlogPost",
    "upsertPreset",
    "upsertProduct",
    "upsertReview",
    "upsertStyle",
    "useAffiliateMetrics",
    "useAggregateSales",
    "useBusinessTrends",
    "useConversionMetrics",
    "useCustomersCount",
    "useNewClientsCount",
    "useTopPerformers",
];

describe("ownerService public surface", () => {
    it("exports exactly the functions the app imports", () => {
        expect(Object.keys(ownerService).sort()).toEqual(EXPECTED_EXPORTS);
    });

    it("exports functions only", () => {
        for (const name of EXPECTED_EXPORTS) {
            expect(typeof (ownerService as Record<string, unknown>)[name], name).toBe("function");
        }
    });
});

describe("ownerService behaviour that does not need Firestore", () => {
    it("upsertStyle refuses a style without an id", async () => {
        await expect(ownerService.upsertStyle({ name: "No id" })).rejects.toThrow("A style id is required");
    });

    it("exportToCSV does nothing for empty data", () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        ownerService.exportToCSV([], "empty");
        expect(click).not.toHaveBeenCalled();
        click.mockRestore();
    });

    it("exportToCSV downloads a CSV with quoted, escaped strings", () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
        let link: HTMLAnchorElement | null = null;
        const append = vi.spyOn(document.body, "appendChild").mockImplementation((node) => { link = node as HTMLAnchorElement; return node; });
        const remove = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

        ownerService.exportToCSV([{ name: 'Ada "A" L', total: 5 }], "sales");

        expect(click).toHaveBeenCalledTimes(1);
        const href = decodeURI((link as unknown as HTMLAnchorElement).getAttribute("href") ?? "");
        expect(href).toBe('data:text/csv;charset=utf-8,name,total\n"Ada ""A"" L",5');
        expect((link as unknown as HTMLAnchorElement).getAttribute("download")).toMatch(/^sales_\d{4}-\d{2}-\d{2}\.csv$/);
        click.mockRestore(); append.mockRestore(); remove.mockRestore();
    });
});
