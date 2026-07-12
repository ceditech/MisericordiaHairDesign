/**
 * POST /api/paypal/create-order
 *
 * Creates a PayPal order with CAPTURE intent.
 * Called by the PayPal JS SDK's `createOrder` callback.
 *
 * Request body: { amountCents: number, currency?: string, description?: string }
 * Response:     { id: string } (PayPal order ID)
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/payments/paypal";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amountCents, currency = "USD", description } = body;

        if (!amountCents || typeof amountCents !== "number" || amountCents <= 0) {
            return NextResponse.json(
                { error: "Invalid amountCents" },
                { status: 400 }
            );
        }

        // Convert cents → dollars string (e.g. 5000 → "50.00")
        const amountUSD = (amountCents / 100).toFixed(2);

        const order = await createOrder({
            amountUSD,
            currency,
            description: description || "Misericordia Hair Designs — Booking Payment",
        });

        // Return only the order ID to the frontend
        return NextResponse.json({ id: order.id });
    } catch (err) {
        console.error("[API] /api/paypal/create-order error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Internal server error" },
            { status: 500 }
        );
    }
}
