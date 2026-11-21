import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { BraidStyle } from "@/src/lib/styles";
import { saveDraft, loadDraft } from "@/src/lib/bookingDraft";

/** Everything the booking wizard collects, except the chosen style and the current step. */
export interface BookingFormData {
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    inspirationPhoto: File | null;
    photoPreview: string;
    sizeId: string;
    lengthId: string;
    washingAddon: boolean;
    takeDownAddon: boolean;
    password: string;
    createAccount: boolean;
}

export const EMPTY_BOOKING_FORM: BookingFormData = {
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
    inspirationPhoto: null,
    photoPreview: "",
    sizeId: "",
    lengthId: "",
    washingAddon: false,
    takeDownAddon: false,
    password: "",
    createAccount: true,
};

interface UseBookingDraftArgs {
    /** `?style=` from the URL. It wins over the style saved in the draft. */
    styleParam: string | null;
    /** Latest styles from Firestore (may still be empty when the draft is restored). */
    stylesRef: MutableRefObject<BraidStyle[]>;
    /** Style id saved in the draft that is waiting for the styles to load. The page reads it when styles arrive. */
    draftStyleId: MutableRefObject<string | undefined>;
    selectedStyle: BraidStyle | null;
    currentStep: number;
    bookingData: BookingFormData;
    setSelectedStyle: Dispatch<SetStateAction<BraidStyle | null>>;
    setCurrentStep: Dispatch<SetStateAction<number>>;
    setBookingData: Dispatch<SetStateAction<BookingFormData>>;
}

/**
 * Restores the booking draft once after mount and saves it on every relevant change.
 * Saving starts only after the restore ran, so a half-initialised page never overwrites the saved draft.
 * Declare it after the state it reads, and before the effects that prefill from the profile.
 */
export function useBookingDraft({
    styleParam,
    stylesRef,
    draftStyleId,
    selectedStyle,
    currentStep,
    bookingData,
    setSelectedStyle,
    setCurrentStep,
    setBookingData,
}: UseBookingDraftArgs) {
    const [draftRestored, setDraftRestored] = useState(false);
    // Guard: only start persisting AFTER draft hydration has run
    const hydrated = useRef(false);

    // ── Draft hydration — runs once after mount (client-only) ─────────────────
    useEffect(() => {
        const draft = loadDraft();
        if (!draft) { hydrated.current = true; return; }

        // URL ?style= param takes priority over the saved draft style
        if (!styleParam && draft.styleId) {
            const savedStyle = stylesRef.current.find((s) => s.id === draft.styleId);
            if (savedStyle) setSelectedStyle(savedStyle);
            else draftStyleId.current = draft.styleId;
        }

        if (draft.currentStep > 1) setCurrentStep(draft.currentStep);

        setBookingData((prev) => ({
            ...prev,
            date: draft.date || prev.date,
            time: draft.time || prev.time,
            name: draft.name || prev.name,
            email: draft.email || prev.email,
            phone: draft.phone || prev.phone,
            notes: draft.notes || prev.notes,
            photoPreview: draft.photoPreview || prev.photoPreview,
            sizeId: draft.sizeId || prev.sizeId,
            lengthId: draft.lengthId || prev.lengthId,
            washingAddon: draft.washingAddon ?? prev.washingAddon,
            takeDownAddon: draft.takeDownAddon ?? prev.takeDownAddon,
            password: draft.password || prev.password,
            createAccount: draft.createAccount ?? prev.createAccount,
        }));

        if (draft.date || draft.name || draft.currentStep > 1) {
            setDraftRestored(true);
        }

        hydrated.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — runs once on mount

    // ── Persist draft on every relevant state change ──────────────────────────
    useEffect(() => {
        // Don't overwrite the draft until hydration has completed
        if (!hydrated.current) return;
        saveDraft({
            styleId: selectedStyle?.id ?? draftStyleId.current,
            currentStep,
            date: bookingData.date,
            time: bookingData.time,
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            notes: bookingData.notes,
            photoPreview: bookingData.photoPreview,
            sizeId: bookingData.sizeId,
            lengthId: bookingData.lengthId,
            washingAddon: bookingData.washingAddon,
            takeDownAddon: bookingData.takeDownAddon,
            password: bookingData.password,
            createAccount: bookingData.createAccount,
        });
    }, [selectedStyle, currentStep, bookingData, draftStyleId]);

    return { draftRestored, setDraftRestored };
}
