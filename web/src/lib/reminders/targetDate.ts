/** The salon's time zone: booking dates ("yyyy-MM-dd") are calendar days there, whatever the server's zone is. */
export const BUSINESS_TIME_ZONE = "America/Chicago";

/** Today's calendar date in `timeZone` as "yyyy-MM-dd". */
export function dateInTimeZone(now: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
    // The en-CA locale formats dates as yyyy-MM-dd.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * The calendar day after today in `timeZone`, as "yyyy-MM-dd" (the day reminders are sent for).
 * The day is added to the local date, not 24 hours to the instant, so it is right across daylight saving changes.
 */
export function reminderTargetDate(now: Date, timeZone: string = BUSINESS_TIME_ZONE): string {
    const [y, m, d] = dateInTimeZone(now, timeZone).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
