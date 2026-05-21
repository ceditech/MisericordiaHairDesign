import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/src/lib/payments/stripeServer";

/**
 * POST /api/stripe/create-payment-intent
 * 
 * Creates a Stripe PaymentIntent for the specified amount.
 * Returns the clientSecret to be used with Stripe Elements on the frontend.
 */
export async function POST(request: NextRequest) {
    try {
        console.log("[Stripe API] POST request received at /api/stripe/create-payment-intent");
        
        const stripe = getStripeServer();

        const body = await request.json();
        console.log("[Stripe API] Received body:", body);
        const { amountCents, bookingId, customerEmail } = body;

        const parsedAmount = Number(amountCents);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.warn("[Stripe] Validation failed: invalid amountCents", { amountCents, parsedAmount });
            return NextResponse.json(
                { error: "Invalid amountCents" },
                { status: 400 }
            );
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents, // Stripe expects amounts in cents
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingId: bookingId || "unknown",
                customerEmail: customerEmail || "unknown",
                amountCents: amountCents.toString(),
            },
            receipt_email: customerEmail,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err: any) {
        console.error("[Stripe] Create PaymentIntent failed:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
