import { createHash, timingSafeEqual } from "node:crypto";
import { requireRole, type AuthContext, type AuthDeps, type RoleRequirement } from "./requireRole";

export type CronOrUserAuth = { kind: "cron" } | { kind: "user"; auth: AuthContext };

function bearerToken(req: Request): string | null {
    const match = /^Bearer\s+(.+)$/i.exec((req.headers.get("authorization") ?? "").trim());
    return match ? match[1].trim() : null;
}

/** Constant-time comparison that does not leak the secret's length. */
function secretsMatch(given: string, expected: string): boolean {
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b);
}

/**
 * For endpoints called by both a scheduler and a person.
 *
 * - Scheduler: `Authorization: Bearer <CRON_SECRET>`.
 * - Person: a Firebase ID token that satisfies `allowed` (see requireRole).
 *
 * Fails closed: when `cronSecret` is unset or empty, only the ID-token path can
 * succeed; a missing, empty or "undefined" bearer is never accepted.
 * Throws HttpError (401/403/503) like requireRole.
 */
export async function requireCronSecretOrRole(
    req: Request,
    allowed: RoleRequirement[],
    opts: { cronSecret?: string; deps?: AuthDeps } = {},
): Promise<CronOrUserAuth> {
    const cronSecret = "cronSecret" in opts ? opts.cronSecret : process.env.CRON_SECRET;
    const token = bearerToken(req);

    if (cronSecret && token && secretsMatch(token, cronSecret)) {
        return { kind: "cron" };
    }

    const auth = await requireRole(req, allowed, opts.deps);
    return { kind: "user", auth };
}
