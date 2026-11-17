/**
 * Minimal in-memory sliding-window rate limiter for public endpoints.
 *
 * LIMITATION: state lives in one server instance's memory, so with several
 * instances or cold starts the effective limit is looser. It blunts casual
 * abuse only; real protection needs Firebase App Check or reCAPTCHA (planned).
 */
export interface RateLimitResult {
    ok: boolean;
    retryAfterSec: number;
}

const MAX_TRACKED_KEYS = 5000;

export function createRateLimiter(opts: { limit: number; windowMs: number }) {
    const hits = new Map<string, number[]>();

    return {
        check(key: string, now: number = Date.now()): RateLimitResult {
            if (hits.size > MAX_TRACKED_KEYS) {
                for (const [k, times] of hits) {
                    if (times.every((t) => now - t >= opts.windowMs)) hits.delete(k);
                }
            }

            const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);
            if (recent.length >= opts.limit) {
                hits.set(key, recent);
                return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + opts.windowMs - now) / 1000)) };
            }
            recent.push(now);
            hits.set(key, recent);
            return { ok: true, retryAfterSec: 0 };
        },
    };
}

/** Best-effort client IP behind a proxy. */
export function clientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}
