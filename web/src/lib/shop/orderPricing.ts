/**
 * Shop order pricing (pure, no server or browser dependencies).
 *
 * The SERVER prices every shop order from the product catalog; the browser only
 * says which products and how many. The checkout page imports computeShopTotals
 * so the total it displays is calculated with exactly the same rules.
 *
 * Shop products are taxable. Services (bookings) are priced separately in
 * lib/pricing.ts, so this rate is intentionally its own constant.
 */
export const SHOP_TAX_RATE_BPS = 825; // 8.25% in basis points (integer math avoids float rounding)
export const SHOP_SHIPPING_FLAT_CENTS = 1500;
/** Anti-abuse cap: most one order line may ask for (also stops absurd or negative quantities). */
export const MAX_QUANTITY_PER_ITEM = 20;
export const MAX_ORDER_LINES = 50;

export type FulfillmentType = "pickup" | "shipping";

export interface CatalogProduct {
    id: string;
    name: string;
    priceCents: number;
    stockStatus?: string;
    /** Tracked stock; when present it is enforced. */
    inventory?: number;
    variants?: Array<{ name: string; options: string[] }>;
}

export interface OrderItemInput {
    productId: string;
    quantity: number;
    selectedOptions?: Record<string, string> | null;
}

export interface PromoInput {
    code: string;
    discountPercent: number;
}

export interface PricedLine {
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
    selectedOptions: Record<string, string> | null;
}

export interface ShopTotals {
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    shippingCents: number;
    totalCents: number;
}

/** A problem with the order that is safe to show to the customer. */
export class ShopOrderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ShopOrderError";
    }
}

/** Discount is taken off the subtotal, tax applies to the discounted amount, shipping is not taxed. */
export function computeShopTotals(
    subtotalCents: number,
    discountPercent: number,
    fulfillmentType: FulfillmentType,
): ShopTotals {
    const discountCents = discountPercent > 0 ? Math.round((subtotalCents * discountPercent) / 100) : 0;
    const taxableCents = subtotalCents - discountCents;
    const taxCents = Math.round((taxableCents * SHOP_TAX_RATE_BPS) / 10000);
    const shippingCents = fulfillmentType === "shipping" ? SHOP_SHIPPING_FLAT_CENTS : 0;
    return {
        subtotalCents,
        discountCents,
        taxCents,
        shippingCents,
        totalCents: taxableCents + taxCents + shippingCents,
    };
}

function validateOptions(product: CatalogProduct, selected: Record<string, string> | null | undefined) {
    const entries = Object.entries(selected ?? {});
    for (const [name, value] of entries) {
        const variant = product.variants?.find((v) => v.name === name);
        if (!variant || !variant.options.includes(value)) {
            throw new ShopOrderError(`Invalid option selected for ${product.name}.`);
        }
    }
}

export function priceShopOrder(input: {
    items: OrderItemInput[];
    catalog: Record<string, CatalogProduct | undefined>;
    fulfillmentType: FulfillmentType;
    promo?: PromoInput | null;
}): { lines: PricedLine[]; totals: ShopTotals } {
    const { items, catalog, fulfillmentType, promo } = input;

    if (!items.length) throw new ShopOrderError("Your order must contain at least one item.");
    if (items.length > MAX_ORDER_LINES) throw new ShopOrderError("Your order has too many items.");
    if (promo && !(Number.isFinite(promo.discountPercent) && promo.discountPercent > 0 && promo.discountPercent <= 100)) {
        throw new ShopOrderError("This promo code is not valid.");
    }

    const lines: PricedLine[] = [];
    const quantityByProduct = new Map<string, number>();

    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY_PER_ITEM) {
            throw new ShopOrderError(`Invalid quantity: choose between 1 and ${MAX_QUANTITY_PER_ITEM} per item.`);
        }

        const product = catalog[item.productId];
        if (!product || !Number.isInteger(product.priceCents) || product.priceCents <= 0) {
            throw new ShopOrderError("A product in your cart is no longer available.");
        }
        if (product.stockStatus === "out_of_stock" || (typeof product.inventory === "number" && product.inventory <= 0)) {
            throw new ShopOrderError(`${product.name} is out of stock.`);
        }
        validateOptions(product, item.selectedOptions);

        quantityByProduct.set(product.id, (quantityByProduct.get(product.id) ?? 0) + item.quantity);
        const options = item.selectedOptions && Object.keys(item.selectedOptions).length ? { ...item.selectedOptions } : null;
        lines.push({
            productId: product.id,
            name: product.name,
            quantity: item.quantity,
            priceCents: product.priceCents,
            selectedOptions: options,
        });
    }

    for (const [productId, quantity] of quantityByProduct) {
        const product = catalog[productId]!;
        if (typeof product.inventory === "number" && quantity > product.inventory) {
            throw new ShopOrderError(`Only ${product.inventory} of ${product.name} available.`);
        }
    }

    const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
    return { lines, totals: computeShopTotals(subtotalCents, promo?.discountPercent ?? 0, fulfillmentType) };
}
