/**
 * PayPal Server-Side Utilities
 *
 * Provides helper functions for interacting with the PayPal REST API.
 * These run ONLY on the server (Next.js API routes) — never in the browser.
 *
 * Uses the PayPal Orders v2 API:
 *   - Create Order: POST /v2/checkout/orders
 *   - Capture Order: POST /v2/checkout/orders/{id}/capture
 *
 * @see https://developer.paypal.com/docs/api/orders/v2/
 */

// ─── Environment ──────────────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

// Cache for access token
let cachedToken: string | null = null;
let tokenExpiry: number = 0; // Epoch timestamp in ms

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Exchange Client ID + Secret for a short-lived OAuth2 access token.
 * This token is used in the Authorization header for all PayPal API calls.
 *
 * @see https://developer.paypal.com/api/rest/#2-get-access-token
 */
export async function generateAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Check if we have a valid cached token (with a 60-second buffer)
    if (cachedToken && now < tokenExpiry - 60000) {
        return cachedToken as string;
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || PAYPAL_CLIENT_ID === "YOUR_PAYPAL_CLIENT_ID") {
        throw new Error(
            "Missing PayPal credentials. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local"
        );
    }

    const credentials = Buffer.from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[PayPal] Failed to generate access token:", errorText);
        throw new Error(`PayPal auth failed: ${response.status}`);
    }

    const data = await response.json();
    
    cachedToken = data.access_token as string;
    // expires_in is typically in seconds
    tokenExpiry = now + (data.expires_in * 1000);
    
    return cachedToken!;
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export interface CreateOrderParams {
    /** Amount in USD (e.g. "50.00") */
    amountUSD: string;
    /** Currency code (default: "USD") */
    currency?: string;
    /** Description shown to the buyer */
    description?: string;
    /**
     * URL to redirect buyer to after approving the payment.
     * Required for redirect-based checkout (no JS SDK).
     */
    returnUrl?: string;
    /**
     * URL to redirect buyer to if they cancel on PayPal.
     * Required for redirect-based checkout (no JS SDK).
     */
    cancelUrl?: string;
}

/**
 * Create a PayPal order with CAPTURE intent.
 *
 * Supports two flows:
 * - **Redirect (recommended)**: Pass returnUrl + cancelUrl. Buyer is redirected
 *   to PayPal's hosted page; no PayPal JS SDK required on the client.
 * - **Popup (legacy)**: Omit returnUrl/cancelUrl. Buyer approves in the SDK popup.
 *
 * @returns The full PayPal order response (includes `id` and `links`)
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
export async function createOrder(params: CreateOrderParams) {
    const { amountUSD, currency = "USD", description, returnUrl, cancelUrl } = params;
    const accessToken = await generateAccessToken();

    const payload: Record<string, unknown> = {
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: currency,
                    value: amountUSD,
                },
                ...(description ? { description } : {}),
            },
        ],
    };

    // Add redirect URLs for hosted checkout flow
    if (returnUrl && cancelUrl) {
        payload.application_context = {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            user_action: "PAY_NOW",
            brand_name: "Misericordia Hair Design",
            shipping_preference: "NO_SHIPPING",
        };
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[PayPal] Create order failed:", errorText);
        throw new Error(`PayPal create order failed: ${response.status}`);
    }

    return response.json();
}

// ─── Capture Order ────────────────────────────────────────────────────────────

/**
 * Capture an approved PayPal order (moves money from buyer → merchant).
 *
 * Call this AFTER the buyer approves the order in the PayPal popup.
 *
 * @param orderId - The PayPal order ID from `createOrder()`
 * @returns The capture response (status `COMPLETED` = payment successful)
 *
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
export async function captureOrder(orderId: string) {
    const accessToken = await generateAccessToken();

    const response = await fetch(
        `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[PayPal] Capture order failed:", errorText);
        throw new Error(`PayPal capture failed: ${response.status}`);
    }

    return response.json();
}
