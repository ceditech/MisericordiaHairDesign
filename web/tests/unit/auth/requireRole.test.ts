import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@/src/lib/http/HttpError";
import { requireRole, type AuthDeps } from "@/src/lib/auth/requireRole";

const SUPER = "boss@example.com";

function makeDeps(over: Partial<AuthDeps> = {}): AuthDeps {
    return {
        verifyIdToken: vi.fn(async () => ({ uid: "u1", email: "staff@example.com", email_verified: true })),
        getStoredRole: vi.fn(async () => null),
        superAdminEmails: [SUPER],
        ...over,
    };
}

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

describe("requireRole", () => {
    it("401 when the Authorization header is missing", async () => {
        expect(await status(requireRole(req(), ["owner"], makeDeps()))).toBe(401);
    });

    it("401 when the scheme is not Bearer or the token is empty", async () => {
        expect(await status(requireRole(req("Basic abc"), ["owner"], makeDeps()))).toBe(401);
        expect(await status(requireRole(req("Bearer "), ["owner"], makeDeps()))).toBe(401);
    });

    it("401 when the token is invalid or expired", async () => {
        const deps = makeDeps({ verifyIdToken: vi.fn(async () => { throw new Error("expired"); }) });
        expect(await status(requireRole(req("Bearer t"), ["owner"], deps))).toBe(401);
    });

    it("403 when the user has no stored role", async () => {
        expect(await status(requireRole(req("Bearer t"), ["owner"], makeDeps()))).toBe(403);
    });

    it("403 when the stored role is a client or unknown value", async () => {
        for (const role of ["client", "superuser", ""]) {
            const deps = makeDeps({ getStoredRole: vi.fn(async () => role) });
            expect(await status(requireRole(req("Bearer t"), ["owner", "admin", "assistant"], deps))).toBe(403);
        }
    });

    it("allows a stored role listed in the requirement and returns the context", async () => {
        const deps = makeDeps({ getStoredRole: vi.fn(async () => "assistant") });
        const ctx = await requireRole(req("bearer t"), ["owner", "admin", "assistant"], deps);
        expect(ctx).toEqual({ uid: "u1", email: "staff@example.com", role: "assistant", isSuperAdmin: false });
    });

    it("403 when the role is valid but not in the requirement (assistant vs owner-only)", async () => {
        const deps = makeDeps({ getStoredRole: vi.fn(async () => "assistant") });
        expect(await status(requireRole(req("Bearer t"), ["owner", "admin"], deps))).toBe(403);
    });

    it("super admin (verified email) passes any requirement without a Firestore lookup", async () => {
        const getStoredRole = vi.fn(async () => null);
        const deps = makeDeps({
            verifyIdToken: vi.fn(async () => ({ uid: "s", email: "Boss@Example.com", email_verified: true })),
            getStoredRole,
        });
        const ctx = await requireRole(req("Bearer t"), ["superAdmin"], deps);
        expect(ctx.isSuperAdmin).toBe(true);
        expect(await status(requireRole(req("Bearer t"), ["owner"], deps))).toBe("ok");
        expect(getStoredRole).not.toHaveBeenCalled();
    });

    it("super admin email with an UNVERIFIED email does not elevate", async () => {
        const deps = makeDeps({
            verifyIdToken: vi.fn(async () => ({ uid: "s", email: SUPER, email_verified: false })),
        });
        expect(await status(requireRole(req("Bearer t"), ["superAdmin"], deps))).toBe(403);
    });

    it("superAdmin-only requirement rejects a stored owner", async () => {
        const deps = makeDeps({ getStoredRole: vi.fn(async () => "owner") });
        expect(await status(requireRole(req("Bearer t"), ["superAdmin"], deps))).toBe(403);
    });

    it("fails closed (503) when the role lookup throws", async () => {
        const deps = makeDeps({ getStoredRole: vi.fn(async () => { throw new Error("firestore down"); }) });
        expect(await status(requireRole(req("Bearer t"), ["owner"], deps))).toBe(503);
    });

    it("never echoes the token or internal error text in HttpError messages", async () => {
        const deps = makeDeps({ verifyIdToken: vi.fn(async () => { throw new Error("secret-internal"); }) });
        try {
            await requireRole(req("Bearer super-secret-token"), ["owner"], deps);
            throw new Error("should have thrown");
        } catch (e) {
            expect((e as Error).message).not.toContain("super-secret-token");
            expect((e as Error).message).not.toContain("secret-internal");
        }
    });
});
