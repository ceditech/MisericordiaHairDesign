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
