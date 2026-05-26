import Stripe from "stripe";

/**
 * Stripe Server-Side Singleton
 * 
 * Provides a robust, unified instance of the Stripe client for use in API routes.
 * Handles lazy initialization and environment variable verification to prevent 
 * configuration-related 500 errors.
 */

let stripeInstance: Stripe | null = null;

/**
 * Retrieves the Stripe server-side instance.
 * Lazily initializes the client on the first call to ensure environment 
 * variables are loaded and the context is valid.
 */
export function getStripeServer(): Stripe {
    // If instance already exists, reuse it
    if (stripeInstance) return stripeInstance;

    // Get and trim the secret key from environment variables
    const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();

    // 1. Check for missing key
    if (!secretKey) {
        const errorMsg = "[Stripe] Missing STRIPE_SECRET_KEY in environment variables.";
        console.error(errorMsg);
        throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env file.");
    }

    // 2. Basic prefix validation (sk_ or rk_)
    if (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_")) {
        console.warn(
            `[Stripe] Potential invalid secret key prefix: "${secretKey.substring(0, 3)}...". ` +
            "Expected 'sk_test_', 'sk_live_', 'rk_test_', or 'rk_live_'."
        );
    }

    try {
        // Initialize the Stripe client
        // NOTE: We do NOT hardcode apiVersion to ensure the SDK uses its default stable version.
        // This prevents "Invalid Stripe API version" errors when the SDK and manual version mismatch.
        stripeInstance = new Stripe(secretKey, {
            typescript: true,
            appInfo: {
                name: "Misericordia Hair Design",
                version: "1.0.0",
            },
            // Use fetch-based client for better performance/compatibility in Next.js
            httpClient: Stripe.createFetchHttpClient(),
            maxNetworkRetries: 3,
            timeout: 30000, 
        });

        console.log(`[Stripe] Client initialized successfully (Key: ${secretKey.substring(0, 7)}... [len:${secretKey.length}])`);
        return stripeInstance;
    } catch (err) {
        console.error("[Stripe] Failed to initialize client:", err);
        throw new Error("Critical error initializing Stripe payment system.");
    }
}

/**
 * NOTE: Avoid top-level initialization (const stripe = getStripeServer()) here.
 * Instead, call getStripeServer() inside your API routes or async functions 
 * to ensure environment variables are properly loaded by Next.js.
 */
