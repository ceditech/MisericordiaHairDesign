/**
 * The booking fields a customer's own dashboard needs. Everything else on a
 * booking document (payment session ids, contact details, notes, amounts,
 * staff-only fields) stays on the server.
 */
export interface ClientBooking {
    id: string;
    userId: string | null;
    styleId: string | null;
    styleName: string | null;
    date: string | null;
    time: string | null;
    status: string | null;
    createdAt: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Converts a Firestore Timestamp, Date, epoch millis or ISO string to an ISO string. */
function toIso(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
        return new Date((value as { toMillis: () => number }).toMillis()).toISOString();
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

export function toClientBooking(id: string, data: Record<string, unknown>): ClientBooking {
    return {
        id,
        userId: str(data.userId),
        styleId: str(data.styleId),
        styleName: str(data.styleName),
        date: str(data.date),
        time: str(data.time),
        status: str(data.status),
        createdAt: toIso(data.createdAt),
    };
}

/** Newest first; bookings without a timestamp go last. */
export function sortNewestFirst(bookings: ClientBooking[]): ClientBooking[] {
    const ms = (b: ClientBooking) => (b.createdAt ? Date.parse(b.createdAt) : -Infinity);
    return [...bookings].sort((a, b) => ms(b) - ms(a));
}
