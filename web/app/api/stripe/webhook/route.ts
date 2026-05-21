import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeServer } from "@/src/lib/payments/stripeServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateHtmlReceipt } from "@/lib/payments/receipt-generator";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";
import Stripe from "stripe";

export const runtime = "nodejs";

// Required: tell Next.js not to parse the raw body (Stripe needs the raw bytes to verify)
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[Stripe Webhook] Missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const stripe = getStripeServer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook signature error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log("🔔 Stripe Webhook received:", event.type, event.id);

  // ── IDEMPOTENCY CHECK ───────────────────────────────────────────────────────
  const eventRef = adminDb.collection("paymentEvents").doc(event.id);
  const existingEvent = await eventRef.get();

  if (existingEvent.exists) {
    console.log("[Stripe Webhook] Duplicate event ignored (idempotency):", event.id);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      // ── PRIMARY: Checkout Session completed ──────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionType = session.metadata?.sessionType as "booking" | "shop" | undefined;

        console.log("[Stripe Webhook] checkout.session.completed — sessionType:", sessionType, "session:", session.id);

        if (sessionType === "booking") {
          await handleBookingPayment(session, event.id);
        } else if (sessionType === "shop") {
          await handleShopPayment(session);
        } else {
          console.warn("[Stripe Webhook] Unknown sessionType in metadata:", sessionType);
        }
        break;
      }

      // ── SECONDARY: payment_intent.succeeded (belt + suspenders) ─────────────
      case "payment_intent.succeeded": {
        // Only log — finalization is handled by checkout.session.completed.
        // This event fires after session completion and would double-process.
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("[Stripe Webhook] payment_intent.succeeded (informational):", pi.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("[Stripe Webhook] payment_intent.payment_failed:", pi.id, pi.last_payment_error?.message);
        break;
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type);
    }

    // ── record event after successful processing ──────────────────────────────
    await eventRef.set({
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      processedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Processing error:", err);
    // Return 200 to prevent Stripe from retrying for application errors.
    // If this is a transient infrastructure error, return 500 so Stripe retries.
    return NextResponse.json(
      { received: true, warning: "Processing error — see server logs" },
      { status: 200 }
    );
  }
}

// ─── Booking Finalization ─────────────────────────────────────────────────────

async function handleBookingPayment(session: Stripe.Checkout.Session, eventId: string) {
  const draftId = session.metadata?.draftId;
  if (!draftId) {
    console.warn("[Stripe Webhook] No draftId in session metadata — skipping booking finalization");
    return;
  }

  const draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
  if (!draftSnap.exists) {
    console.warn("[Stripe Webhook] bookingDraft not found:", draftId);
    return;
  }

  const draft = draftSnap.data()!;
  const bookingId = `booking_${draftId}`;
  const amountCents = session.amount_total ?? draft.payment?.amountCents ?? 0;
  const customerEmail = session.customer_email ?? draft.clientEmail;

  // Create canonical booking (server only — client rule will deny writes)
  await adminDb.collection("bookings").doc(bookingId).set({
    bookingId,
    draftId,
    userId: draft.userId ?? null,
    styleId: draft.styleId ?? null,
    styleName: draft.styleName ?? null,
    styleImage: draft.styleImage || draft.imageUrl || null,
    sizeName: draft.sizeName ?? null,
    lengthName: draft.lengthName ?? null,
    duration: draft.duration ?? null,
    price: draft.price ?? null,
    washingAddon: draft.washingAddon ?? false,
    takeDownAddon: draft.takeDownAddon ?? false,
    date: draft.date,
    time: draft.time,
    clientName: draft.clientName,
    clientEmail: draft.clientEmail,
    clientPhone: draft.clientPhone,
    notes: draft.notes ?? "",
    amountCents,
    amountPaidCents: amountCents,
    paymentChoice: draft.payment?.choice ?? "deposit",
    provider: "stripe",
    stripeSessionId: session.id,
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Mark draft confirmed
  await adminDb.collection("bookingDrafts").doc(draftId).update({
    "payment.status": "paid",
    status: "confirmed",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Release slot lock
  const lockId = draft.lockId;
  if (lockId) {
    await adminDb.collection("slotLocks").doc(lockId).delete().catch(() => {
      console.warn("[Stripe Webhook] Could not delete slotLock:", lockId);
    });
  }

  // Queue receipt email
  if (customerEmail) {
    const receiptHtml = generateHtmlReceipt({
      bookingId,
      customerEmail,
      amountUSD: (amountCents / 100).toFixed(2),
      currency: session.currency ?? "usd",
      date: new Date().toISOString(),
      provider: "stripe",
      paymentIntentId: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.id,
    });

    try {
      const formattedAmount = `$${(amountCents / 100).toFixed(2)} USD`;
      const clientHtml = generateElegantReceiptEmail(draft, bookingId, "client", formattedAmount);
      await EmailManager.sendEmail({
        to: customerEmail,
        subject: `Booking Confirmed - Dede's Braids #${bookingId}`,
        bodyHtml: clientHtml,
      } as any);
      console.log("[Stripe Webhook] Receipt sent to:", customerEmail);

      // Notify the owner of the new booking
      const ownerHtml = generateElegantReceiptEmail(draft, bookingId, "owner", formattedAmount);
      await EmailManager.sendEmail({
        to: "info@dedesbraids.com", // Send to owner
        subject: `New Booking! ${draft.clientName} - ${draft.styleName}`,
        bodyHtml: ownerHtml,
      });
      console.log("[Stripe Webhook] Owner notification sent.");
    } catch (error) {
      console.error("[Stripe Webhook] Failed to send email via EmailManager:", error);
    }
  }

  // ── Affiliate Conversion Logic ─────────────────────────────────────────────
  if (draft.promoCode) {
    const { processAffiliateConversion } = await import("@/src/lib/affiliate/affiliateTracker");
    await processAffiliateConversion({
      promoCode: draft.promoCode,
      bookingId,
      amountCents,
      clientId: draft.userId,
      clientEmail: draft.clientEmail,
      clientName: draft.clientName,
      eventId: eventId, // Stripe event ID
    });
  }

  console.log("[Stripe Webhook] ✅ Booking confirmed:", bookingId);
}

// ─── Shop Order Finalization ──────────────────────────────────────────────────

async function handleShopPayment(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn("[Stripe Webhook] No orderId in session metadata — skipping shop finalization");
    return;
  }

  const orderRef = adminDb.collection("shopOrders").doc(orderId);
  const orderSnap = await orderRef.get();
  
  if (!orderSnap.exists) {
    console.warn("[Stripe Webhook] Shop order not found:", orderId);
    return;
  }

  const orderData = orderSnap.data()!;
  const batch = adminDb.batch();

  // Decrement inventory for each item in the order
  if (orderData.items && Array.isArray(orderData.items)) {
    for (const item of orderData.items) {
      if (item.productId) {
        const productRef = adminDb.collection("products").doc(item.productId);
        batch.update(productRef, {
          inventory: FieldValue.increment(-item.quantity)
        });
      }
    }
  }

  batch.update(orderRef, {
    "payment.status": "paid",
    "payment.stripeSessionId": session.id,
    "payment.updatedAt": FieldValue.serverTimestamp(),
    status: "paid",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log("[Stripe Webhook] ✅ Shop order paid and inventory updated:", orderId);
}
