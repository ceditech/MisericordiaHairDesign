/**
 * Browser-side helper for the shop success page.
 *
 * - PayPal returns the customer here after approval: the order must be captured
 *   (once) before it can be paid. Stripe orders are finalized by the webhook.
 * - Then the order is read from the server until it is paid (the Stripe webhook
 *   can arrive a moment after the redirect).
 */
export interface PublicShopOrder {
    id: string;
    status: string;
    provider: string | null;
    amountCents: number;
    customerName: string | null;
    fulfillmentType: "pickup" | "shipping";
    shipping: { address: string; city: string; state: string; zipCode: string } | null;
    items: Array<{ productId: string; name: string; quantity: number; priceCents: number; selectedOptions: Record<string, string> | null }>;
    totals: { subtotalCents: number; discountCents: number; taxCents: number; shippingCents: number; totalCents: number };
}

export type ConfirmResult =
    | { state: "paid"; order: PublicShopOrder }
    | { state: "pending"; order: PublicShopOrder }
    | { state: "not_found" }
    | { state: "failed"; message: string };

export async function confirmShopOrder(opts: {
    shopOrderId: string;
    provider: string | null;
    paypalToken: string | null;
    fetchFn?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    maxAttempts?: number;
    intervalMs?: number;
}): Promise<ConfirmResult> {
    const { shopOrderId, provider, paypalToken } = opts;
    const fetchFn = opts.fetchFn ?? fetch;
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    const maxAttempts = opts.maxAttempts ?? 10;
    const intervalMs = opts.intervalMs ?? 2000;

    try {
        if (provider === "paypal" && paypalToken) {
            const res = await fetchFn("/api/payments/paypal/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionType: "shop", orderId: shopOrderId, paypalOrderId: paypalToken }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return { state: "failed", message: data.error ?? "We could not complete your PayPal payment." };
            }
        }

        let last: PublicShopOrder | null = null;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0) await sleep(intervalMs);
            const res = await fetchFn(`/api/shop/orders/${encodeURIComponent(shopOrderId)}`);
            if (res.status === 404) return { state: "not_found" };
            if (!res.ok) continue;
            const data = (await res.json()) as { order?: PublicShopOrder };
            if (!data.order) continue;
            last = data.order;
            if (last.status === "paid") return { state: "paid", order: last };
        }
        return last ? { state: "pending", order: last } : { state: "failed", message: "We could not load your order." };
    } catch {
        return { state: "failed", message: "We could not confirm your order. Please check your connection and try again." };
    }
}
