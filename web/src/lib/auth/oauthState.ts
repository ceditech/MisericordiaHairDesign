import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed, short-lived OAuth `state` for the Gmail sender connection flow.
 *
 * The Google redirect back to /api/admin/email/callback is a plain browser
 * navigation, so it cannot carry an Authorization header. Instead the start
 * route (which IS authenticated) issues this state, bound to the caller's uid,
 * the target email and a nonce that is also stored in an httpOnly cookie.
 * The callback only proceeds when signature, expiry and cookie nonce all match.
 */
export const OAUTH_NONCE_COOKIE = "email_oauth_nonce";

export interface OAuthStatePayload {
    email: string;
    uid: string;
    nonce: string;
    exp: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function sign(data: string, secret: string): string {
    return createHmac("sha256", `email-oauth-state:${secret}`).update(data).digest("base64url");
}

export function newNonce(): string {
    return randomBytes(16).toString("base64url");
}

export function createOAuthState(
    payload: Omit<OAuthStatePayload, "exp">,
    secret: string,
    ttlMs: number = DEFAULT_TTL_MS,
    now: number = Date.now(),
): string {
    const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlMs })).toString("base64url");
    return `${body}.${sign(body, secret)}`;
}

/** Returns the payload when the state is authentic and unexpired, otherwise null. */
export function verifyOAuthState(
    state: string | null | undefined,
    secret: string,
    now: number = Date.now(),
): OAuthStatePayload | null {
    if (!state) return null;
    const parts = state.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const [body, signature] = parts;

    const expected = Buffer.from(sign(body, secret));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
        if (
            typeof payload.email !== "string" ||
            typeof payload.uid !== "string" ||
            typeof payload.nonce !== "string" ||
            typeof payload.exp !== "number" ||
            payload.exp < now
        ) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}
