import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/src/lib/firebase/admin";
import { requireUser } from "@/src/lib/auth/requireUser";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";
import {
    MAX_ORDER_LINES,
    ShopOrderError,
    priceShopOrder,
    type CatalogProduct,
    type FulfillmentType,
    type OrderItemInput,
    type PromoInput,
} from "@/src/lib/shop/orderPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_ID_PATTERN = /^shop_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Public endpoint (guests check out here): best-effort per-IP limit (see src/lib/http/rateLimit.ts).
const orderLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** The signed-in user's uid, or null for guests (an invalid token is treated as a guest). */
async function optionalUserId(req: NextRequest): Promise<string | null> {
    if (!req.headers.get("authorization")) return null;
    try {
        return (await requireUser(req)).uid;
    } catch {
        return null;
    }
}

async function loadCatalog(productIds: string[]): Promise<Record<string, CatalogProduct | undefined>> {
    const entries = await Promise.all(
        productIds.map(async (id) => {
            const snap = await adminDb.collection("products").doc(id).get();
            if (!snap.exists) return [id, undefined] as const;
            const d = snap.data() ?? {};
            const product: CatalogProduct = {
                id,
                name: typeof d.name === "string" ? d.name : "Product",
                priceCents: d.priceCents,
                stockStatus: typeof d.stockStatus === "string" ? d.stockStatus : undefined,
                inventory: typeof d.inventory === "number" ? d.inventory : undefined,
                variants: Array.isArray(d.variants) ? d.variants : undefined,
            };
            return [id, product] as const;
        }),
    );
    return Object.fromEntries(entries);
}

/** A promo must exist in the `codes` collection (affiliate codes are stored there) and be active. */
async function loadPromo(rawCode: unknown): Promise<PromoInput | null> {
    if (rawCode === undefined || rawCode === null || rawCode === "") return null;
    if (typeof rawCode !== "string" || rawCode.length > 40) throw new ShopOrderError("Invalid promotional code.");
    const code = rawCode.trim().toUpperCase();
    const snap = await adminDb.collection("codes").doc(code).get();
    const data = snap.exists ? snap.data() : null;
    if (!data || data.active !== true) throw new ShopOrderError("Invalid promotional code.");
    return { code, discountPercent: typeof data.discountPercent === "number" ? data.discountPercent : 10 };
}

/**
 * POST /api/shop/orders
 * Creates (or re-prices, while unpaid) a shop order. Public so guests can check out.
 * The browser sends product ids and quantities only; every price, the discount, tax
 * and shipping are computed here, and the order is written with the Admin SDK.
 * The browser-generated order id (shop_<uuid>) is the unguessable handle for the
 * payment and confirmation steps.
 */
export async function POST(req: NextRequest) {
    try {
        const limit = orderLimiter.check(clientIp(req));
        if (!limit.ok) {
            return NextResponse.json(
                { success: false, error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
            );
        }

        let body: Record<string, unknown>;
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            return bad("Invalid request body");
        }
        if (!body || typeof body !== "object") return bad("Invalid request body");

        const { orderId, items, fulfillmentType, customer, shipping, promoCode } = body as {
            orderId?: unknown; items?: unknown; fulfillmentType?: unknown; customer?: unknown; shipping?: unknown; promoCode?: unknown;
        };

        if (typeof orderId !== "string" || !ORDER_ID_PATTERN.test(orderId)) return bad("Invalid order id");
        if (fulfillmentType !== "pickup" && fulfillmentType !== "shipping") return bad("Invalid fulfillment type");
        if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ORDER_LINES) return bad("Invalid items");

        const orderItems: OrderItemInput[] = [];
        for (const raw of items) {
            const it = raw as { productId?: unknown; quantity?: unknown; selectedOptions?: unknown };
            if (!isText(it?.productId, 100) || typeof it.quantity !== "number") return bad("Invalid items");
            let selectedOptions: Record<string, string> | null = null;
            if (it.selectedOptions !== undefined && it.selectedOptions !== null) {
                if (typeof it.selectedOptions !== "object" || Array.isArray(it.selectedOptions)) return bad("Invalid items");
                const entries = Object.entries(it.selectedOptions as Record<string, unknown>);
                if (entries.length > 10 || entries.some(([k, v]) => k.length > 60 || typeof v !== "string" || v.length > 100)) {
                    return bad("Invalid items");
                }
                selectedOptions = Object.fromEntries(entries) as Record<string, string>;
            }
            orderItems.push({ productId: it.productId, quantity: it.quantity, selectedOptions });
        }

        const c = (customer ?? {}) as { name?: unknown; email?: unknown; phone?: unknown };
        if (!isText(c.name, 100) || !isText(c.email, 254) || !EMAIL_PATTERN.test(c.email)) return bad("Invalid customer details");
        const phoneDigits = typeof c.phone === "string" ? c.phone.replace(/\D/g, "") : "";
        if (phoneDigits.length < 10 || phoneDigits.length > 11) return bad("Invalid customer details");

        let shippingAddress: { address: string; city: string; state: string; zipCode: string } | null = null;
        if (fulfillmentType === "shipping") {
            const s = (shipping ?? {}) as { address?: unknown; city?: unknown; state?: unknown; zip?: unknown };
            if (!isText(s.address, 200) || !isText(s.city, 100) || !isText(s.state, 100) || !isText(s.zip, 20)) {
                return bad("A complete shipping address is required");
            }
            shippingAddress = { address: s.address.trim(), city: s.city.trim(), state: s.state.trim(), zipCode: s.zip.trim() };
        }

        const orderRef = adminDb.collection("shopOrders").doc(orderId);
        const existing = await orderRef.get();
        const existingStatus = existing.exists ? existing.data()?.status : null;
        if (existingStatus && existingStatus !== "pending_payment") {
            return bad("This order has already been processed.", 409);
        }

        const promo = await loadPromo(promoCode);
        const catalog = await loadCatalog([...new Set(orderItems.map((i) => i.productId))]);
        const { lines, totals } = priceShopOrder({
            items: orderItems,
            catalog,
            fulfillmentType: fulfillmentType as FulfillmentType,
            promo,
        });

        const userId = await optionalUserId(req);

        await orderRef.set(
            {
                shopOrderId: orderId,
                userId,
                items: lines,
                customerName: c.name.trim(),
                customerEmail: c.email.trim(),
                customerPhone: (c.phone as string).trim(),
                fulfillmentType,
                shipping: shippingAddress ? { ...shippingAddress, shippingCostCents: totals.shippingCents } : null,
                promoCode: promo?.code ?? null,
                discountPercent: promo?.discountPercent ?? 0,
                totals,
                // Top-level copies are read by the owner dashboard
                taxCents: totals.taxCents,
                totalCents: totals.totalCents,
                status: "pending_payment",
                ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        return NextResponse.json({ success: true, orderId, totals });
    } catch (error) {
        if (error instanceof ShopOrderError) return bad(error.message);
        console.error("[Shop Orders API] Failed to create order:", error);
        return bad("Failed to create the order", 500);
    }
}
