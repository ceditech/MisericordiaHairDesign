export const DEPOSIT_CENTS = 5000; // $50.00

export const CURRENCY = "USD";

/**
 * Base URL for the payment API.
 * - In mock mode this is unused.
 * - Replace with your Firebase Cloud Functions base URL when ready.
 * - Keep empty for relative URLs (same origin).
 * @example "https://us-central1-your-project.cloudfunctions.net"
 */
export const PAYMENT_API_BASE_URL = "";

/**
 * Placeholder API endpoints (POST/GET).
 * These will be implemented as Firebase Cloud Functions in a later milestone.
 */
export const PAYMENT_ENDPOINTS = {
    createSession: `${PAYMENT_API_BASE_URL}/api/payments/create-session`,
    getStatus: `${PAYMENT_API_BASE_URL}/api/payments/status`,
} as const;

/**
 * Set to true to use the mock payment service (no real charges).
 * Flip to false once Cloud Function endpoints are live.
 */
export const MOCK_MODE = true;

/** Simulated network latency in mock mode (ms) */
export const MOCK_LATENCY_MS = 1800;
