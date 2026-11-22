import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/src/lib/http/HttpError";
import {
    DEFAULT_SUPER_ADMIN_EMAILS,
    DEFAULT_OWNER_NOTIFICATION_EMAIL,
    getSuperAdminEmails,
    getOwnerNotificationEmail,
    isSuperAdminEmail,
} from "@/src/lib/config/adminEmails";
import { requireRole, type AuthDeps } from "@/src/lib/auth/requireRole";

vi.mock("@/src/lib/firebase/admin", () => ({ adminAuth: {}, adminDb: {} }));

afterEach(() => vi.unstubAllEnvs());

describe("super admin emails", () => {
    it("default to the owner's Gmail address and the developer address", () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", "");
        expect(DEFAULT_SUPER_ADMIN_EMAILS).toEqual(["mariefleurekpe@gmail.com", "sales@edxstore.com"]);
        expect(getSuperAdminEmails()).toEqual(["mariefleurekpe@gmail.com", "sales@edxstore.com"]);
    });

    it("are replaced entirely by SUPER_ADMIN_EMAILS when it is set (trimmed, lower-cased, blanks dropped)", () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", " Boss@Example.com , ,second@example.com ");
        expect(getSuperAdminEmails()).toEqual(["boss@example.com", "second@example.com"]);
    });

    it("an env value with no addresses grants nobody super admin (fails closed)", () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", " , ");
        expect(getSuperAdminEmails()).toEqual([]);
    });

    it("isSuperAdminEmail ignores case and rejects blanks, missing values and strangers", () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", "");
        expect(isSuperAdminEmail("MarieFleurEkpe@Gmail.com")).toBe(true);
        expect(isSuperAdminEmail("sales@edxstore.com")).toBe(true);
        expect(isSuperAdminEmail("someone@example.com")).toBe(false);
        expect(isSuperAdminEmail("")).toBe(false);
        expect(isSuperAdminEmail(null)).toBe(false);
        expect(isSuperAdminEmail(undefined)).toBe(false);
    });
});

describe("owner notification email", () => {
    it("defaults to the owner's Gmail address", () => {
        vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "");
        expect(DEFAULT_OWNER_NOTIFICATION_EMAIL).toBe("mariefleurekpe@gmail.com");
        expect(getOwnerNotificationEmail()).toBe("mariefleurekpe@gmail.com");
    });

    it("can be overridden per environment (trimmed)", () => {
        vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "  orders@example.com ");
        expect(getOwnerNotificationEmail()).toBe("orders@example.com");
    });

    it("ignores a blank override", () => {
        vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "   ");
        expect(getOwnerNotificationEmail()).toBe(DEFAULT_OWNER_NOTIFICATION_EMAIL);
    });
});

describe("requireRole with the default super admin list", () => {
    const req = new Request("http://localhost/api/x", { headers: { authorization: "Bearer t" } });
    const as = (email: string, verified = true): AuthDeps => ({
        verifyIdToken: async () => ({ uid: "u1", email, email_verified: verified }),
        getStoredRole: async () => null,
        superAdminEmails: getSuperAdminEmails(),
    });
    const status = async (p: Promise<unknown>) => {
        try { await p; return "ok"; } catch (e) { return e instanceof HttpError ? e.status : "error"; }
    };

    it("accepts the Gmail address and the developer address when verified", async () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", "");
        expect(await status(requireRole(req, ["superAdmin"], as("mariefleurekpe@gmail.com")))).toBe("ok");
        expect(await status(requireRole(req, ["superAdmin"], as("sales@edxstore.com")))).toBe("ok");
        expect(await status(requireRole(req, ["superAdmin"], as("MarieFleurEkpe@gmail.com")))).toBe("ok");
    });

    it("refuses an unverified Gmail account and any other address", async () => {
        vi.stubEnv("SUPER_ADMIN_EMAILS", "");
        expect(await status(requireRole(req, ["superAdmin"], as("mariefleurekpe@gmail.com", false)))).toBe(403);
        expect(await status(requireRole(req, ["superAdmin"], as("someone@example.com")))).toBe(403);
    });
});
