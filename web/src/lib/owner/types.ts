/**
 * Shapes of the Firestore documents the owner dashboard reads. Fields are optional
 * because older, seeded and test documents do not all carry the same ones.
 */

/** A Firestore Timestamp, a Date, or a legacy string/number date. */
export type TimeValue = { toDate: () => Date } | Date | string | number | null | undefined;

/** An amount that older documents stored as a number or a formatted string such as "$120". */
export type LooseAmount = number | string | null | undefined;

export interface OwnerBooking {
    id: string;
    status?: string;
    isSeedData?: boolean;
    createdAt?: TimeValue;
    updatedAt?: TimeValue;
    // money, in cents unless noted
    totalCents?: number;
    amountCents?: LooseAmount;
    priceCents?: LooseAmount;
    amountPaidCents?: LooseAmount;
    depositCents?: number;
    totalAmountCents?: LooseAmount;
    totalPriceCents?: LooseAmount;
    pricing?: { amountDueCents?: number; depositCents?: number; depositPaidCents?: number };
    // legacy dollar fields
    price?: LooseAmount;
    totalAmount?: LooseAmount;
    totalPrice?: LooseAmount;
    // refunds
    forfeited?: boolean;
    refundStatus?: string;
    // display
    styleName?: string;
    service?: string;
    styleImage?: string;
    imageUrl?: string;
    date?: string;
    time?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    name?: string;
    email?: string;
    phone?: string;
}

export interface OwnerOrderItem {
    name?: string;
    imageUrl?: string;
    image?: string;
    quantity?: number;
    amountCents?: LooseAmount;
    priceCents?: LooseAmount;
    price?: LooseAmount;
    totalPrice?: LooseAmount;
}

export interface OwnerShopOrder {
    id: string;
    status?: string;
    isSeedData?: boolean;
    createdAt?: TimeValue;
    totalAmountCents?: number;
    /** Legacy: whole dollars */
    totalAmount?: number;
    items?: OwnerOrderItem[];
    clientName?: string;
    customerName?: string;
    clientEmail?: string;
    customerEmail?: string;
}

export interface OwnerBookingDraft {
    id: string;
    isSeedData?: boolean;
}

export interface OwnerCode {
    id: string;
    usageCount?: number;
    category?: string;
}
