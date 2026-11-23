import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
    tokens: {} as Record<string, { uid: string; email?: string; email_verified?: boolean }>,
    users: {} as Record<string, { role?: string } | undefined>,
    bookings: [] as Array<{ id: string; data: Record<string, unknown> }>,
    emails: [] as string[],
    batchUpdates: 0,
    queryThrows: false,
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const query = {
        where: () => query,
        get: async () => {
            if (state.queryThrows) throw new Error("internal firestore detail");
            return {
                empty: state.bookings.length === 0,
                docs: state.bookings.map((b) => ({ id: b.id, ref: { id: b.id }, data: () => b.data })),
            };
        },
    };
    return {
        adminDb: {
            collection: (name: string) =>
                name === "users"
                    ? { doc: (id: string) => ({ get: async () => ({ exists: state.users[id] !== undefined, data: () => state.users[id] }) }) }
                    : query,
            batch: () => ({ update: () => { state.batchUpdates++; }, commit: async () => {} }),
        },
        adminAuth: {
            verifyIdToken: async (t: string) => {
                const d = state.tokens[t];
                if (!d) throw new Error("bad token");
                return d;
            },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/email/EmailManager", () => ({
    EmailManager: { sendEmail: async (m: { to: string }) => { state.emails.push(m.to); } },
}));
vi.mock("@/src/lib/notifications/emailTemplates", () => ({
    buildReminderEmail: () => ({ subject: "Reminder", html: "<p>hi</p>" }),
}));

import { GET, POST } from "@/app/api/admin/reminders/route";

const SECRET = "cron-secret-value";

const post = (authorization?: string) =>
    POST(new NextRequest("http://localhost/api/admin/reminders", { method: "POST", headers: authorization ? { authorization } : {} }));

beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    state.tokens = {
        "super-t": { uid: "s1", email: "sales@edxstore.com", email_verified: true },
        "owner-t": { uid: "o1", email: "owner@example.com", email_verified: true },
    };
    state.users = { o1: { role: "owner" } };
    state.bookings = [{ id: "b1", data: { clientEmail: "c@example.com" } }];
    state.emails = [];
    state.batchUpdates = 0;
    state.queryThrows = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/admin/reminders", () => {
    it("401 with no credentials; no email is sent", async () => {
        expect((await post()).status).toBe(401);
        expect(state.emails).toHaveLength(0);
    });

    it("FAIL CLOSED: 401 with no credentials even when CRON_SECRET is not configured", async () => {
        delete process.env.CRON_SECRET;
        expect((await post()).status).toBe(401);
        expect((await post("Bearer undefined")).status).toBe(401);
        expect(state.emails).toHaveLength(0);
    });

    it("401 for a wrong secret, 403 for an owner ID token", async () => {
        expect((await post("Bearer wrong")).status).toBe(401);
        expect((await post("Bearer owner-t")).status).toBe(403);
        expect(state.emails).toHaveLength(0);
    });

    it("200 and sends the reminder for the scheduler (correct secret)", async () => {
        const res = await post(`Bearer ${SECRET}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ success: true, count: 1 });
        expect(state.emails).toEqual(["c@example.com"]);
        expect(state.batchUpdates).toBe(1);
    });

    it("200 for the super admin using the dashboard button (ID token)", async () => {
        const res = await post("Bearer super-t");
        expect(res.status).toBe(200);
        expect(state.emails).toEqual(["c@example.com"]);
    });

    it("keeps skipping bookings that already have reminderSent", async () => {
        state.bookings = [{ id: "b1", data: { clientEmail: "c@example.com", reminderSent: true } }];
        const res = await post(`Bearer ${SECRET}`);
        expect(await res.json()).toMatchObject({ count: 0 });
        expect(state.emails).toHaveLength(0);
    });

    it("500 without leaking internal error text", async () => {
        state.queryThrows = true;
        const res = await post(`Bearer ${SECRET}`);
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("internal firestore detail");
    });
});

describe("GET /api/admin/reminders", () => {
    it("still returns the harmless usage message without any data access", async () => {
        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ usage: "POST /api/admin/reminders" });
    });
});
