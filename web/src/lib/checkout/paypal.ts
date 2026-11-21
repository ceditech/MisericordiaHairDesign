import type { PaymentChoice } from "@/src/lib/payments/types";

/**
 * Asks the server to create a PayPal order for a saved booking draft and returns the link the visitor must approve.
 * Throws an Error with a message fit to show the visitor.
 */
export async function createPayPalOrder(
    args: { draftId: string; choice: PaymentChoice; origin: string },
    fetchFn: typeof fetch = fetch
): Promise<string> {
    const { draftId, choice, origin } = args;
    const res = await fetchFn("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionType: "booking",
            draftId,
            choice,
            returnUrl: `${origin}/booking/success?provider=paypal&draftId=${draftId}`,
            cancelUrl: `${origin}/checkout?cancelled=true`,
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error("PayPal configuration error (Incomplete Credentials). Check your environment variables.");
        }
        throw new Error(data.error ?? `Server error (${res.status})`);
    }

    if (!data.approvalLink) {
        throw new Error("No PayPal approval link returned by server.");
    }

    return data.approvalLink as string;
}
