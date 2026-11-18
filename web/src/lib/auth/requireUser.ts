import { HttpError } from "@/src/lib/http/HttpError";
import { defaultAuthDeps, readBearerToken, type AuthDeps } from "./requireRole";

export interface UserContext {
    uid: string;
    email: string | null;
}

/**
 * Verifies the Firebase ID token on the request for ANY signed-in user (no staff
 * role needed). Use it for routes that return a customer's own data, and scope
 * every query to the returned uid.
 *
 * - 401: missing/malformed/invalid/expired token
 */
export async function requireUser(
    req: Request,
    deps: Pick<AuthDeps, "verifyIdToken"> = defaultAuthDeps(),
): Promise<UserContext> {
    const token = readBearerToken(req);
    try {
        const decoded = await deps.verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email ?? null };
    } catch {
        throw new HttpError(401, "Invalid or expired token");
    }
}
