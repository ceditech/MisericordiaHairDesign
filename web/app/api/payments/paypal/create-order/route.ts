import { NextRequest, NextResponse } from "next/server";
import { paypalServer } from "@/src/lib/payments/paypalServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateBookingPrice } from "@/lib/pricing";
import { BRAID_STYLES } from "@/lib/styles";

export const runtime = "nodejs";

/**
 * POST /api/payments/paypal/create-order
 *
 * Creates a PayPal order server-side, persists it to Firestore, and returns
 * the buyer-approval URL for redirect.
 *
 * Request body:
 *   { sessionType, draftId?, orderId?, choice?, returnUrl, cancelUrl }
 *
 * Response:
 *   { approvalLink, paypalOrderId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionType,
      draftId,
      orderId,
      choice = "deposit",
      returnUrl,
      cancelUrl,
    } = body as {
      sessionType: "booking" | "shop";
      draftId?: string;
      orderId?: string;
      choice?: "deposit" | "full";
      returnUrl: string;
      cancelUrl: string;
    };

    if (!sessionType || !returnUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields: sessionType, returnUrl, cancelUrl" },
        { status: 400 }
      );
    }

    // ── BOOKING FLOW ──────────────────────────────────────────────────────────
    if (sessionType === "booking") {
      if (!draftId) {
        return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
      }

      let draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
      let retries = 4;
      while (!draftSnap.exists && retries > 0) {
        console.log(`[PayPal] Draft not found, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 500));
        draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
        retries--;
      }

      if (!draftSnap.exists) {
        return NextResponse.json({ error: "Booking draft not found." }, { status: 404 });
      }

      const draft = draftSnap.data()!;

      // Fetch styles, presets and addons for accurate server-side pricing
      const [presetsSnap, addonsSnap, stylesSnap] = await Promise.all([
        adminDb.collection("presets").get(),
        adminDb.collection("braidAddons").get(),
        adminDb.collection("styles").get()
      ]);
      
      const styles = stylesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const presets = presetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const sizePresets = presets.filter((p: any) => p.type === "size");
      const lengthPresets = presets.filter((p: any) => p.type === "length");
      const addons = addonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // RE-CALCULATE PRICING ON SERVER (Security: Do not trust draft values)
      // Try to find in live styles first, fallback to static config
      const liveStyle = styles.find((s: any) => s.id === draft.styleId);
      const staticStyle = BRAID_STYLES.find((s) => s.id === draft.styleId) || BRAID_STYLES[0];
      const style = (liveStyle || staticStyle) as any;

      console.log(`[PayPal] Using style: ${style.name} (${style.id}), Price: ${style.price} (From ${liveStyle ? 'Firestore' : 'Static Config'})`);

      const recalculated = calculateBookingPrice({
        stylePrice: style.price,
        sizeId: draft.sizeId || "",
        lengthId: draft.lengthId || "",
        washingAddon: !!draft.washingAddon,
        takeDownAddon: !!draft.takeDownAddon,
        sizePresets,
        lengthPresets,
        addons,
        promoCode: draft.promoCode || draft.appliedCode || null
      });

      let amountCents: number;
      if (choice === "deposit") {
        amountCents = recalculated.depositCents;
      } else {
        amountCents = recalculated.totalCents;
      }

      console.log(`[PayPal] Server-calculated price: ${amountCents}c (Choice: ${choice})`);

      const amountUSD = (amountCents / 100).toFixed(2);
      const description = `Dede's Braids — ${draft.styleName ?? "Braiding Service"} (${choice === "deposit" ? "Deposit" : "Full Payment"})`;

      const order = await paypalServer.createOrder(amountCents, "USD", description);

      const approvalLink = (order.links as Array<{ rel: string; href: string }>)
        ?.find((l) => l.rel === "approve")?.href;

      if (!approvalLink) {
        throw new Error("PayPal did not return an approval link");
      }

      // Persist PayPal order ref to draft
      await adminDb.collection("bookingDrafts").doc(draftId).update({
        "payment.provider": "paypal",
        "payment.choice": choice,
        "payment.sessionType": "booking",
        "payment.sessionId": order.id,
        "payment.amountCents": amountCents,
        "payment.currency": "USD",
        "payment.status": "pending_payment",
        "payment.updatedAt": FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ approvalLink, paypalOrderId: order.id });
    }

    // ── SHOP FLOW ─────────────────────────────────────────────────────────────
    if (sessionType === "shop") {
      if (!orderId) {
        return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
      }

      const orderSnap = await adminDb.collection("shopOrders").doc(orderId).get();
      if (!orderSnap.exists) {
        return NextResponse.json({ error: "Shop order not found" }, { status: 404 });
      }

      const shopOrder = orderSnap.data()!;
      const totalCents: number = shopOrder.totals?.totalCents ?? 0;

      if (!totalCents || totalCents <= 0) {
        return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
      }

      const amountUSD = (totalCents / 100).toFixed(2);
      const order = await paypalServer.createOrder(totalCents, "USD", "Dede's Braids Shop Order");

      const approvalLink = (order.links as Array<{ rel: string; href: string }>)
        ?.find((l) => l.rel === "approve")?.href;

      if (!approvalLink) {
        throw new Error("PayPal did not return an approval link");
      }

      await adminDb.collection("shopOrders").doc(orderId).update({
        "payment.provider": "paypal",
        "payment.sessionType": "shop",
        "payment.sessionId": order.id,
        "payment.status": "pending_payment",
        "payment.updatedAt": FieldValue.serverTimestamp(),
        status: "pending_payment",
      });

      return NextResponse.json({ approvalLink, paypalOrderId: order.id });
    }

    return NextResponse.json({ error: "Invalid sessionType" }, { status: 400 });
  } catch (err: any) {
    console.error("[PayPal] create-order error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
