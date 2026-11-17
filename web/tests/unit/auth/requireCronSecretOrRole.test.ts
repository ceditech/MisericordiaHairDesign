import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@/src/lib/http/HttpError";
import type { AuthDeps } from "@/src/lib/auth/requireRole";
import { requireCronSecretOrRole } from "@/src/lib/auth/requireCronSecretOrRole";

const SECRET = "cron-secret-value";

function makeDeps(over: Partial<AuthDeps> = {}): AuthDeps {
    return {
        verifyIdToken: vi.fn(async (t: string) => {
            if (t === "super-t") return { uid: "s1", email: "boss@example.com", email_verified: true };
            if (t === "owner-t") return { uid: "o1", email: "owner@example.com", email_verified: true };
            throw new Error("bad token");
        }),
        getStoredRole: vi.fn(async (uid: string) => (uid === "o1" ? "owner" : null)),
        superAdminEmails: ["boss@example.com"],
        ...over,
    };
}

const req = (authorization?: string) =>
    new Request("http://localhost/api/admin/reminders", { method: "POST", headers: authorization ? { authorization } : {} });

async function outcome(p: Promise<unknown>) {
    try {
        return { ok: true as const, value: await p };
    } catch (e) {
        if (e instanceof HttpError) return { ok: false as const, status: e.status };
        throw e;
    }
}

describe("requireCronSecretOrRole", () => {
    it("accepts the correct cron secret without verifying any ID token", async () => {
        const deps = makeDeps();
        const r = await outcome(requireCronSecretOrRole(req(`Bearer ${SECRET}`), ["superAdmin"], { cronSecret: SECRET, deps }));
        expect(r).toEqual({ ok: true, value: { kind: "cron" } });
        expect(deps.verifyIdToken).not.toHaveBeenCalled();
    });

    it("fails closed: with NO secret configured, a missing header is 401", async () => {
        const r = await outcome(requireCronSecretOrRole(req(), ["superAdmin"], { cronSecret: undefined, deps: makeDeps() }));
        expect(r).toEqual({ ok: false, status: 401 });
    });

    it("fails closed: with NO secret configured, bearer 'undefined' or empty is not treated as the secret", async () => {
        for (const header of ["Bearer undefined", "Bearer ", "Bearer null"]) {
            const r = await outcome(requireCronSecretOrRole(req(header), ["superAdmin"], { cronSecret: undefined, deps: makeDeps() }));
            expect(r.ok).toBe(false);
        }
        const r = await outcome(requireCronSecretOrRole(req("Bearer "), ["superAdmin"], { cronSecret: "", deps: makeDeps() }));
        expect(r.ok).toBe(false);
    });

    it("rejects a wrong secret (falls through to ID-token check, which fails: 401)", async () => {
        const r = await outcome(requireCronSecretOrRole(req("Bearer wrong"), ["superAdmin"], { cronSecret: SECRET, deps: makeDeps() }));
        expect(r).toEqual({ ok: false, status: 401 });
    });

    it("rejects a secret that only shares a prefix or differs in length", async () => {
        for (const header of [`Bearer ${SECRET}x`, `Bearer ${SECRET.slice(0, -1)}`]) {
            const r = await outcome(requireCronSecretOrRole(req(header), ["superAdmin"], { cronSecret: SECRET, deps: makeDeps() }));
            expect(r.ok).toBe(false);
        }
    });

    it("accepts a super admin ID token (manual button) and returns the auth context", async () => {
        const r = await outcome(requireCronSecretOrRole(req("Bearer super-t"), ["superAdmin"], { cronSecret: SECRET, deps: makeDeps() }));
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect((r.value as { kind: string }).kind).toBe("user");
        }
    });

    it("403 for an owner ID token when only super admin is allowed", async () => {
        const r = await outcome(requireCronSecretOrRole(req("Bearer owner-t"), ["superAdmin"], { cronSecret: SECRET, deps: makeDeps() }));
        expect(r).toEqual({ ok: false, status: 403 });
    });
});
