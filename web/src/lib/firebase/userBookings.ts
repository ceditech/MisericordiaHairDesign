import { authFetch } from "@/src/lib/http/authFetch";

export interface BookingRecord {
    id: string;
    userId: string | null;
    styleId?: string;
    styleName: string;
    date: string;
    time: string;
    status: string;
    createdAt: any;
    // ... other fields as needed
}

/**
 * Fetches all confirmed bookings for a specific date string.
 * Uses a secure server-side API to avoid permission errors on sensitive data.
 */
export async function getBookingsByDate(dateStr: string): Promise<BookingRecord[]> {
    try {
        const response = await fetch(`/api/bookings/availability?date=${encodeURIComponent(dateStr)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch availability: ${response.statusText}`);
        }
        const data = await response.json();
        return data as BookingRecord[];
    } catch (error) {
        console.error("[userBookings] getBookingsByDate failed:", error);
        return [];
    }
}


/**
 * Fetches the signed-in customer's booking history.
 * Returns { upcoming: BookingRecord[], past: BookingRecord[] }
 * Past bookings are limited to the last 14 days.
 *
 * The bookings come from /api/bookings/mine (the server matches them to the
 * verified user), because browsers cannot read the `bookings` collection.
 */
export async function getUserBookingHistory(userId: string) {
    if (!userId) return { upcoming: [] as BookingRecord[], past: [] as BookingRecord[] };

    const response = await authFetch("/api/bookings/mine");
    if (!response.ok) {
        throw new Error(`Failed to load bookings (${response.status})`);
    }
    const data = (await response.json()) as { bookings?: BookingRecord[] };
    const allBookings: BookingRecord[] = data.bookings ?? [];

    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);

    const upcoming: BookingRecord[] = [];
    const past: BookingRecord[] = [];

    allBookings.forEach(booking => {
        // Try to parse the booking date
        // Note: The date is currently stored as a string like "Thursday, March 26, 2026"
        // For accurate comparison, we should have a timestamp or ISO date.
        // Assuming we look at the 'createdAt' or parse the string if needed.
        // For now, let's use the current date vs booking date string if possible.
        
        try {
            const bookingDate = new Date(booking.date);
            if (isNaN(bookingDate.getTime())) {
                // Fallback: If date string is weird, put it in upcoming if curated recently
                upcoming.push(booking);
                return;
            }

            if (bookingDate >= now) {
                upcoming.push(booking);
            } else if (bookingDate >= twoWeeksAgo) {
                past.push(booking);
            }
            // Bookings older than 2 weeks are excluded from the 'past' array
        } catch {
            upcoming.push(booking);
        }
    });

    return { upcoming, past };
}
