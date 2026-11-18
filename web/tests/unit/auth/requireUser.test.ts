import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { HttpError } from "@/src/lib/http/HttpError";
import { requireUser } from "@/src/lib/auth/requireUser";
import { withUser } from "@/src/lib/auth/withAuth";

const deps = () => ({
    verifyIdToken: vi.fn(async (t: string) => {
        if (t === "good") return { uid: "u1", email: "u1@example.com", email_verified: true };
        throw new Error("bad token");
    }),
});

const req = (authorization?: string) =>
    new Request("http://localhost/api/x", { headers: authorization ? { authorization } : {} });

async function status(p: Promise<unknown>): Promise<number | "ok"> {
    try {
        await p;
        return "ok";
    } catch (e) {
        if (e instanceof HttpError) return e.status;
        throw e;
    }
}

describe("requireUser", () => {
    it("401 without a bearer token, or with an invalid or expired one", async () => {
        expect(await status(requireUser(req(), deps()))).toBe(401);
        expect(await status(requireUser(req("Basic x"), deps()))).toBe(401);
        expect(await status(requireUser(req("Bearer nope"), deps()))).toBe(401);
    });

    it("returns the uid and email for any signed-in user (no staff role needed)", async () => {
        const d = deps();
        expect(await requireUser(req("Bearer good"), d)).toEqual({ uid: "u1", email: "u1@example.com" });
        expect(d.verifyIdToken).toHaveBeenCalledWith("good");
    });
});

describe("withUser", () => {
    const call = (h: ReturnType<typeof withUser>, authorization?: string) =>
        h(new NextRequest("http://localhost/api/x", { headers: authorization ? { authorization } : {} }), {});

    it("401 JSON and the handler does not run when unauthenticated", async () => {
        const handler = vi.fn(async () => Response.json({ ok: true }));
        const res = await call(withUser(handler, deps()));
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ success: false, error: "Authentication required" });
        expect(handler).not.toHaveBeenCalled();
    });

    it("runs the handler with the user, and maps handler HttpErrors", async () => {
        const ok = await call(withUser(async (_r, user) => Response.json({ uid: user.uid }), deps()), "Bearer good");
        expect(await ok.json()).toEqual({ uid: "u1" });
        const nf = await call(withUser(async () => { throw new HttpError(404, "nope"); }, deps()), "Bearer good");
        expect(nf.status).toBe(404);
    });
});
