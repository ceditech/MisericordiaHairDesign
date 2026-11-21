/** What the visitor typed, as the Firestore document id in `codes`. */
export function normalizePromoCode(input: string): string {
    return input.trim().toUpperCase();
}

/**
 * The discount percent of a `codes` document, or null when the code does not exist or is not active.
 * Only `active === true` counts. A missing or out-of-range percent (outside 1-100, or not a number) falls back to 10.
 */
export function promoDiscountPercent(data: Record<string, unknown> | null | undefined): number | null {
    if (!data || data.active !== true) return null;
    const pct = data.discountPercent;
    return typeof pct === "number" && pct > 0 && pct <= 100 ? pct : 10;
}
