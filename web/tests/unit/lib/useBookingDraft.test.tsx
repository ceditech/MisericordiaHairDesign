// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useState, useRef } from "react";
import type { BraidStyle } from "@/src/lib/styles";
import { useBookingDraft, EMPTY_BOOKING_FORM, type BookingFormData } from "@/src/lib/bookings/useBookingDraft";

const KEY = "dedes_booking_draft";
const box = { id: "box", name: "Box Braids" } as unknown as BraidStyle;
const knotless = { id: "knotless", name: "Knotless" } as unknown as BraidStyle;
const saved = { styleId: "box", currentStep: 3, date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100", notes: "Fine braids" };
const stored = () => JSON.parse(sessionStorage.getItem(KEY) ?? "{}");

/** A tiny host for the hook, with the same state the booking page owns. */
function useHost(styleParam: string | null, styles: BraidStyle[]) {
    const [selectedStyle, setSelectedStyle] = useState<BraidStyle | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState<BookingFormData>(EMPTY_BOOKING_FORM);
    const stylesRef = useRef<BraidStyle[]>(styles);
    const draftStyleId = useRef<string | undefined>(undefined);
    const draft = useBookingDraft({ styleParam, stylesRef, draftStyleId, selectedStyle, currentStep, bookingData, setSelectedStyle, setCurrentStep, setBookingData });
    return { ...draft, selectedStyle, currentStep, bookingData, setBookingData, draftStyleId };
}

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe("useBookingDraft", () => {
    it("restores the step and the fields, and flags the draft as restored", () => {
        sessionStorage.setItem(KEY, JSON.stringify(saved));
        const { result } = renderHook(() => useHost(null, [box, knotless]));

        expect(result.current.currentStep).toBe(3);
        expect(result.current.bookingData).toMatchObject({ date: "November 25, 2026", time: "10:00 AM", name: "Ada", notes: "Fine braids" });
        expect(result.current.draftRestored).toBe(true);
    });

    it("selects the saved style when the styles are already loaded", () => {
        sessionStorage.setItem(KEY, JSON.stringify(saved));
        const { result } = renderHook(() => useHost(null, [box, knotless]));
        expect(result.current.selectedStyle?.id).toBe("box");
    });

    it("remembers the saved style id when the styles have not loaded yet, and keeps saving it", () => {
        sessionStorage.setItem(KEY, JSON.stringify(saved));
        const { result } = renderHook(() => useHost(null, []));

        expect(result.current.selectedStyle).toBeNull();
        expect(result.current.draftStyleId.current).toBe("box");
        expect(stored().styleId).toBe("box");
    });

    it("lets ?style= in the URL win over the saved style", () => {
        sessionStorage.setItem(KEY, JSON.stringify(saved));
        const { result } = renderHook(() => useHost("knotless", [box, knotless]));

        expect(result.current.selectedStyle).toBeNull(); // the page picks the URL style when styles arrive
        expect(result.current.draftStyleId.current).toBeUndefined();
    });

    it("does not flag a fresh visit as restored", () => {
        const { result } = renderHook(() => useHost(null, [box]));
        expect(result.current.draftRestored).toBe(false);
        expect(result.current.currentStep).toBe(1);
    });

    it("saves later changes to the draft", () => {
        const { result } = renderHook(() => useHost(null, [box]));
        act(() => result.current.setBookingData((prev) => ({ ...prev, name: "Grace", washingAddon: true })));

        expect(stored()).toMatchObject({ name: "Grace", washingAddon: true, currentStep: 1 });
    });
});
