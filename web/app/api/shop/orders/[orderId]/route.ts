import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_ID_PATTERN = /^shop_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// The success page polls while a payment settles; allow that but not scraping.
const lookupLimiter = createRateLimiter({ limit: 200, windowMs: 60 * 60 * 1000 });

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

/**
 * GET /api/shop/orders/[orderId]
 * Customer-safe summary for the order confirmation page. The unguessable order id
 * (shop_<uuid>, created by the checkout) is the capability to read it. The response
 * never includes the user id, email, phone or payment identifiers.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
    try {
        const limit = lookupLimiter.check(clientIp(req));
        if (!limit.ok) {
            return NextResponse.json(
                { success: false, error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
            );
        }

        const { orderId } = await ctx.params;
        if (!ORDER_ID_PATTERN.test(orderId)) return fail("Invalid order id", 400);

        const snap = await adminDb.collection("shopOrders").doc(orderId).get();
        if (!snap.exists) return fail("Order not found", 404);
        const d = snap.data() ?? {};

        const s = d.shipping as { address?: string; city?: string; state?: string; zipCode?: string } | null | undefined;
        return NextResponse.json({
            success: true,
            order: {
                id: orderId,
                status: typeof d.status === "string" ? d.status : "pending_payment",
                provider: typeof d.payment?.provider === "string" ? d.payment.provider : null,
                amountCents: d.totals?.totalCents ?? d.totalCents ?? 0,
                customerName: typeof d.customerName === "string" ? d.customerName : null,
                fulfillmentType: d.fulfillmentType === "shipping" ? "shipping" : "pickup",
                shipping: s ? { address: s.address ?? "", city: s.city ?? "", state: s.state ?? "", zipCode: s.zipCode ?? "" } : null,
                items: Array.isArray(d.items)
                    ? d.items.map((i: { productId?: string; name?: string; quantity?: number; priceCents?: number; selectedOptions?: Record<string, string> | null }) => ({
                          productId: i.productId ?? "",
                          name: i.name ?? "",
                          quantity: i.quantity ?? 0,
                          priceCents: i.priceCents ?? 0,
                          selectedOptions: i.selectedOptions ?? null,
                      }))
                    : [],
                totals: d.totals ?? null,
            },
        });
    } catch (error) {
        console.error("[Shop Order Summary API] Failed:", error);
        return fail("Failed to load the order", 500);
    }
}
