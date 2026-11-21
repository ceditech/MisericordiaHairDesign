import type { BraidStyle } from "@/src/lib/styles";
import type { BookingRecord } from "@/src/lib/firebase/userBookings";

export interface TimeSlot {
    time: string;
    available: boolean;
}

/** Longest duration, in hours, of a style duration label such as "4-6 hours" or "45 min". Defaults to 4. */
export function parseMaxDurationHours(duration: string | undefined): number {
    if (!duration || typeof duration !== "string") return 4;
    const match = duration.match(/(\d+(\.\d+)?)/g);
    if (!match) return 4;

    // Take the larger value if it's a range like "4-6 hours"
    const val = parseFloat(match[match.length - 1]);

    // Check if it's in minutes
    if (duration.toLowerCase().includes("min")) {
        return val / 60;
    }

    return val;
}

/** "9:30 AM" -> 570 (minutes from midnight). An empty string is 0. */
export function timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [time, period] = timeStr.split(" ");
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
}

export const OPEN_HOUR = 9; // 9:00 AM
export const CLOSE_HOUR = 21; // 9:00 PM

/**
 * Generate 30-minute time slots from 9:00 AM up to closing, marking each available or not.
 * A slot is unavailable when it is already past (today only), when the style would run past closing,
 * or when it overlaps a confirmed booking. `now` is injectable for tests.
 */
export function generateSlots(
    maxDurationHours: number,
    selectedDateStr: string,
    existingBookings: BookingRecord[] = [],
    allStyles: BraidStyle[] = [],
    now: Date = new Date()
): TimeSlot[] {
    const startMinutes = OPEN_HOUR * 60;
    const endMinutes = CLOSE_HOUR * 60;
    const lastPossibleStartMinutes = endMinutes - maxDurationHours * 60;

    const slots: TimeSlot[] = [];
    const isToday = (() => {
        if (!selectedDateStr) return false;
        const d = new Date(selectedDateStr);
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        );
    })();

    const occupiedRanges = (existingBookings || [])
        .map((b) => {
            if (!b.time) return null;
            const start = timeToMinutes(b.time);
            const style = allStyles.find((s) => s.id === b.styleId || s.name === b.styleName);
            const durationHours = style ? parseMaxDurationHours(style.duration) : 4;
            return { start, end: start + durationHours * 60 };
        })
        .filter(Boolean) as Array<{ start: number; end: number }>;

    for (let current = startMinutes; current <= endMinutes - 30; current += 30) {
        let available = true;

        // Filter past times for today
        if (isToday) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (current <= nowMinutes) available = false;
        }

        // Check if starting here would exceed closing time based on duration
        if (current > lastPossibleStartMinutes) {
            available = false;
        }

        const slotEnd = current + maxDurationHours * 60;
        const hasOverlap = occupiedRanges.some((range) => {
            return Math.max(current, range.start) < Math.min(slotEnd, range.end);
        });

        if (hasOverlap) available = false;

        const h = Math.floor(current / 60);
        const m = current % 60;
        const suffix = h < 12 ? "AM" : "PM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayMin = m === 0 ? "00" : "30";
        slots.push({
            time: `${displayHour}:${displayMin} ${suffix}`,
            available,
        });
    }

    return slots;
}
