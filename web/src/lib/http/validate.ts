/**
 * Input validation for the public (unauthenticated) API routes.
 * Hand-written on purpose: two small shapes do not justify a new dependency.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ContactInput {
    name: string;
    email: string;
    service: string;
    message: string;
}

const MAX = { name: 100, email: 254, service: 100, message: 5000 } as const;
// Same shape the contact page checks on the client.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(body: Record<string, unknown>, field: keyof ContactInput): ParseResult<string> {
    const raw = body[field];
    if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Missing required fields" };
    const value = raw.trim();
    if (value.length > MAX[field]) return { ok: false, error: `${field} is too long` };
    return { ok: true, value };
}

export function parseContactInput(body: unknown): ParseResult<ContactInput> {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return { ok: false, error: "Invalid request body" };
    }
    const record = body as Record<string, unknown>;
    const out: Partial<ContactInput> = {};
    for (const field of ["name", "email", "service", "message"] as const) {
        const r = text(record, field);
        if (!r.ok) return r;
        out[field] = r.value;
    }
    if (!EMAIL_RE.test(out.email as string)) return { ok: false, error: "Invalid email format" };
    return { ok: true, value: out as ContactInput };
}

/** The booking page sends dates as "November 21, 2026" (see app/book/page.tsx), the same string stored on bookings. */
const BOOKING_DATE_RE = /^[A-Za-z]{3,9} \d{1,2}, \d{4}$/;

export function isBookingDateParam(value: string | null): value is string {
    return value !== null && value.length <= 20 && BOOKING_DATE_RE.test(value);
}
