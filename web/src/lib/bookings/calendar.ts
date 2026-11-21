/** English month names. Fixed on purpose: the date string is sent to the server and parsed by Date, so it must not follow the browser language. */
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
] as const;

/** "November 21, 2026": the format stored on bookings and accepted by /api/bookings/availability. `month` is 0-based. */
export function formatBookingDate(year: number, month: number, day: number): string {
    return `${MONTH_NAMES[month]} ${day}, ${year}`;
}

export function getMonthData(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, firstDayOfMonth, daysInMonth };
}

/** True when the given calendar day is before today (local time). `now` is injectable for tests. */
export function isDatePast(day: number, month: number, year: number, now: Date = new Date()): boolean {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
}
