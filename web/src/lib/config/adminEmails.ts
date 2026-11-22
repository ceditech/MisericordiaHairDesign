/**
 * Who administers the app and who gets order notifications, in one place.
 * Server code and the dashboard UI both read these, so the addresses are not typed in several files.
 *
 * The Gmail sender identity (the mailbox connected for sending, whose OAuth tokens are stored under its address)
 * is a different thing and is NOT configured here.
 */

/** The business owner's account, and the developer account kept as a second super admin during the move. */
export const DEFAULT_SUPER_ADMIN_EMAILS = ["mariefleurekpe@gmail.com", "sales@edxstore.com"];

/** Where "new order / new message / new booking" emails go unless OWNER_NOTIFICATION_EMAIL says otherwise. */
export const DEFAULT_OWNER_NOTIFICATION_EMAIL = "mariefleurekpe@gmail.com";

/**
 * Super admin addresses, lower-cased. SUPER_ADMIN_EMAILS (comma separated) replaces the defaults when it is set.
 * A value that holds no address leaves nobody as super admin (fails closed).
 * Note: the dashboard UI runs in the browser and cannot read this server variable, so it uses the defaults
 * (see isSuperAdminEmail); the server always enforces the real list.
 */
export function getSuperAdminEmails(raw: string | undefined = process.env.SUPER_ADMIN_EMAILS): string[] {
    if (!raw) return DEFAULT_SUPER_ADMIN_EMAILS;
    return raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

/** Whether an email is on the super admin list (case-insensitive). Does not check that the email is verified. */
export function isSuperAdminEmail(email: string | null | undefined, list: string[] = getSuperAdminEmails()): boolean {
    return !!email && list.includes(email.trim().toLowerCase());
}

/** Recipient of owner notification emails. */
export function getOwnerNotificationEmail(raw: string | undefined = process.env.OWNER_NOTIFICATION_EMAIL): string {
    const configured = (raw ?? "").trim();
    return configured || DEFAULT_OWNER_NOTIFICATION_EMAIL;
}
