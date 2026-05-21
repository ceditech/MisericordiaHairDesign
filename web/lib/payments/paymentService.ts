/**
 * PaymentService — Mock-first, Cloud Function-ready
 *
 * MOCK MODE (default):
 *   - Simulates network latency
 *   - Returns a fake sessionId
 *   - Randomly picks success/cancelled/failed outcome
 *
 * REAL MODE (flip MOCK_MODE = false in constants.ts):
 *   - POSTs to PAYMENT_ENDPOINTS.createSession (Firebase Cloud Function)
 *   - GETs  from PAYMENT_ENDPOINTS.getStatus
 *   - No secrets ever touch the frontend
 */

import {
    PaymentProvider,
    PaymentChoice,
    PaymentSession,
    PaymentBookingContext,
    PaymentShopContext,
} from "./types";
import {
    MOCK_MODE,
    MOCK_LATENCY_MS,
    DEPOSIT_CENTS,
    CURRENCY,
    PAYMENT_ENDPOINTS,
} from "./constants";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function randomId(): string {
    return `sess_${Math.random().toString(36).slice(2, 11)}`;
}

/** Weighted random outcome: 70% success, 20% cancelled, 10% failed */
function randomOutcome(): "success" | "cancelled" | "failed" {
    const r = Math.random();
    if (r < 0.70) return "success";
    if (r < 0.90) return "cancelled";
    return "failed";
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── In-memory session store (mock only) ─────────────────────────────────────
// Attach to globalThis so the store survives Next.js HMR re-evaluations.
// Without this, the Map is wiped on every hot-reload, causing getStatus()
// to throw "Session not found" and the checkout to spin forever.

const globalAny = globalThis as any;
if (!globalAny.__mockPaymentSessions) {
    globalAny.__mockPaymentSessions = new Map<string, PaymentSession>();
}
const mockSessions: Map<string, PaymentSession> = globalAny.__mockPaymentSessions;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CreateSessionInput {
    sessionType: 'booking' | 'shop';
    booking?: PaymentBookingContext;
    shop?: PaymentShopContext;
    provider: PaymentProvider;
    choice: PaymentChoice;
    /** Optional override for the full amount in cents (from style price or cart total) */
    amountCents: number;
}

/**
 * Creates a payment session.
 * In mock mode: simulates latency, stores in memory, returns mock session.
 * In real mode: POSTs to the Cloud Function endpoint, returns the parsed response.
 */
export async function createSession(
    input: CreateSessionInput
): Promise<PaymentSession> {
    const amountCents = input.amountCents;

    if (MOCK_MODE) {
        console.log("[PaymentService] Creating mock session...", input);
        await delay(MOCK_LATENCY_MS);
        const session: PaymentSession = {
            id: randomId(),
            provider: input.provider,
            choice: input.choice,
            amountCents,
            currency: CURRENCY,
            status: "redirecting",
            sessionType: input.sessionType,
        };
        mockSessions.set(session.id, session);
        // Resolve outcome after a short redirect delay
        setTimeout(() => {
            const outcome = randomOutcome();
            console.log(`[PaymentService] Mock session ${session.id} resolved to: ${outcome}`);
            const existing = mockSessions.get(session.id);
            if (existing) mockSessions.set(session.id, { ...existing, status: outcome });
        }, 1500);
        return session;
    }

    // ── Real mode ─────────────────────────────────────────────────────────────
    const response = await fetch(PAYMENT_ENDPOINTS.createSession, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionType: input.sessionType,
            booking: input.booking,
            shop: input.shop,
            provider: input.provider,
            choice: input.choice,
            amountCents,
            currency: CURRENCY,
        }),
    });
    if (!response.ok) {
        throw new Error(`Payment service error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<PaymentSession>;
}

/**
 * Fetches the current status of a payment session.
 * In mock mode: reads from in-memory store.
 * In real mode: GETs from the Cloud Function endpoint.
 */
export async function getStatus(sessionId: string): Promise<PaymentSession> {
    if (MOCK_MODE) {
        console.log(`[PaymentService] Polling mock status for ${sessionId}...`);
        await delay(300);
        const session = mockSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        return session;
    }

    const url = `${PAYMENT_ENDPOINTS.getStatus}?sessionId=${encodeURIComponent(sessionId)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Payment service error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<PaymentSession>;
}
