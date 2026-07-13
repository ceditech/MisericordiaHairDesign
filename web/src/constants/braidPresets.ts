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
    { id: "size-jumbo", label: "Jumbo", description: "Thick, large sections; quickest to install.", priceGuidance: "", priceAdjustment: -40 },
    { id: "size-large", label: "Large", description: "Medium-large thickness.", priceGuidance: "", priceAdjustment: -20 },
    { id: "size-medium", label: "Medium", description: "Standard thickness.", priceGuidance: "", priceAdjustment: 0 },
    { id: "size-smedium", label: "Smedium", description: "Smedium thickness.", priceGuidance: "", priceAdjustment: 20 },
    { id: "size-small", label: "Small", description: "High-density, time-intensive.", priceGuidance: "", priceAdjustment: 40 },
    { id: "size-smallest", label: "Smallest", description: "Maximum density, very time-intensive.", priceGuidance: "", priceAdjustment: 60 },
];

export const LENGTH_PRESETS: LengthPreset[] = [
    { id: "length-shoulder", label: "Shoulder Length", inches: "~12 inches", priceAdjustment: 0 },
    { id: "length-mid-back", label: "Mid-Back", inches: "~16 inches", priceAdjustment: 30 },
    { id: "length-waist", label: "Waist", inches: "~28-30 inches", priceAdjustment: 60 },
    { id: "length-butt", label: "Butt", inches: "Extra-long, premium price", priceAdjustment: 90 },
];

export const ADDON_WASHING = { id: "wash", name: "Washing Service", price: 25, deposit: 25 };
export const ADDON_TAKEDOWN = { id: "take-down", name: "Take Down Service", price: 45, deposit: 45 };

export const DEFAULT_ADDONS = [
    { id: "wash", name: "Washing Service", price: 25, deposit: 25 },
    { id: "take-down", name: "Take Down Service", price: 45, deposit: 45 },
    { id: "detangle", name: "Detangling Service", price: 20, deposit: 20 },
    { id: "hair-synthetic", name: "Hair Included (Basic Synthetic)", price: 20, deposit: 20 },
    { id: "hair-human", name: "Human Curly Hair (Boho/Goddess)", price: 60, deposit: 60 },
    { id: "length-waist-addon", name: "Add: Waist Length", price: 60, deposit: 60 },
    { id: "length-butt-addon", name: "Add: Butt / Extra-Long Length", price: 90, deposit: 90 },
    { id: "size-smedium-addon", name: "Add: Smedium Braid Size Upgrade", price: 20, deposit: 20 },
    { id: "size-small-addon", name: "Add: Small Braid Size Upgrade", price: 40, deposit: 40 },
    { id: "size-smallest-addon", name: "Add: Smallest Braid Size Upgrade", price: 60, deposit: 60 },
    { id: "beads-accessories", name: "Add: Beads / Accessories", price: 10, deposit: 10 },
];
