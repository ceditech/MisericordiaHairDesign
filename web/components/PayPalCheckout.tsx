"use client";

/**
 * PayPalCheckout — Renders PayPal buttons inline on the checkout page.
 *
 * Uses @paypal/react-paypal-js to load the PayPal JS SDK and render
 * hosted payment buttons. The flow is:
 *
 *   1. Customer clicks PayPal button → createOrder callback fires
 *   2. Frontend calls POST /api/paypal/create-order → gets orderId
 *   3. PayPal popup opens for buyer approval
 *   4. Buyer approves → onApprove callback fires
 *   5. Frontend calls POST /api/paypal/capture-order → payment captured
 *   6. Redirect to success page
 *
 * No payment secrets ever touch the browser.
 */

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PayPalCheckoutProps {
    /** Amount to charge in cents (e.g. 5000 = $50.00) */
    amountCents: number;
    /** Currency code */
    currency?: string;
    /** Description shown to the buyer */
    description?: string;
    /** Called when payment is successfully captured */
    onSuccess: (details: PayPalCaptureResult) => void;
    /** Called when the buyer cancels the PayPal popup */
    onCancel?: () => void;
    /** Called on any error */
    onError?: (error: unknown) => void;
}

export interface PayPalCaptureResult {
    /** PayPal order ID */
    orderId: string;
    /** Capture status ("COMPLETED" = success) */
    status: string;
    /** Payer info from PayPal */
    payer?: {
        email_address?: string;
        name?: {
            given_name?: string;
            surname?: string;
        };
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayPalCheckout({
    amountCents,
    currency = "USD",
    description,
    onSuccess,
    onCancel,
    onError,
}: PayPalCheckoutProps) {
    const [isPaying, setIsPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-5 text-center">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                    PayPal is not configured. Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                    <span className="material-icons text-red-500 text-lg">error_outline</span>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium flex-1">
                        {error}
                    </p>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Dismiss"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>
            )}

            {/* Processing indicator */}
            {isPaying && (
                <div className="flex items-center justify-center gap-3 py-4">
                    <span className="material-icons animate-spin text-brand-primary text-lg">autorenew</span>
                    <span className="text-sm text-text-secondary font-medium">Processing your payment…</span>
                </div>
            )}

            {/* PayPal buttons */}
            <PayPalScriptProvider
                options={{
                    clientId,
                    currency,
                    intent: "capture",
                    components: "buttons",
                }}
            >
                <PayPalButtons
                    style={{
                        layout: "vertical",
                        color: "gold",
                        shape: "pill",
                        label: "pay",
                        height: 55,
                    }}
                    disabled={isPaying}
                    createOrder={async () => {
                        setError(null);
                        setIsPaying(true);

                        try {
                            const res = await fetch("/api/paypal/create-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    amountCents,
                                    currency,
                                    description,
                                }),
                            });

                            if (!res.ok) {
                                const errBody = await res.json().catch(() => ({}));
                                throw new Error(errBody.error || `Server error: ${res.status}`);
                            }

                            const data = await res.json();
                            return data.id;
                        } catch (err) {
                            setIsPaying(false);
                            const msg = err instanceof Error ? err.message : "Failed to create order";
                            setError(msg);
                            onError?.(err);
                            throw err; // PayPal SDK needs the throw to cancel the flow
                        }
                    }}
                    onApprove={async (data) => {
                        try {
                            const res = await fetch("/api/paypal/capture-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ orderId: data.orderID }),
                            });

                            if (!res.ok) {
                                const errBody = await res.json().catch(() => ({}));
                                throw new Error(errBody.error || `Capture error: ${res.status}`);
                            }

                            const captureData = await res.json();

                            setIsPaying(false);
                            onSuccess({
                                orderId: data.orderID,
                                status: captureData.status,
                                payer: captureData.payer,
                            });
                        } catch (err) {
                            setIsPaying(false);
                            const msg = err instanceof Error ? err.message : "Payment capture failed";
                            setError(msg);
                            onError?.(err);
                        }
                    }}
                    onCancel={() => {
                        setIsPaying(false);
                        setError(null);
                        onCancel?.();
                    }}
                    onError={(err) => {
                        setIsPaying(false);
                        console.error("[PayPal] Button error:", err);
                        setError("Something went wrong with PayPal. Please try again.");
                        onError?.(err);
                    }}
                />
            </PayPalScriptProvider>

            {/* Trust note */}
            <p className="text-center text-[10px] text-slate-400 mt-2">
                Powered by PayPal · Your payment details are handled securely by PayPal
            </p>
        </div>
    );
}
