/**
 * Pure helpers for creating PayPal orders (kept free of I/O so they are unit-tested).
 */

export interface PayPalReturnUrls {
    returnUrl: string;
    cancelUrl: string;
}

/**
 * Builds the PayPal "create order" body. When return URLs are given, the order uses the
 * redirect flow: PayPal sends the buyer back to `returnUrl` (with `token` = PayPal order id)
 * after approval, or to `cancelUrl`.
 */
export function buildCreateOrderBody(amountCents: number, currency: string, description: string, urls?: PayPalReturnUrls) {
    const body: Record<string, unknown> = {
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: { currency_code: currency, value: (amountCents / 100).toFixed(2) },
                description,
            },
        ],
    };
    if (urls) {
        body.payment_source = {
            paypal: {
                experience_context: {
                    return_url: urls.returnUrl,
                    cancel_url: urls.cancelUrl,
                    user_action: "PAY_NOW",
                    shipping_preference: "NO_SHIPPING",
                },
            },
        };
    }
    return body;
}

/** The buyer-approval link: `approve` for classic orders, `payer-action` when a payment_source is used. */
export function findApprovalLink(links: Array<{ rel: string; href: string }> | undefined): string | undefined {
    return links?.find((l) => l.rel === "approve")?.href ?? links?.find((l) => l.rel === "payer-action")?.href;
}

/**
 * A return/cancel URL is only accepted when it points at this site (http/https and one of the
 * allowed origins), so the endpoint cannot be used to send buyers to another site.
 */
export function isAllowedReturnUrl(url: unknown, allowedOrigins: string[]): url is string {
    if (typeof url !== "string") return false;
    try {
        const u = new URL(url);
        return (u.protocol === "https:" || u.protocol === "http:") && allowedOrigins.includes(u.origin);
    } catch {
        return false;
    }
}

/** Origins this request may legitimately come from (request URL, Origin and forwarded host headers). */
export function allowedOriginsFor(req: { url: string; headers: { get(name: string): string | null } }): string[] {
    const origins = new Set<string>();
    try {
        origins.add(new URL(req.url).origin);
    } catch {
        /* ignore */
    }
    const origin = req.headers.get("origin");
    if (origin) origins.add(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host) {
        const proto = req.headers.get("x-forwarded-proto") ?? "https";
        origins.add(`${proto}://${host}`);
        origins.add(`http://${host}`);
    }
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (configured) {
        try {
            origins.add(new URL(configured).origin);
        } catch {
            /* ignore */
        }
    }
    return [...origins];
}
