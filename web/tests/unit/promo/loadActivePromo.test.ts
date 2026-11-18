import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ codes: {} as Record<string, Record<string, unknown> | undefined> }));

vi.mock("@/src/lib/firebase/admin", () => ({
    adminDb: {
        collection: () => ({
            doc: (id: string) => ({ get: async () => ({ exists: state.codes[id] !== undefined, data: () => state.codes[id] }) }),
        }),
    },
}));

import { loadActivePromo, PromoError } from "@/src/lib/promo/loadActivePromo";

beforeEach(() => {
    state.codes = {
        "DB-AFF-ABC123": { active: true, discountPercent: 15 },
        "DB-AFF-NOPCT0": { active: true },
        "DB-AFF-OFF000": { active: false, discountPercent: 10 },
        "DB-AFF-BADPCT": { active: true, discountPercent: 500 },
    };
});

describe("loadActivePromo", () => {
    it("returns null when no code is given", async () => {
        for (const v of [undefined, null, "", "   "]) expect(await loadActivePromo(v)).toBeNull();
    });

    it("returns the stored percent for an active code, case/space-insensitively", async () => {
        expect(await loadActivePromo(" db-aff-abc123 ")).toEqual({ code: "DB-AFF-ABC123", discountPercent: 15 });
    });

    it("defaults to 10% when the stored percent is missing or out of range", async () => {
        expect((await loadActivePromo("DB-AFF-NOPCT0"))?.discountPercent).toBe(10);
        expect((await loadActivePromo("DB-AFF-BADPCT"))?.discountPercent).toBe(10);
    });

    it("rejects inactive, unknown, prefix-only, retired and non-string codes", async () => {
        for (const bad of ["DB-AFF-OFF000", "DB-AFF-ZZZZZZ", "DB-AFF-", "AFFILIATE10", 42, "X".repeat(41)]) {
            await expect(loadActivePromo(bad)).rejects.toBeInstanceOf(PromoError);
        }
    });
});
