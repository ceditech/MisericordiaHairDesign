import { NextRequest, NextResponse } from "next/server";
import { getStripeServer } from "@/src/lib/payments/stripeServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateBookingPrice } from "@/lib/pricing";
import { BRAID_STYLES } from "@/lib/styles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripeServer();

    const body = await req.json();
    const {
      sessionType,
      draftId,
      orderId,
      choice = "deposit",
      successUrl,
      cancelUrl,
    } = body as {
      sessionType: "booking" | "shop";
      draftId?: string;
      orderId?: string;
      choice?: "deposit" | "full";
      successUrl: string;
      cancelUrl: string;
    };

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
      
      const styles = stylesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const presets = presetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const sizePresets = presets.filter((p: any) => p.type === "size");
      const lengthPresets = presets.filter((p: any) => p.type === "length");
      const addons = addonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // RE-CALCULATE PRICING ON SERVER (Security: Do not trust draft values)
      // Try to find in live styles first, fallback to static config
      const liveStyle = styles.find((s: any) => s.id === draft.styleId);
      const staticStyle = BRAID_STYLES.find((s) => s.id === draft.styleId) || BRAID_STYLES[0];
      const style = liveStyle || staticStyle;

      console.log(`[Stripe] Using style: ${style.name} (${style.id}), Price: ${style.price} (From ${liveStyle ? 'Firestore' : 'Static Config'})`);

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

      if (!items.length) {
        return NextResponse.json({ error: "Order has no items" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: items.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: { name: item.name },
            unit_amount: item.priceCents,
          },
          quantity: item.quantity,
        })),
        customer_email: order.clientEmail,
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
  } catch (err: any) {
    console.error("[Stripe] create-session error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
