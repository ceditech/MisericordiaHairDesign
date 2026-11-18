/**
 * Server-side promo code lookup shared by shop orders and booking payments.
 *
 * A promo is valid only if a document with that id exists in the `codes` collection
 * (affiliate codes are stored there) and is `active`. Nothing is inferred from the code's
 * text, so invented or retired codes (e.g. AFFILIATE10) never earn a discount.
 */
import { adminDb } from "@/src/lib/firebase/admin";

export interface ActivePromo {
    code: string;
    discountPercent: number;
}

export class PromoError extends Error {
    constructor(message = "Invalid promotional code.") {
        super(message);
        this.name = "PromoError";
    }
}

const DEFAULT_DISCOUNT_PERCENT = 10;

/** Returns null when no code was given; throws PromoError when the code is not valid. */
export async function loadActivePromo(rawCode: unknown): Promise<ActivePromo | null> {
    if (rawCode === undefined || rawCode === null || rawCode === "") return null;
    if (typeof rawCode !== "string" || rawCode.length > 40) throw new PromoError();
    const code = rawCode.trim().toUpperCase();
    if (!code) return null;
    const snap = await adminDb.collection("codes").doc(code).get();
    const data = snap.exists ? snap.data() : null;
    if (!data || data.active !== true) throw new PromoError();
    const pct = data.discountPercent;
    return { code, discountPercent: typeof pct === "number" && pct > 0 && pct <= 100 ? pct : DEFAULT_DISCOUNT_PERCENT };
}
