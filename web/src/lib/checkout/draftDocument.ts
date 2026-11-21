import { sanitizeDraftForPersistence, type BookingDraft, type ConfirmedBooking } from "@/src/lib/bookingDraft";
import { formatCents, type calculateBookingPrice } from "@/src/lib/pricing";
import type { PaymentChoice, PaymentProvider } from "@/src/lib/payments/types";

type Pricing = ReturnType<typeof calculateBookingPrice>;
type Preset = { id: string; label: string };

interface DraftDocumentInput {
    draft: BookingDraft;
    /** The checkout session's draft id (the Firestore document id). */
    id: string;
    /** The signed-in or newly created user, or null for a guest. */
    userId: string | null;
    style: { name?: string };
    sizePresets: Preset[];
    lengthPresets: Preset[];
    photoUrl: string | null;
    amountDueCents: number;
    paymentChoice: PaymentChoice;
    promoCode: string | null;
    provider: PaymentProvider;
    pricing: Pricing;
}

/**
 * The `bookingDrafts/{id}` document the payment routes and webhook read before and after payment.
 * Built from the sanitized draft, so the password, account-creation flag and raw photo never reach Firestore.
 * The caller adds `updatedAt`.
 */
export function buildBookingDraftDocument(input: DraftDocumentInput): Record<string, unknown> {
    const { draft, id, userId, style, sizePresets, lengthPresets, photoUrl, amountDueCents, paymentChoice, promoCode, provider, pricing } = input;
    return {
        ...sanitizeDraftForPersistence(draft),
        id,
        userId: userId || null,
        styleId: draft.styleId || null,
        styleName: style.name || null,
        sizeName: sizePresets.find((s) => s.id === draft.sizeId)?.label || null,
        lengthName: lengthPresets.find((l) => l.id === draft.lengthId)?.label || null,
        date: draft.date || null,
        time: draft.time || null,
        clientName: draft.name || null,
        clientEmail: draft.email || null,
        clientPhone: draft.phone || null,
        photoUrl: photoUrl || null,
        amountPaidLabel: formatCents(amountDueCents),
        paymentChoice,
        promoCode: promoCode || null,
        provider,
        pricing: {
            baseCents: pricing.baseCents,
            subtotalCents: pricing.subtotalCents,
            discountCents: pricing.discountCents,
            taxCents: pricing.taxCents,
            totalCents: pricing.totalCents,
            depositCents: pricing.depositCents,
            amountDueCents,
        },
    };
}

interface ConfirmedBookingInput {
    draft: BookingDraft;
    id: string;
    style: { name: string; duration: string; price: string | number };
    sizePresets: Preset[];
    lengthPresets: Preset[];
    amountDueCents: number;
    paymentChoice: PaymentChoice;
    provider: PaymentProvider;
}

/** What the success page reads back from localStorage. Falls back to "Medium" / "Shoulder" when a preset is gone. */
export function buildConfirmedBooking(input: ConfirmedBookingInput): ConfirmedBooking {
    const { draft, id, style, sizePresets, lengthPresets, amountDueCents, paymentChoice, provider } = input;
    return {
        styleName: style.name,
        sizeName: sizePresets.find((s) => s.id === draft.sizeId)?.label || "Medium",
        lengthName: lengthPresets.find((l) => l.id === draft.lengthId)?.label || "Shoulder",
        washingAddon: !!draft.washingAddon,
        takeDownAddon: !!draft.takeDownAddon,
        duration: style.duration,
        price: String(style.price),
        date: draft.date,
        time: draft.time,
        clientName: draft.name,
        clientEmail: draft.email,
        clientPhone: draft.phone,
        amountPaidLabel: formatCents(amountDueCents),
        paymentChoice,
        provider,
        draftId: id,
    };
}
