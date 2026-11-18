/**
 * Browser-side helper for the booking success page.
 *
 * PayPal returns the customer to /booking/success?provider=paypal&draftId=...&token=<paypalOrderId>
 * after approval. The payment is only taken (and the booking only created) once this capture
 * call succeeds. The server is idempotent, so a page reload is safe.
 */
export type CaptureBookingResult = { ok: true } | { ok: false; message: string };

export async function capturePayPalBooking(opts: {
    draftId: string;
    paypalToken: string;
    fetchFn?: typeof fetch;
}): Promise<CaptureBookingResult> {
    const fetchFn = opts.fetchFn ?? fetch;
    try {
        const res = await fetchFn("/api/payments/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionType: "booking", draftId: opts.draftId, paypalOrderId: opts.paypalToken }),
        });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.error ?? "We could not complete your PayPal payment." };
    } catch {
        return { ok: false, message: "We could not confirm your payment. Please check your connection and try again." };
    }
}
