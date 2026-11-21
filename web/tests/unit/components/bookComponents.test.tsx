// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import { ProgressStepper } from "@/components/book/ProgressStepper";
import { DraftRestoredBanner } from "@/components/book/DraftRestoredBanner";
import { NoSlotsModal } from "@/components/book/NoSlotsModal";
import { CustomizationSection } from "@/components/book/CustomizationSection";
import { ReviewSummary } from "@/components/book/ReviewSummary";

afterEach(cleanup);

describe("ProgressStepper", () => {
    const steps = [
        { step: 1, label: "Style" },
        { step: 2, label: "Time" },
        { step: 3, label: "Details" },
        { step: 4, label: "Review" },
    ];

    it("shows a check for finished steps and the number for the current and later ones", () => {
        render(<ProgressStepper currentStep={3} steps={steps} />);
        expect(screen.getAllByText("check")).toHaveLength(2);
        expect(screen.getByText("3")).toBeTruthy();
        expect(screen.getByText("4")).toBeTruthy();
        expect(screen.queryByText("1")).toBeNull();
        expect(screen.getByText("Review")).toBeTruthy();
    });

    it("shows no checks on the first step", () => {
        render(<ProgressStepper currentStep={1} steps={steps} />);
        expect(screen.queryAllByText("check")).toHaveLength(0);
    });
});

describe("DraftRestoredBanner", () => {
    it("calls onStartOver and onDismiss from its two buttons", () => {
        const onStartOver = vi.fn();
        const onDismiss = vi.fn();
        render(<DraftRestoredBanner onStartOver={onStartOver} onDismiss={onDismiss} />);

        expect(screen.getByText(/We restored your booking draft/)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss and clear draft" }));
        expect(onStartOver).toHaveBeenCalledTimes(1);
        expect(onDismiss).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});

describe("NoSlotsModal", () => {
    it("names the date and the style duration, and closes from its button", () => {
        const onClose = vi.fn();
        render(<NoSlotsModal isOpen onClose={onClose} date="November 25, 2026" styleDuration="4-6 hours" />);

        expect(screen.getByText("November 25, 2026")).toBeTruthy();
        expect(screen.getByText("4-6 hours")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Select Another Day" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("renders nothing when closed", () => {
        render(<NoSlotsModal isOpen={false} onClose={() => {}} date="November 25, 2026" />);
        expect(screen.queryByText("Select Another Day")).toBeNull();
    });
});

describe("CustomizationSection", () => {
    const sizePresets = [
        { id: "size-small", type: "size", label: "Small", description: "Dense", priceGuidance: "+$40", priceAdjustment: 40 },
        { id: "size-medium", type: "size", label: "Medium", description: "Standard", priceGuidance: "", priceAdjustment: 0 },
    ] as unknown as SizePreset[];
    const lengthPresets = [{ id: "length-mid", type: "length", label: "Mid-back", inches: "~20 inches", priceAdjustment: 0 }] as unknown as LengthPreset[];
    const values = { sizeId: "size-small", lengthId: "", washingAddon: false, takeDownAddon: false };
    const setup = (addons: AddonDoc[] = []) => {
        const onChange = vi.fn();
        render(<CustomizationSection styleName="Box Braids" sizePresets={sizePresets} lengthPresets={lengthPresets} addons={addons} values={values} onChange={onChange} />);
        return onChange;
    };

    it("names the style and marks only the selected size", () => {
        setup();
        expect(screen.getByText("Customize Your Box Braids")).toBeTruthy();
        expect(screen.getAllByText("check")).toHaveLength(1);
    });

    it("reports a size, a length and each add-on as a patch", () => {
        const onChange = setup();
        fireEvent.click(screen.getByText("Medium"));
        expect(onChange).toHaveBeenLastCalledWith({ sizeId: "size-medium" });
        fireEvent.click(screen.getByText("Mid-back"));
        expect(onChange).toHaveBeenLastCalledWith({ lengthId: "length-mid" });
        const [wash, takeDown] = screen.getAllByRole("checkbox");
        fireEvent.click(wash);
        expect(onChange).toHaveBeenLastCalledWith({ washingAddon: true });
        fireEvent.click(takeDown);
        expect(onChange).toHaveBeenLastCalledWith({ takeDownAddon: true });
    });

    it("shows the default add-on prices, or the owner's prices when set", () => {
        setup();
        expect(screen.getByText(/Add Washing Service \(\+\$25\)/)).toBeTruthy();
        expect(screen.getByText(/Add Take Down Service \(\+\$45\)/)).toBeTruthy();
        cleanup();
        setup([{ id: "wash", price: 30 }, { id: "take-down", price: 50 }] as unknown as AddonDoc[]);
        expect(screen.getByText(/Add Washing Service \(\+\$30\)/)).toBeTruthy();
        expect(screen.getByText(/Add Take Down Service \(\+\$50\)/)).toBeTruthy();
    });
});

describe("ReviewSummary", () => {
    const base = { styleName: "Box Braids", styleDuration: "3-4 hours", date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100", photoPreview: "" };

    it("shows the choices and the deposit and price notices", () => {
        render(<ReviewSummary {...base} />);
        expect(screen.getByText("Box Braids")).toBeTruthy();
        expect(screen.getByText("November 25, 2026")).toBeTruthy();
        expect(screen.getByText("(214) 555-0100")).toBeTruthy();
        expect(screen.getByText(/Non-Refundable Deposit Required/)).toBeTruthy();
        expect(screen.getByText("Final Price Disclaimer")).toBeTruthy();
        expect(screen.queryByAltText("Style inspiration")).toBeNull();
    });

    it("falls back for empty fields and shows the photo when there is one", () => {
        render(<ReviewSummary {...base} date="" time="" name="" email="" phone="" photoPreview="blob:x" />);
        expect(screen.getAllByText("Not selected")).toHaveLength(2);
        expect(screen.getAllByText("N/A")).toHaveLength(2);
        expect(screen.getByAltText("Style inspiration")).toBeTruthy();
    });
});
