import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Written = { col: string; id: string; data: Record<string, unknown> };

const state = vi.hoisted(() => ({
    codes: {} as Record<string, Record<string, unknown>>,
    affiliates: {} as Record<string, Record<string, unknown>>,
    committed: [] as Array<{ col: string; id: string; data: Record<string, unknown> }>,
    emails: [] as Array<{ to: string; subject: string; bodyHtml: string }>,
    existingCodes: [] as string[],
    commitThrows: false,
}));

vi.mock("@/src/lib/firebase/admin", () => {
    const store = (col: string) => (col === "codes" ? state.codes : col === "affiliates" ? state.affiliates : {});
    return {
        adminDb: {
            collection: (col: string) => ({
                doc: (id?: string) => {
                    const docId = id ?? "aff-new";
                    return {
                        id: docId,
                        col,
                        get: async () => {
                            const exists =
                                (col === "codes" && state.existingCodes.includes(docId)) || store(col)[docId] !== undefined;
                            return { exists, data: () => store(col)[docId] };
                        },
                    };
                },
                add: async (data: Record<string, unknown>) => {
                    state.committed.push({ col, id: "auto", data });
                    return { id: "auto" };
                },
            }),
            batch: () => {
                const ops: Written[] = [];
                return {
                    set: (ref: { col: string; id: string }, data: Record<string, unknown>) => {
                        ops.push({ col: ref.col, id: ref.id, data });
                    },
                    commit: async () => {
                        if (state.commitThrows) throw new Error("internal firestore detail");
                        state.committed.push(...ops);
                    },
                };
            },
        },
    };
});
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/email/EmailManager", () => ({
    EmailManager: {
        sendEmail: async (m: { to: string; subject: string; bodyHtml: string }) => {
            state.emails.push(m);
        },
    },
}));

import { POST as generatePOST } from "@/app/api/affiliate/generate/route";
import { POST as resendPOST } from "@/app/api/affiliate/resend/route";

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

function post(handler: (r: NextRequest) => Promise<Response>, body: unknown, ip = nextIp(), raw?: string) {
    return handler(
        new NextRequest("http://localhost/api/affiliate/x", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": ip },
            body: raw ?? JSON.stringify(body),
        }),
    );
}

beforeEach(() => {
    state.codes = { "DB-AFF-ABC123": { affiliateId: "aff1", affiliateEmail: "owner@example.com" } };
    state.affiliates = { aff1: { name: "Real Owner" } };
    state.committed = [];
    state.emails = [];
    state.existingCodes = [];
    state.commitThrows = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/affiliate/generate (public signup, hardened)", () => {
    const ok = { name: "Jane Doe", email: "jane@example.com", type: "general" };

    it("creates the affiliate and code atomically with a DB-AFF-XXXXXX code, then emails", async () => {
        const res = await post(generatePOST, ok);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.code).toMatch(/^DB-AFF-[A-Z0-9]{6}$/);
        const cols = state.committed.map((c) => c.col);
        expect(cols).toEqual(expect.arrayContaining(["affiliates", "codes"]));
        expect(state.emails).toHaveLength(1);
        expect(state.emails[0].to).toBe("jane@example.com");
    });

    it("400 for invalid JSON, missing fields, bad email, bad type or oversized name; nothing written or sent", async () => {
        expect((await post(generatePOST, null, undefined, "{not json")).status).toBe(400);
        expect((await post(generatePOST, { ...ok, name: "" })).status).toBe(400);
        expect((await post(generatePOST, { ...ok, email: "nope" })).status).toBe(400);
        expect((await post(generatePOST, { ...ok, type: "admin" })).status).toBe(400);
        expect((await post(generatePOST, { ...ok, name: "x".repeat(101) })).status).toBe(400);
        expect((await post(generatePOST, { ...ok, name: 5 })).status).toBe(400);
        expect(state.committed).toHaveLength(0);
        expect(state.emails).toHaveLength(0);
    });

    it("links the email footer to the configured app URL", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
        try {
            await post(generatePOST, ok);
            expect(state.emails[0].bodyHtml).toContain('<a href="https://staging.example.com"');
            expect(state.emails[0].bodyHtml).toContain(">staging.example.com</a>");
        } finally {
            vi.unstubAllEnvs();
        }
    });

    it("HTML-escapes the name in the welcome email (no markup injection)", async () => {
        await post(generatePOST, { ...ok, name: "<script>alert(1)</script>" });
        expect(state.emails[0].bodyHtml).not.toContain("<script>");
        expect(state.emails[0].bodyHtml).toContain("&lt;script&gt;");
    });

    it("429 after 5 signups from the same IP; the limited call writes nothing", async () => {
        const ip = nextIp();
        for (let i = 0; i < 5; i++) expect((await post(generatePOST, ok, ip)).status).toBe(200);
        const before = state.committed.length;
        const res = await post(generatePOST, ok, ip);
        expect(res.status).toBe(429);
        expect(res.headers.get("retry-after")).toBeTruthy();
        expect(state.committed).toHaveLength(before);
    });

    it("does not leak internal error text on a 500", async () => {
        state.commitThrows = true;
        const res = await post(generatePOST, ok);
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("internal firestore detail");
    });
});

describe("POST /api/affiliate/resend (public, no longer an open mail relay)", () => {
    it("sends ONLY to the email stored for the code, ignoring email/name in the body", async () => {
        const res = await post(resendPOST, { code: "DB-AFF-ABC123", email: "victim@example.com", name: "<b>Phish</b>" });
        expect(res.status).toBe(200);
        expect(state.emails).toHaveLength(1);
        expect(state.emails[0].to).toBe("owner@example.com");
        expect(state.emails[0].bodyHtml).toContain("Real Owner");
        expect(state.emails[0].bodyHtml).not.toContain("Phish");
    });

    it("links the email footer to the production site when no app URL is configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        try {
            await post(resendPOST, { code: "DB-AFF-ABC123" });
            expect(state.emails[0].bodyHtml).toContain('<a href="https://misericordiahairdesign.com"');
        } finally {
            vi.unstubAllEnvs();
        }
    });
    it("404 for an unknown code and 400 for a malformed or missing code; nothing is sent", async () => {
        expect((await post(resendPOST, { code: "DB-AFF-ZZZZZZ" })).status).toBe(404);
        expect((await post(resendPOST, { code: "<img src=x>" })).status).toBe(400);
        expect((await post(resendPOST, {})).status).toBe(400);
        expect(state.emails).toHaveLength(0);
    });

    it("HTML-escapes the stored name", async () => {
        state.affiliates.aff1 = { name: "<i>Mallory</i>" };
        await post(resendPOST, { code: "DB-AFF-ABC123" });
        expect(state.emails[0].bodyHtml).not.toContain("<i>Mallory</i>");
        expect(state.emails[0].bodyHtml).toContain("&lt;i&gt;Mallory&lt;/i&gt;");
    });

    it("429 after 10 resends from the same IP", async () => {
        const ip = nextIp();
        for (let i = 0; i < 10; i++) expect((await post(resendPOST, { code: "DB-AFF-ABC123" }, ip)).status).toBe(200);
        expect((await post(resendPOST, { code: "DB-AFF-ABC123" }, ip)).status).toBe(429);
    });
});
