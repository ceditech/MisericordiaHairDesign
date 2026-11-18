import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Doc = { id: string; data: Record<string, unknown> };

const state = vi.hoisted(() => ({
    tokens: {} as Record<string, { uid: string; email?: string; email_verified?: boolean }>,
    bookings: [] as Array<{ id: string; data: Record<string, unknown> }>,
    queryThrows: false,
    lastFilters: [] as Array<[string, string, unknown]>,
    lastLimit: null as number | null,
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const makeQuery = (filters: Array<[string, string, unknown]>, limit: number | null) => ({
        where: (f: string, op: string, v: unknown) => makeQuery([...filters, [f, op, v]], limit),
        limit: (n: number) => makeQuery(filters, n),
        get: async () => {
            if (state.queryThrows) throw new Error("internal firestore detail");
            state.lastFilters = filters;
            state.lastLimit = limit;
            let rows = state.bookings.filter((b) => filters.every(([f, , v]) => b.data[f] === v));
            if (limit !== null) rows = rows.slice(0, limit);
            return { docs: rows.map((b: Doc) => ({ id: b.id, data: () => b.data })) };
        },
    });
    return {
        adminDb: { collection: () => makeQuery([], null) },
        adminAuth: {
            verifyIdToken: async (t: string) => {
                const d = state.tokens[t];
                if (!d) throw new Error("bad token");
                return d;
            },
        },
    };
});

import { GET } from "@/app/api/bookings/mine/route";

const ts = (ms: number) => ({ toMillis: () => ms });
const get = (token?: string) =>
    GET(new NextRequest("http://localhost/api/bookings/mine", { headers: token ? { authorization: `Bearer ${token}` } : {} }), {});

beforeEach(() => {
    state.tokens = {
        "alice-t": { uid: "alice", email: "alice@example.com", email_verified: true },
        "bob-t": { uid: "bob", email: "bob@example.com", email_verified: true },
    };
    state.bookings = [
        {
            id: "b1",
            data: {
                userId: "alice", styleId: "knotless", styleName: "Knotless Braids", date: "Monday, December 7, 2026", time: "10:00 AM",
                status: "confirmed", createdAt: ts(1000),
                stripeSessionId: "cs_secret", clientEmail: "alice@example.com", clientPhone: "5551234567", clientName: "Alice",
                notes: "private note", amountCents: 12000, amountPaidCents: 5000, provider: "stripe", paymentChoice: "deposit",
            },
        },
        { id: "b2", data: { userId: "alice", styleName: "Boho", date: "Tuesday, December 8, 2026", time: "1:00 PM", status: "confirmed", createdAt: ts(3000) } },
        { id: "b3", data: { userId: "bob", styleName: "Bob's style", date: "x", time: "y", status: "confirmed", createdAt: ts(2000) } },
        { id: "b4", data: { userId: null, styleName: "Guest booking", date: "x", time: "y", status: "confirmed" } },
        { id: "b5", data: { userId: "alice", styleName: "No timestamp", date: "x", time: "y", status: "pending" } },
    ];
    state.queryThrows = false;
    state.lastFilters = [];
    state.lastLimit = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/bookings/mine", () => {
    it("401 without a token or with an invalid one", async () => {
        expect((await get()).status).toBe(401);
        expect((await get("nope")).status).toBe(401);
    });

    it("returns only the caller's bookings, newest first, bookings without a timestamp last", async () => {
        const res = await get("alice-t");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.bookings.map((b: { id: string }) => b.id)).toEqual(["b2", "b1", "b5"]);
    });

    it("never returns another user's or guest bookings", async () => {
        const bob = await (await get("bob-t")).json();
        expect(bob.bookings.map((b: { id: string }) => b.id)).toEqual(["b3"]);
        expect(JSON.stringify(bob)).not.toContain("Guest booking");
    });

    it("filters by the verified uid and bounds the query", async () => {
        await get("alice-t");
        expect(state.lastFilters).toEqual([["userId", "==", "alice"]]);
        expect(state.lastLimit).toBeGreaterThan(0);
    });

    it("returns only the fields the dashboard needs (no payment ids, contact details, notes or amounts)", async () => {
        const body = await (await get("alice-t")).json();
        const b1 = body.bookings.find((b: { id: string }) => b.id === "b1");
        expect(b1).toEqual({
            id: "b1", userId: "alice", styleId: "knotless", styleName: "Knotless Braids",
            date: "Monday, December 7, 2026", time: "10:00 AM", status: "confirmed", createdAt: new Date(1000).toISOString(),
        });
        const text = JSON.stringify(body);
        for (const secret of ["cs_secret", "5551234567", "private note", "amountCents", "stripe"]) {
            expect(text).not.toContain(secret);
        }
    });

    it("500 without leaking internal error text", async () => {
        state.queryThrows = true;
        const res = await get("alice-t");
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("internal firestore detail");
    });
});
