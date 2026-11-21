import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ---- Fakes for firebase-admin, email and seeding (hoisted before imports) ----
const state = vi.hoisted(() => ({
    tokens: {} as Record<string, { uid: string; email?: string; email_verified?: boolean }>,
    users: {} as Record<string, { role?: string } | undefined>,
    bookings: {} as Record<string, Record<string, unknown> | undefined>,
    authUsersByEmail: {} as Record<string, { uid: string } | undefined>,
    createdAuthUsers: [] as string[],
    userWrites: [] as Array<{ uid: string; data: Record<string, unknown> }>,
    bookingUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    emails: [] as Array<{ to: string; bodyHtml?: string }>,
    resetUrls: [] as string[],
    seedCalls: 0,
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const docRef = (col: string, id: string) => ({
        get: async () => {
            const data = col === "users" ? state.users[id] : state.bookings[id];
            return { exists: data !== undefined, data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
            if (col === "users") state.userWrites.push({ uid: id, data });
        },
        update: async (data: Record<string, unknown>) => {
            if (col === "bookings") state.bookingUpdates.push({ id, data });
        },
    });
    return {
        adminDb: { collection: (col: string) => ({ doc: (id: string) => docRef(col, id) }) },
        adminAuth: {
            verifyIdToken: async (t: string) => {
                const d = state.tokens[t];
                if (!d) throw new Error("bad token");
                return d;
            },
            getUserByEmail: async (email: string) => {
                const u = state.authUsersByEmail[email];
                if (!u) throw Object.assign(new Error("nf"), { code: "auth/user-not-found" });
                return u;
            },
            createUser: async ({ email }: { email: string }) => {
                state.createdAuthUsers.push(email);
                return { uid: "new-uid" };
            },
            generatePasswordResetLink: async (_email: string, opts?: { url?: string }) => { state.resetUrls.push(opts?.url ?? ""); return "https://reset.example/link"; },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({
    FieldValue: { serverTimestamp: () => "TS" },
}));
vi.mock("@/src/lib/email/EmailManager", () => ({
    EmailManager: { sendEmail: async (m: { to: string; bodyHtml?: string }) => { state.emails.push({ to: m.to, bodyHtml: m.bodyHtml }); } },
}));
vi.mock("@/src/lib/email/templates/receiptTemplate", () => ({
    generateElegantReceiptEmail: () => "<p>receipt</p>",
}));
vi.mock("@/src/lib/db/seed-dashboard", () => ({
    seedDashboardData: async () => { state.seedCalls++; return { styles: 1 }; },
}));

import { POST as seedPOST } from "@/app/api/admin/seed/route";
import { POST as reactivatePOST } from "@/app/api/admin/bookings/reactivate/route";
import { POST as addAssistantPOST } from "@/app/api/admin/add-assistant/route";

const SUPER = "sales@edxstore.com";

function call(
    handler: (req: NextRequest, ctx: unknown) => Promise<Response>,
    opts: { token?: string; body?: unknown } = {},
) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    return handler(
        new NextRequest("http://localhost/api/admin/x", {
            method: "POST",
            headers,
            body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        }),
        {},
    );
}

beforeEach(() => {
    state.tokens = {
        "super-t": { uid: "s1", email: SUPER, email_verified: true },
        "owner-t": { uid: "o1", email: "owner@example.com", email_verified: true },
        "asst-t": { uid: "a1", email: "asst@example.com", email_verified: true },
        "client-t": { uid: "c1", email: "client@example.com", email_verified: true },
    };
    state.users = { o1: { role: "owner" }, a1: { role: "assistant" }, c1: { role: "client" } };
    state.bookings = { b1: { clientEmail: "c@example.com", pricing: { depositCents: 5000 } } };
    state.authUsersByEmail = {};
    state.createdAuthUsers = [];
    state.resetUrls = [];
    state.userWrites = [];
    state.bookingUpdates = [];
    state.emails = [];
    state.seedCalls = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/admin/seed (super admin only)", () => {
    it("401 without a token; seeding does not run", async () => {
        expect((await call(seedPOST)).status).toBe(401);
        expect(state.seedCalls).toBe(0);
    });
    it("403 for owner, assistant and client; seeding does not run", async () => {
        for (const token of ["owner-t", "asst-t", "client-t"]) {
            expect((await call(seedPOST, { token })).status).toBe(403);
        }
        expect(state.seedCalls).toBe(0);
    });
    it("200 for the super admin and seeds once", async () => {
        const res = await call(seedPOST, { token: "super-t" });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, results: { styles: 1 } });
        expect(state.seedCalls).toBe(1);
    });
});

describe("POST /api/admin/bookings/reactivate (staff)", () => {
    it("401 without a token; booking untouched", async () => {
        expect((await call(reactivatePOST, { body: { bookingId: "b1" } })).status).toBe(401);
        expect(state.bookingUpdates).toHaveLength(0);
    });
    it("403 for a client", async () => {
        expect((await call(reactivatePOST, { token: "client-t", body: { bookingId: "b1" } })).status).toBe(403);
        expect(state.bookingUpdates).toHaveLength(0);
    });
    it("400 for a missing or non-string bookingId", async () => {
        expect((await call(reactivatePOST, { token: "owner-t", body: {} })).status).toBe(400);
        expect((await call(reactivatePOST, { token: "owner-t", body: { bookingId: 5 } })).status).toBe(400);
    });
    it("404 for an unknown booking", async () => {
        expect((await call(reactivatePOST, { token: "owner-t", body: { bookingId: "nope" } })).status).toBe(404);
    });
    it("200 for owner and assistant: confirms the booking and emails the client", async () => {
        for (const token of ["owner-t", "asst-t"]) {
            const res = await call(reactivatePOST, { token, body: { bookingId: "b1" } });
            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ success: true });
        }
        expect(state.bookingUpdates.map((u) => u.data.status)).toEqual(["confirmed", "confirmed"]);
        expect(state.emails).toHaveLength(2);
    });
});

describe("POST /api/admin/add-assistant (super admin only)", () => {
    const body = { email: "new@example.com", name: "New Person", phone: "555-123-4567" };

    it("401 without a token; no Auth user is created", async () => {
        expect((await call(addAssistantPOST, { body })).status).toBe(401);
        expect(state.createdAuthUsers).toHaveLength(0);
    });
    it("403 for owner, assistant and client; no Auth user is created", async () => {
        for (const token of ["owner-t", "asst-t", "client-t"]) {
            expect((await call(addAssistantPOST, { token, body })).status).toBe(403);
        }
        expect(state.createdAuthUsers).toHaveLength(0);
        expect(state.userWrites).toHaveLength(0);
    });
    it("400 for missing fields or an invalid email", async () => {
        expect((await call(addAssistantPOST, { token: "super-t", body: { email: "x@y.com" } })).status).toBe(400);
        expect((await call(addAssistantPOST, { token: "super-t", body: { ...body, email: "not-an-email" } })).status).toBe(400);
        expect(state.createdAuthUsers).toHaveLength(0);
    });
    it("creates the user as an assistant (never a higher role) for the super admin", async () => {
        const res = await call(addAssistantPOST, { token: "super-t", body });
        expect(res.status).toBe(200);
        expect((await res.json()).success).toBe(true);
        expect(state.createdAuthUsers).toEqual(["new@example.com"]);
        expect(state.userWrites[0].data.role).toBe("assistant");
    });
    it("builds the welcome links from the configured app URL", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com/");
        try {
            const res = await call(addAssistantPOST, { token: "super-t", body });
            expect(res.status).toBe(200);
            expect(state.resetUrls[0]).toBe("https://staging.example.com/login?email=new%40example.com&welcome=true");
        } finally {
            vi.unstubAllEnvs();
        }
    });
    it("links an existing user straight to the login page on the configured app URL", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
        state.authUsersByEmail["new@example.com"] = { uid: "u9" };
        state.users.u9 = { role: "client" };
        try {
            const res = await call(addAssistantPOST, { token: "super-t", body });
            expect(res.status).toBe(200);
            expect(state.emails[0].bodyHtml).toContain('href="https://staging.example.com/login"');
        } finally {
            vi.unstubAllEnvs();
        }
    });
    it("falls back to the production site when no app URL is configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        try {
            await call(addAssistantPOST, { token: "super-t", body });
            expect(state.resetUrls[0]).toMatch(/^https:\/\/misericordiahairdesign\.com\/login\?/);
        } finally {
            vi.unstubAllEnvs();
        }
    });
    it("409 and no write when the target already is an owner or admin (no silent downgrade)", async () => {
        state.authUsersByEmail["boss2@example.com"] = { uid: "o9" };
        for (const role of ["owner", "admin"]) {
            state.users.o9 = { role };
            const res = await call(addAssistantPOST, { token: "super-t", body: { ...body, email: "boss2@example.com" } });
            expect(res.status).toBe(409);
        }
        expect(state.userWrites).toHaveLength(0);
    });
});
