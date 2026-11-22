import { adminAuth, adminDb } from "@/src/lib/firebase/admin";
import { HttpError } from "@/src/lib/http/HttpError";
import { getSuperAdminEmails } from "@/src/lib/config/adminEmails";

/** Roles that may use staff/admin API routes. Mirrors firestore.rules isOwner(). */
export type StaffRole = "owner" | "admin" | "assistant";

/**
 * What a route requires. "superAdmin" means a verified account whose email is
 * in SUPER_ADMIN_EMAILS (same concept as `isSuperAdmin` in the dashboard UI).
 * Super admins satisfy every requirement.
 */
export type RoleRequirement = StaffRole | "superAdmin";

export interface AuthContext {
    uid: string;
    email: string | null;
    role: StaffRole | null;
    isSuperAdmin: boolean;
}

/** Injectable dependencies (Dependency Inversion: lets tests run without Firebase). */
export interface AuthDeps {
    verifyIdToken(token: string): Promise<{ uid: string; email?: string; email_verified?: boolean }>;
    /** Raw `role` value stored on users/{uid}, or null when absent. */
    getStoredRole(uid: string): Promise<string | null>;
    superAdminEmails: string[];
}

const STAFF_ROLES: readonly string[] = ["owner", "admin", "assistant"];
export function defaultAuthDeps(): AuthDeps {
    return {
        verifyIdToken: (token) => adminAuth.verifyIdToken(token),
        getStoredRole: async (uid) => {
            const snap = await adminDb.collection("users").doc(uid).get();
            const role = snap.exists ? snap.data()?.role : null;
            return typeof role === "string" ? role : null;
        },
        superAdminEmails: getSuperAdminEmails(process.env.SUPER_ADMIN_EMAILS),
    };
}

export function readBearerToken(req: Request): string {
    const header = req.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match || !match[1].trim()) {
        throw new HttpError(401, "Authentication required");
    }
    return match[1].trim();
}

/**
 * Verifies the Firebase ID token on the request and checks the caller's role.
 *
 * - 401: missing/malformed/invalid/expired token
 * - 403: authenticated but role not allowed
 * - 503: role lookup failed (fails closed)
 *
 * NOTE: the stored role comes from users/{uid}.role. That is only trustworthy
 * once Firestore rules stop letting users edit their own role (audit Phase 3.4).
 */
export async function requireRole(
    req: Request,
    allowed: RoleRequirement[],
    deps: AuthDeps = defaultAuthDeps(),
): Promise<AuthContext> {
    const token = readBearerToken(req);

    let decoded: Awaited<ReturnType<AuthDeps["verifyIdToken"]>>;
    try {
        decoded = await deps.verifyIdToken(token);
    } catch {
        throw new HttpError(401, "Invalid or expired token");
    }

    const email = decoded.email ?? null;
    const isSuperAdmin =
        !!email &&
        decoded.email_verified === true &&
        deps.superAdminEmails.includes(email.toLowerCase());

    if (isSuperAdmin) {
        return { uid: decoded.uid, email, role: null, isSuperAdmin: true };
    }

    let stored: string | null;
    try {
        stored = await deps.getStoredRole(decoded.uid);
    } catch (err) {
        console.error("[requireRole] Role lookup failed for uid", decoded.uid, err instanceof Error ? err.name : "error");
        throw new HttpError(503, "Unable to verify permissions");
    }

    const role = stored && STAFF_ROLES.includes(stored) ? (stored as StaffRole) : null;
    if (!role || !allowed.includes(role)) {
        throw new HttpError(403, "Forbidden");
    }

    return { uid: decoded.uid, email, role, isSuperAdmin: false };
}
