import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";


/**
 * Services (bookings) are NOT taxed in Texas, so the booking tax rate is 0.
 * Shop products are taxed separately (SHOP_TAX_RATE_BPS in src/lib/shop/orderPricing.ts).
 * `taxCents` stays in the result (always 0) so stored drafts and bookings keep their shape.
 */
export const BOOKING_TAX_RATE = 0;
export const BASE_DEPOSIT_CENTS = 5000;

/**
 * Attempt to extract a minimum dollar amount from price strings like
 * "$200 and up", "$150 and up", "$350 and up".
 * Returns cents.
 */
export function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

export function parseStylePriceCents(price: string | number): number {
    if (typeof price === "number") {
        return Math.round(price * 100);
    }
    if (!price) return 0;

    const priceStr = String(price);
    const match = priceStr.match(/\$(\d+(\.\d+)?)/);
    if (!match) {
        const parsed = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
        return isNaN(parsed) ? 0 : Math.round(parsed * 100);
    }
    return Math.round(parseFloat(match[1]) * 100);
}

/** Add-on price and deposit in dollars (from the `braidAddons` collection). */
export interface AddonPricing {
    id: string;
    price: number;
    deposit: number;
}

export interface PricingResult {
    baseCents: number;
    sizeAdjustmentCents: number;
    lengthAdjustmentCents: number;
    addonCents: number;
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    totalCents: number;
    depositCents: number;
}

/**
 * Standardized pricing calculation for bookings.
 */
export interface PricingInput {
    stylePrice: string | number;
    sizeId: string;
    lengthId: string;
    washingAddon: boolean;
    takeDownAddon: boolean;
    sizePresets?: SizePreset[];
    lengthPresets?: LengthPreset[];
    addons?: AddonPricing[];
    /**
     * A promo already validated against the `codes` collection (active, with its percent).
     * Never derived from the code text: callers must look the code up first.
     */
    promo?: { code: string; discountPercent: number } | null;
}

export function calculateBookingPrice(input: PricingInput): PricingResult {
    const baseCents = parseStylePriceCents(input.stylePrice);
    
    // Find presets
    const size = input.sizePresets?.find(s => s.id === input.sizeId) || { priceAdjustment: 0 };
    const length = input.lengthPresets?.find(l => l.id === input.lengthId) || { priceAdjustment: 0 };
    
    const sizeAdjustmentCents = size.priceAdjustment * 100;
    const lengthAdjustmentCents = length.priceAdjustment * 100;
    
    let addonCents = 0;
    let addonDepositCents = 0;
    
    if (input.washingAddon) {
        const addon = input.addons?.find(a => a.id === "wash") || { price: 25, deposit: 25 };
        addonCents += addon.price * 100;
        addonDepositCents += addon.deposit * 100;
    }
    if (input.takeDownAddon) {
        const addon = input.addons?.find(a => a.id === "take-down") || { price: 45, deposit: 45 };
        addonCents += addon.price * 100;
        addonDepositCents += addon.deposit * 100;
    }

    const subtotalCents = baseCents + sizeAdjustmentCents + lengthAdjustmentCents + addonCents;
    
    let discountCents = 0;
    if (input.promo && input.promo.discountPercent > 0) {
        const pct = Math.min(input.promo.discountPercent, 100);
        discountCents = Math.round(subtotalCents * (pct / 100));
    }

    const discountedSubtotal = subtotalCents - discountCents;
    const taxCents = Math.round(discountedSubtotal * BOOKING_TAX_RATE);
    const totalCents = discountedSubtotal + taxCents;
    
    const depositCents = BASE_DEPOSIT_CENTS + addonDepositCents;

    return {
        baseCents,
        sizeAdjustmentCents,
        lengthAdjustmentCents,
        addonCents,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        depositCents
    };
}
