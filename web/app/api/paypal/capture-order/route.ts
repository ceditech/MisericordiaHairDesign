/**
 * POST /api/paypal/capture-order
 *
 * Captures an approved PayPal order (moves money from buyer → merchant).
 * Called by the PayPal JS SDK's `onApprove` callback.
 *
 * Request body: { orderId: string }
 * Response:     PayPal capture response (status "COMPLETED" = success)
 */

import { NextRequest, NextResponse } from "next/server";
import { captureOrder } from "@/lib/payments/paypal";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId || typeof orderId !== "string") {
            return NextResponse.json(
                { error: "Missing orderId" },
                { status: 400 }
            );
        }

        const captureResult = await captureOrder(orderId);

        return NextResponse.json(captureResult);
    } catch (err) {
        console.error("[API] /api/paypal/capture-order error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Internal server error" },
            { status: 500 }
        );
    }
}
