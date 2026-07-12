import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";


export const TAX_RATE = 0.0825;
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
    addons?: any[];
    promoCode?: string | null;
}

export function calculateBookingPrice(input: PricingInput): PricingResult {
    const baseCents = parseStylePriceCents(input.stylePrice);
    
    // Find presets
    const size = input.sizePresets?.find(s => s.id === input.sizeId) || { priceAdjustment: 0 };
    const length = input.lengthPresets?.find(l => l.id === input.lengthId) || { priceAdjustment: 0 };
    
    const sizeAdjustmentCents = (size as any).priceAdjustment * 100;
    const lengthAdjustmentCents = (length as any).priceAdjustment * 100;
    
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
    if (input.promoCode) {
        const code = input.promoCode.trim().toUpperCase();
        // Check if we have dynamic data from the component (via a global or passed in)
        // Since this is a pure function, we prefer it to be passed in. 
        // I'll add discountPercent to PricingInput.
        const discountPercent = (input as any).discountPercent || 10; 
        
        if (code === "AFFILIATE10" || code.startsWith("DB-AFF-")) {
            discountCents = Math.round(subtotalCents * (discountPercent / 100));
        }
    }

    const discountedSubtotal = subtotalCents - discountCents;
    const taxCents = Math.round(discountedSubtotal * TAX_RATE);
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
