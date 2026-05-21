// ─── Shared Braid Presets ─────────────────────────────────────────────────────

export interface SizePreset {
    id: string;
    label: string;
    description: string;
    priceGuidance: string;
    priceAdjustment: number; // Simplified assumption: starting price represents "Medium", adjusted below.
}

export interface LengthPreset {
    id: string;
    label: string;
    inches: string;
    priceAdjustment: number;
}

// NOTE: priceAdjustment values are estimates to be updated by the client if needed.
// These allow for a dynamic price calculation logic in Checkout.

export const SIZE_PRESETS: SizePreset[] = [
    { id: "size-jumbo", label: "Jumbo", description: "Thick, large sections; quickest to install.", priceGuidance: "$75–$350", priceAdjustment: -20 },
    { id: "size-large", label: "Large", description: "Medium-large thickness.", priceGuidance: "$100–$225", priceAdjustment: -10 },
    { id: "size-medium", label: "Medium", description: "Standard thickness.", priceGuidance: "$120–$275", priceAdjustment: 0 },
    { id: "size-small", label: "Small / Smallest", description: "High-density, time-intensive.", priceGuidance: "$140–$600", priceAdjustment: 50 },
];

export const LENGTH_PRESETS: LengthPreset[] = [
    { id: "length-shoulder", label: "Shoulder Length", inches: "~12 inches", priceAdjustment: 0 },
    { id: "length-mid-back", label: "Mid-Back", inches: "~16 inches", priceAdjustment: 30 },
    { id: "length-waist", label: "Waist / Hip Length", inches: "~28–30 inches", priceAdjustment: 70 },
    { id: "length-butt", label: "Butt / Knee Length", inches: "Extra-long, premium price", priceAdjustment: 120 },
];

export const ADDON_WASHING = { id: "wash", name: "Washing Service", price: 15, deposit: 15 };
export const ADDON_TAKEDOWN = { id: "take-down", name: "Take Down Service", price: 30, deposit: 30 };
