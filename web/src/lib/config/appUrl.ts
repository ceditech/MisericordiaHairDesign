/** The production site, used when NEXT_PUBLIC_APP_URL is not set (or is not a usable web address). */
export const DEFAULT_APP_URL = "https://misericordiahairdesign.com";

/**
 * The public base URL of this deployment, with no trailing slash, for links in emails and redirects.
 * Set NEXT_PUBLIC_APP_URL per environment (local, staging, production). Anything that is not an http(s) URL is
 * ignored, so a bad value can never turn into a `javascript:` or relative link.
 */
export function getAppUrl(): string {
    const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.protocol === "http:" || url.protocol === "https:") {
                return configured.replace(/\/+$/, "");
            }
        } catch {
            /* not a URL: use the default */
        }
    }
    return DEFAULT_APP_URL;
}

/** Host (and port) of the app URL, for showing next to a link: "misericordiahairdesign.com". */
export function getAppHost(): string {
    return new URL(getAppUrl()).host;
}
