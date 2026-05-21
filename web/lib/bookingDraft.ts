/**
 * Shared BookingDraft module
 * Used by both /book (wizard) and /checkout pages.
 */

export const DRAFT_KEY = "dedes_booking_draft";

export interface BookingDraft {
    styleId?: string;
    sizeId?: string;
    lengthId?: string;
    washingAddon?: boolean;
    takeDownAddon?: boolean;
    currentStep: number;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    notes: string;
    /** Base64 data-URL — raw File object is not serializable */
    photoPreview?: string;
    photoUrl?: string; // after uploading to Storage
    // Account creation
    password?: string;
    createAccount?: boolean;
}

export function saveDraft(draft: BookingDraft): void {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* quota exceeded – silently ignore */ }
}

export function loadDraft(): BookingDraft | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? (JSON.parse(raw) as BookingDraft) : null;
    } catch {
        return null;
    }
}

export function clearDraft(): void {
    try { 
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem("checkoutDraftId");
    } catch { /* ignore */ }
}

/** Returns true if the draft has enough data to proceed to checkout */
export function isDraftValid(draft: BookingDraft | null): draft is BookingDraft {
    if (!draft) return false;
    return !!(draft.styleId && draft.date && draft.time && draft.name && draft.email && draft.phone);
}

// ─── Confirmed booking (persisted to localStorage for success page) ──────────

const CONFIRMED_KEY = "dedes_confirmed_booking";

export interface ConfirmedBooking {
    styleName: string;
    sizeName?: string;
    lengthName?: string;
    washingAddon?: boolean;
    takeDownAddon?: boolean;
    duration: string;
    price: string;
    date: string;
    time: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    amountPaidLabel: string;
    paymentChoice: "deposit" | "full";
    provider: "stripe" | "paypal";
    draftId?: string;
}

export function saveConfirmedBooking(booking: ConfirmedBooking): void {
    try {
        localStorage.setItem(CONFIRMED_KEY, JSON.stringify(booking));
    } catch { /* ignore */ }
}

export function loadConfirmedBooking(): ConfirmedBooking | null {
    try {
        const raw = localStorage.getItem(CONFIRMED_KEY);
        return raw ? (JSON.parse(raw) as ConfirmedBooking) : null;
    } catch {
        return null;
    }
}

export function clearConfirmedBooking(): void {
    try { localStorage.removeItem(CONFIRMED_KEY); } catch { /* ignore */ }
}
