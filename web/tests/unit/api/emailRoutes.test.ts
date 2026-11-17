import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
    tokens: {} as Record<string, { uid: string; email?: string; email_verified?: boolean }>,
    users: {} as Record<string, { role?: string } | undefined>,
    googleEmail: "sales@edxstore.com",
    googleThrows: false,
    googleTokens: {} as Record<string, unknown>,
    savedPrimary: [] as unknown[],
    savedOther: [] as Array<{ email: string; cfg: unknown }>,
    deleted: [] as string[],
    deleteError: null as string | null,
    existing: null as { refreshToken?: string } | null,
}));

vi.mock("@/src/lib/firebase/admin", () => ({
    adminDb: {
        collection: () => ({
            doc: (id: string) => ({
                get: async () => ({ exists: state.users[id] !== undefined, data: () => state.users[id] }),
            }),
        }),
    },
    adminAuth: {
        verifyIdToken: async (t: string) => {
            const d = state.tokens[t];
            if (!d) throw new Error("bad token");
            return d;
        },
    },
}));
vi.mock("googleapis", () => {
    class OAuth2 {
        generateAuthUrl(o: { state: string }) {
            return `https://accounts.google.com/auth?state=${encodeURIComponent(o.state)}`;
        }
        async getToken() {
            return { tokens: { ...state.googleTokens } };
        }
        setCredentials() {}
    }
    return {
        google: {
            auth: { OAuth2 },
            oauth2: () => ({
                userinfo: {
                    get: async () => {
                        if (state.googleThrows) throw new TypeError("Cannot read properties of undefined (internal)");
                        return { data: { email: state.googleEmail } };
                    },
                },
            }),
        },
    };
});
vi.mock("@/src/lib/email/SenderRepository", () => ({
    SenderRepository: {
        getAllSenders: async () => [
            { email: "sales@edxstore.com", name: "Sales", isPrimary: true, refreshToken: "SECRET-REFRESH", accessToken: "SECRET-ACCESS", updatedAt: 1 },
        ],
        deleteSender: async (e: string) => {
            if (state.deleteError) throw new Error(state.deleteError);
            state.deleted.push(e);
        },
        getSender: async () => state.existing,
        getPrimarySender: async () => state.existing,
        savePrimarySender: async (c: unknown) => { state.savedPrimary.push(c); },
        saveSender: async (email: string, cfg: unknown) => { state.savedOther.push({ email, cfg }); },
    },
}));

import { GET as authGET } from "@/app/api/admin/email/auth/route";
import { GET as callbackGET } from "@/app/api/admin/email/callback/route";
import { GET as sendersGET, DELETE as sendersDELETE } from "@/app/api/admin/email/senders/route";
import { createOAuthState, OAUTH_NONCE_COOKIE } from "@/src/lib/auth/oauthState";

const SECRET = "client-secret-for-tests";
const SUPER = "sales@edxstore.com";

function req(path: string, opts: { token?: string; method?: string; cookie?: string } = {}) {
    const headers: Record<string, string> = {};
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts.cookie) headers.cookie = opts.cookie;
    return new NextRequest(`http://localhost${path}`, { method: opts.method ?? "GET", headers });
}

beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "cid";
    process.env.GOOGLE_CLIENT_SECRET = SECRET;
    state.tokens = {
        "super-t": { uid: "s1", email: SUPER, email_verified: true },
        "owner-t": { uid: "o1", email: "owner@example.com", email_verified: true },
    };
    state.users = { o1: { role: "owner" } };
    state.googleEmail = SUPER;
    state.googleThrows = false;
    state.googleTokens = { access_token: "a", refresh_token: "r", expiry_date: 123 };
    state.savedPrimary = [];
    state.savedOther = [];
    state.deleted = [];
    state.deleteError = null;
    state.existing = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("GET /api/admin/email/senders and DELETE (super admin only)", () => {
    it("401 without a token, 403 for an owner", async () => {
        expect((await sendersGET(req("/api/admin/email/senders"), {})).status).toBe(401);
        expect((await sendersGET(req("/api/admin/email/senders", { token: "owner-t" }), {})).status).toBe(403);
        expect((await sendersDELETE(req("/api/admin/email/senders?email=a@b.com", { method: "DELETE" }), {})).status).toBe(401);
        expect(
            (await sendersDELETE(req("/api/admin/email/senders?email=a@b.com", { method: "DELETE", token: "owner-t" }), {})).status,
        ).toBe(403);
        expect(state.deleted).toHaveLength(0);
    });
    it("lists senders for the super admin without leaking tokens", async () => {
        const res = await sendersGET(req("/api/admin/email/senders", { token: "super-t" }), {});
        expect(res.status).toBe(200);
        const text = JSON.stringify(await res.json());
        expect(text).toContain("sales@edxstore.com");
        expect(text).not.toContain("SECRET-REFRESH");
        expect(text).not.toContain("SECRET-ACCESS");
    });
    it("DELETE requires the email param and works for the super admin", async () => {
        expect((await sendersDELETE(req("/api/admin/email/senders", { method: "DELETE", token: "super-t" }), {})).status).toBe(400);
        const ok = await sendersDELETE(req("/api/admin/email/senders?email=x@y.com", { method: "DELETE", token: "super-t" }), {});
        expect(ok.status).toBe(200);
        expect(state.deleted).toEqual(["x@y.com"]);
    });
    it("DELETE does not leak internal error text", async () => {
        state.deleteError = "internal firestore path /secret";
        const res = await sendersDELETE(req("/api/admin/email/senders?email=x@y.com", { method: "DELETE", token: "super-t" }), {});
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("secret");
    });
});

describe("GET /api/admin/email/auth (starts OAuth; super admin only)", () => {
    it("401/403 for anonymous and non-super-admin callers", async () => {
        expect((await authGET(req("/api/admin/email/auth?email=a@b.com"), {})).status).toBe(401);
        expect((await authGET(req("/api/admin/email/auth?email=a@b.com", { token: "owner-t" }), {})).status).toBe(403);
    });
    it("400 for an invalid target email", async () => {
        expect((await authGET(req("/api/admin/email/auth?email=nope", { token: "super-t" }), {})).status).toBe(400);
    });
    it("returns the Google URL as JSON with a signed state and sets the nonce cookie", async () => {
        const res = await authGET(req("/api/admin/email/auth?email=Sender@Example.com", { token: "super-t" }), {});
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        const stateParam = new URL(body.url).searchParams.get("state")!;
        expect(stateParam).toContain(".");
        const cookie = res.headers.get("set-cookie")!;
        expect(cookie).toContain(`${OAUTH_NONCE_COOKIE}=`);
        expect(cookie.toLowerCase()).toContain("httponly");
    });
});

describe("GET /api/admin/email/callback (state-verified, no bearer token possible)", () => {
    const stateFor = (over = {}) =>
        createOAuthState({ email: SUPER, uid: "s1", nonce: "nonce-1", ...over }, SECRET);
    const location = (res: Response) => res.headers.get("location") ?? "";

    it("rejects a missing state and saves nothing", async () => {
        const res = await callbackGET(req("/api/admin/email/callback?code=abc"));
        expect(location(res)).toContain("email_error=");
        expect(state.savedPrimary).toHaveLength(0);
    });
    it("rejects a forged/legacy plain-email state and saves nothing", async () => {
        const res = await callbackGET(req(`/api/admin/email/callback?code=abc&state=${encodeURIComponent(SUPER)}`));
        expect(location(res)).toContain("email_error=");
        expect(state.savedPrimary).toHaveLength(0);
    });
    it("rejects a valid state when the nonce cookie is missing or different (login CSRF)", async () => {
        const s = encodeURIComponent(stateFor());
        const none = await callbackGET(req(`/api/admin/email/callback?code=abc&state=${s}`));
        const wrong = await callbackGET(
            req(`/api/admin/email/callback?code=abc&state=${s}`, { cookie: `${OAUTH_NONCE_COOKIE}=other` }),
        );
        expect(location(none)).toContain("email_error=");
        expect(location(wrong)).toContain("email_error=");
        expect(state.savedPrimary).toHaveLength(0);
    });
    it("completes the flow for a valid state and matching nonce (primary sender)", async () => {
        const s = encodeURIComponent(stateFor());
        const res = await callbackGET(
            req(`/api/admin/email/callback?code=abc&state=${s}`, { cookie: `${OAUTH_NONCE_COOKIE}=nonce-1` }),
        );
        expect(location(res)).toContain("email_success=true");
        expect(state.savedPrimary).toHaveLength(1);
        expect(res.headers.get("set-cookie") ?? "").toContain(`${OAUTH_NONCE_COOKIE}=;`);
    });
    it("rejects an account mismatch and saves nothing", async () => {
        state.googleEmail = "someone-else@example.com";
        const s = encodeURIComponent(stateFor());
        const res = await callbackGET(
            req(`/api/admin/email/callback?code=abc&state=${s}`, { cookie: `${OAUTH_NONCE_COOKIE}=nonce-1` }),
        );
        expect(location(res)).toContain("email_error=");
        expect(state.savedPrimary).toHaveLength(0);
    });
    it("does not leak unexpected internal errors in the redirect", async () => {
        state.googleThrows = true; // an unexpected, non-user-facing failure
        const s = encodeURIComponent(stateFor());
        const res = await callbackGET(
            req(`/api/admin/email/callback?code=abc&state=${s}`, { cookie: `${OAUTH_NONCE_COOKIE}=nonce-1` }),
        );
        expect(decodeURIComponent(location(res))).toContain("Email authorization failed");
        expect(decodeURIComponent(location(res))).not.toMatch(/undefined|TypeError|Cannot/);
    });
});
