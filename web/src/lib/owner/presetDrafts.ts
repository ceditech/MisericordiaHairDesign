import type { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import type { AddonPricing } from "@/src/lib/pricing";

/** A preset as the owner edits it: size presets use `description`, length presets use `inches`. */
export interface PresetDraft {
    id: string;
    type: "size" | "length";
    label: string;
    priceAdjustment: number;
    description?: string;
    inches?: string;
    priceGuidance?: string;
}

export const EMPTY_PRESET_DRAFT: PresetDraft = {
    id: "",
    type: "size",
    label: "",
    priceAdjustment: 0,
    description: "",
    inches: "",
    priceGuidance: "",
};

/**
 * Copy of a stored preset for editing. Stored documents carry `type`; built-in defaults do not,
 * so it is inferred from which text field the preset has.
 */
export function toPresetDraft(preset: SizePreset | LengthPreset): PresetDraft {
    return { ...preset, type: preset.type ?? ("inches" in preset ? "length" : "size") };
}

/** Edit-form state for an add-on; `name` is always a string so the draft can be saved as is. */
export type AddonDraft = AddonPricing & { name: string };

export const EMPTY_ADDON_DRAFT: AddonDraft = { id: "", name: "", price: 0, deposit: 0 };

export function toAddonDraft(addon: AddonPricing & { name?: string }): AddonDraft {
    return { ...addon, name: addon.name ?? "" };
}

/** Sets the text field that belongs to the draft's type (`description` for size, `inches` for length). */
export function withPresetText(draft: PresetDraft, text: string): PresetDraft {
    return draft.type === "size" ? { ...draft, description: text } : { ...draft, inches: text };
}
