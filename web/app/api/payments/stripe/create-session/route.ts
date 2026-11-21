import type { BraidStyle } from "@/src/lib/styles";
import type { LengthPreset, SizePreset } from "@/src/constants/braidPresets";
import type { AddonPricing } from "@/src/lib/pricing";

import { errorMessage } from "@/src/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/src/lib/payments/stripeServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateBookingPrice } from "@/src/lib/pricing";
import { resolveBookingStyle } from "@/src/lib/styles";
import { loadActivePromo, PromoError } from "@/src/lib/promo/loadActivePromo";

/** A `presets` document: a size or length preset tagged with its `type`. */
type PresetDoc = (SizePreset | LengthPreset) & { type?: string };

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeServer();

    const body = await req.json();
    const {
      sessionType,
      draftId,
      orderId: legacyOrderId,
      shopOrderId,
      choice = "deposit",
      successUrl,
      cancelUrl,
    } = body as {
      sessionType: "booking" | "shop";
      draftId?: string;
      orderId?: string;
      shopOrderId?: string;
      choice?: "deposit" | "full";
      successUrl: string;
      cancelUrl: string;
    };
    // The shop checkout sends `shopOrderId`; `orderId` is accepted for older callers.
    const orderId = shopOrderId ?? legacyOrderId;

    if (!sessionType || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields: sessionType, successUrl, cancelUrl" },
        { status: 400 }
      );
    }

    // ── BOOKING FLOW ──────────────────────────────────────────────────────────
    if (sessionType === "booking") {
      if (!draftId) {
        return NextResponse.json(
          { error: "Missing draftId for booking session" },
          { status: 400 }
        );
      }

      let draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
      let retries = 4;
      while (!draftSnap.exists && retries > 0) {
        console.log(`[Stripe] Draft not found, retrying... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
        retries--;
      }

      if (!draftSnap.exists) {
        return NextResponse.json(
          { error: "Booking draft not found. Sync delayed." },
          { status: 404 }
        );
      }

      const draft = draftSnap.data()!;

      // Fetch styles, presets and addons for accurate server-side pricing
      const [presetsSnap, addonsSnap, stylesSnap] = await Promise.all([
        adminDb.collection("presets").get(),
        adminDb.collection("braidAddons").get(),
        adminDb.collection("styles").get()
      ]);
      
      const styles = stylesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BraidStyle);
      const presets = presetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PresetDoc);
      const sizePresets = presets.filter((p) => p.type === "size") as SizePreset[];
      const lengthPresets = presets.filter((p) => p.type === "length") as LengthPreset[];
      const addons = addonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AddonPricing);

      // The discount comes only from an active code in the `codes` collection

      let promo: Awaited<ReturnType<typeof loadActivePromo>> = null;

      try {

        promo = await loadActivePromo(draft.promoCode || draft.appliedCode || null);

      } catch (e) {

        if (e instanceof PromoError) {

          return NextResponse.json({ error: "The promotional code on this booking is no longer valid. Please remove it and try again." }, { status: 400 });

        }

        throw e;

      }


      // RE-CALCULATE PRICING ON SERVER (Security: Do not trust draft values)
      // Try to find in live styles first, fallback to static config
      const style = resolveBookingStyle(draft.styleId, styles);
      if (!style) {
        return NextResponse.json({ error: "The style on this booking is no longer available. Please choose a style again." }, { status: 400 });
      }
      console.log(`[Stripe] Using style: ${style.name} (${style.id}), Price: ${style.price}`);

      const recalculated = calculateBookingPrice({
        stylePrice: style.price,
        sizeId: draft.sizeId || "",
        lengthId: draft.lengthId || "",
        washingAddon: !!draft.washingAddon,
        takeDownAddon: !!draft.takeDownAddon,
        sizePresets,
        lengthPresets,
        addons,
        promo
      });

      let amountCents: number;
      if (choice === "deposit") {
        amountCents = recalculated.depositCents;
      } else {
        amountCents = recalculated.totalCents;
      }

      console.log(`[Stripe] Server-calculated price: ${amountCents}c (Choice: ${choice})`);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Misericordia Hair Designs — ${draft.styleName ?? "Braiding Service"}`,
                description: choice === "deposit"
                  ? "Appointment deposit (applied to total at appointment)"
                  : "Full service payment",
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        customer_email: draft.clientEmail,
        metadata: {
          sessionType: "booking",
          draftId,
          choice,
          styleName: draft.styleName ?? "",
          date: draft.date ?? "",
          time: draft.time ?? "",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Persist payment intent back to draft (server owns this)
      await adminDb.collection("bookingDrafts").doc(draftId).update({
        "payment.provider": "stripe",
        "payment.choice": choice,
        "payment.sessionType": "booking",
        "payment.sessionId": session.id,
        "payment.amountCents": amountCents,
        "payment.currency": "usd",
        "payment.status": "pending_payment",
        "payment.updatedAt": FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    // ── SHOP FLOW ─────────────────────────────────────────────────────────────
    if (sessionType === "shop") {
      if (!orderId) {
        return NextResponse.json(
          { error: "Missing orderId for shop session" },
          { status: 400 }
        );
      }

      const orderSnap = await adminDb.collection("shopOrders").doc(orderId).get();
      if (!orderSnap.exists) {
        return NextResponse.json(
          { error: "Shop order not found" },
          { status: 404 }
        );
      }

      const order = orderSnap.data()!;
      const items: Array<{ name: string; priceCents: number; quantity: number }> = order.items ?? [];
      // Order created by POST /api/shop/orders (server-priced).
      const totals = order.totals as
        | { subtotalCents: number; discountCents: number; taxCents: number; shippingCents: number; totalCents: number }
        | undefined;

      if (order.status && order.status !== "pending_payment") {
        return NextResponse.json({ error: "This order has already been processed" }, { status: 409 });
      }
      if (!items.length) {
        return NextResponse.json({ error: "Order has no items" }, { status: 400 });
      }
      if (!totals || !Number.isInteger(totals.totalCents) || totals.totalCents <= 0) {
        return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
      }

      const lineItems = items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.priceCents,
        },
        quantity: item.quantity,
      }));
      if (totals.taxCents > 0) {
        lineItems.push({
          price_data: { currency: "usd", product_data: { name: "Sales tax" }, unit_amount: totals.taxCents },
          quantity: 1,
        });
      }
      if (totals.shippingCents > 0) {
        lineItems.push({
          price_data: { currency: "usd", product_data: { name: "Shipping" }, unit_amount: totals.shippingCents },
          quantity: 1,
        });
      }

      // Safety net: what Stripe will charge must equal the order total.
      const chargedCents =
        lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0) - (totals.discountCents || 0);
      if (chargedCents !== totals.totalCents) {
        console.error("[Stripe] Shop order totals are inconsistent", { orderId, chargedCents, totalCents: totals.totalCents });
        return NextResponse.json({ error: "Order totals are inconsistent" }, { status: 400 });
      }

      let discounts: Array<{ coupon: string }> | undefined;
      if (totals.discountCents > 0) {
        const coupon = await stripe.coupons.create({
          amount_off: totals.discountCents,
          currency: "usd",
          duration: "once",
          name: order.promoCode ? `Promo ${order.promoCode}` : "Discount",
        });
        discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        ...(discounts ? { discounts } : {}),
        customer_email: order.customerEmail,
        metadata: {
          sessionType: "shop",
          orderId,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Persist session back to order
      await adminDb.collection("shopOrders").doc(orderId).update({
        "payment.provider": "stripe",
        "payment.sessionType": "shop",
        "payment.sessionId": session.id,
        "payment.status": "pending_payment",
        "payment.updatedAt": FieldValue.serverTimestamp(),
        status: "pending_payment",
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    return NextResponse.json({ error: "Invalid sessionType" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Stripe] create-session error:", err);
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: 500 }
    );
  }
}
