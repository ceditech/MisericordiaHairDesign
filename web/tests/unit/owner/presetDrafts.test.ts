import { describe, it, expect } from "vitest";
import {
    EMPTY_PRESET_DRAFT,
    toPresetDraft,
    toAddonDraft,
    withPresetText,
} from "@/src/lib/owner/presetDrafts";

describe("toPresetDraft", () => {
    it("keeps the stored type and every stored field", () => {
        const draft = toPresetDraft({ id: "size-small", type: "size", label: "Small", description: "Dense", priceGuidance: "", priceAdjustment: 40 });
        expect(draft).toEqual({ id: "size-small", type: "size", label: "Small", description: "Dense", priceGuidance: "", priceAdjustment: 40 });
    });

    it("infers length for a built-in default that has no type", () => {
        expect(toPresetDraft({ id: "length-waist", label: "Waist", inches: "~28 inches", priceAdjustment: 60 }).type).toBe("length");
    });

    it("infers size for a built-in default that has no type", () => {
        expect(toPresetDraft({ id: "size-medium", label: "Medium", description: "Standard", priceGuidance: "", priceAdjustment: 0 }).type).toBe("size");
    });
});

describe("withPresetText", () => {
    it("writes description for a size draft", () => {
        expect(withPresetText({ ...EMPTY_PRESET_DRAFT, type: "size" }, "Thick").description).toBe("Thick");
    });

    it("writes inches for a length draft and leaves description alone", () => {
        const next = withPresetText({ ...EMPTY_PRESET_DRAFT, type: "length", description: "keep" }, "~12 inches");
        expect(next.inches).toBe("~12 inches");
        expect(next.description).toBe("keep");
    });
});

describe("toAddonDraft", () => {
    it("defaults a missing name to an empty string", () => {
        expect(toAddonDraft({ id: "a", price: 10, deposit: 5 })).toEqual({ id: "a", name: "", price: 10, deposit: 5 });
    });

    it("keeps an existing name", () => {
        expect(toAddonDraft({ id: "a", name: "Hair", price: 10, deposit: 5 }).name).toBe("Hair");
    });
});
