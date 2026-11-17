import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { withAuth } from "@/src/lib/auth/withAuth";
import { HttpError } from "@/src/lib/http/HttpError";
import type { AuthDeps } from "@/src/lib/auth/requireRole";

const deps = (role: string | null): AuthDeps => ({
    verifyIdToken: vi.fn(async () => ({ uid: "u1", email: "a@b.com", email_verified: true })),
    getStoredRole: vi.fn(async () => role),
    superAdminEmails: [],
});

const call = (h: ReturnType<typeof withAuth>, authorization?: string) =>
    h(new NextRequest("http://localhost/api/x", { headers: authorization ? { authorization } : {} }), {});

describe("withAuth", () => {
    it("returns 401 JSON and does not run the handler when unauthenticated", async () => {
        const handler = vi.fn(async () => Response.json({ ok: true }));
        const res = await call(withAuth(["owner"], handler, deps("owner")));
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ success: false, error: "Authentication required" });
        expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 JSON for an insufficient role", async () => {
        const handler = vi.fn(async () => Response.json({ ok: true }));
        const res = await call(withAuth(["owner"], handler, deps("assistant")), "Bearer t");
        expect(res.status).toBe(403);
        expect(handler).not.toHaveBeenCalled();
    });

    it("runs the handler with the auth context when allowed", async () => {
        const handler = vi.fn(async (_req: NextRequest, auth: { uid: string; role: string | null }) =>
            Response.json({ uid: auth.uid, role: auth.role }),
        );
        const res = await call(withAuth(["owner"], handler, deps("owner")), "Bearer t");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ uid: "u1", role: "owner" });
    });

    it("maps an HttpError thrown by the handler to its status", async () => {
        const res = await call(
            withAuth(["owner"], async () => { throw new HttpError(404, "Booking not found"); }, deps("owner")),
            "Bearer t",
        );
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ success: false, error: "Booking not found" });
    });

    it("rethrows unexpected errors so the route can handle/log them", async () => {
        const h = withAuth(["owner"], async () => { throw new Error("boom"); }, deps("owner"));
        await expect(call(h, "Bearer t")).rejects.toThrow("boom");
    });
});
