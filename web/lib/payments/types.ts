/** Payment provider selected by the user */
export type PaymentProvider = "stripe" | "paypal";

/** Whether the user pays the deposit now or the full amount */
export type PaymentChoice = "deposit" | "full";

/** Lifecycle of a payment session */
export type PaymentStatus =
    | "idle"
    | "creating"
    | "redirecting"
    | "success"
    | "cancelled"
    | "failed";

/** Snapshot of a payment session returned by the service */
export interface PaymentSession {
    id: string;
    provider: PaymentProvider;
    choice: PaymentChoice;
    /** Amount in cents (e.g. 5000 = $50.00) */
    amountCents: number;
    currency: string;
    status: PaymentStatus;
    sessionType: 'booking' | 'shop';
    booking?: PaymentBookingContext;
    shop?: PaymentShopContext;
}

/** Minimal booking context needed by the payment service */
export interface PaymentBookingContext {
    styleId: string;
    styleName: string;
    date: string;
    time: string;
    clientName: string;
    clientEmail: string;
    userId?: string;
}

export interface PaymentShopContext {
    items: {
        productId: string;
        name: string;
        quantity: number;
        priceCents: number;
    }[];
    customerEmail: string;
    customerName?: string;
    fulfillmentType: 'pickup' | 'shipping';
    shipping?: {
        address: string;
        city: string;
        state: string;
        zipCode: string;
        shippingCostCents: number;
    };
}
