"use client";

/**
 * StripeCheckout — Redirect to Stripe Hosted Checkout Page
 *
 * Calls /api/payments/stripe/create-session server-side to create a
 * Stripe Checkout Session, then redirects the browser to Stripe's
 * hosted payment page. Stripe handles all card input, Apple Pay, Google
 * Pay, and PCI compliance. The webhook confirms payment and updates Firestore.
 *
 * Props:
 *   - amountCents: display only (actual amount computed server-side)
 *   - sessionType, draftId/orderId, choice: sent to the session endpoint
 *   - onError: called if the server returns an error before redirect
 */

import { useState } from "react";
import { Button } from "@/components/ui";

export interface StripeCheckoutProps {
  amountCents: number;
  sessionType: "booking" | "shop";
  draftId?: string;
  shopOrderId?: string;
  choice?: "deposit" | "full";
  customerEmail?: string;
  onBeforeRedirect?: () => Promise<void>;
  onError?: (error: string) => void;
}

export default function StripeCheckout({
  amountCents,
  sessionType,
  draftId,
  shopOrderId,
  choice = "deposit",
  onBeforeRedirect,
  onError,
}: StripeCheckoutProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handlePay = async () => {
    setIsRedirecting(true);

    try {
      if (onBeforeRedirect) {
        await onBeforeRedirect();
      }

      const baseUrl = window.location.origin;

      const successUrl =
        sessionType === "booking"
          ? `${baseUrl}/booking/success?provider=stripe&draftId=${draftId}`
          : `${baseUrl}/shop/success?provider=stripe&shopOrderId=${shopOrderId}`;

      const cancelUrl =
        sessionType === "booking"
          ? `${baseUrl}/checkout?cancelled=true`
          : `${baseUrl}/shop/checkout?cancelled=true`;

      const res = await fetch("/api/payments/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionType,
          draftId,
          shopOrderId,
          choice,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Stripe configuration error (Invalid API Key). Check your environment variables.");
        }
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const { url } = data;

      if (!url) {
        throw new Error("No redirect URL returned from server.");
      }

      // Hard redirect to Stripe Hosted Checkout
      window.location.href = url;
    } catch (err: any) {
      console.error("[StripeCheckout] Error creating session:", err);
      setIsRedirecting(false);
      onError?.(err.message ?? "Failed to initialize Stripe checkout. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <Button
        id="stripe-pay-button"
        onClick={handlePay}
        disabled={isRedirecting}
        className="w-full py-6 rounded-full font-bold text-white text-lg shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group active:scale-95 bg-[#9F2D5C] hover:bg-[#B8326A] shadow-[#9F2D5C]/30 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isRedirecting ? (
          <>
            <span className="material-icons animate-spin text-lg">autorenew</span>
            <span>Redirecting to Stripe…</span>
          </>
        ) : (
          <>
            <span className="material-icons text-lg">credit_card</span>
            <span>Pay ${(amountCents / 100).toFixed(2)} with Card</span>
          </>
        )}
      </Button>

      <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <span className="material-icons text-[14px] text-slate-400">lock</span>
        Secure payment · Powered by Stripe · Supports Apple Pay &amp; Google Pay
      </p>
    </div>
  );
}
