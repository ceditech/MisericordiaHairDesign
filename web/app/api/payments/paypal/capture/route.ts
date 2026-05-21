import { NextRequest, NextResponse } from "next/server";
import { paypalServer } from "@/src/lib/payments/paypalServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateHtmlReceipt } from "@/lib/payments/receipt-generator";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";

export const runtime = "nodejs";

/**
 * POST /api/payments/paypal/capture
 *
 * Captures an approved PayPal order and finalizes the booking or shop order
 * in Firestore. Acts as the PayPal equivalent of the Stripe webhook.
 *
 * Request body:
 *   { sessionType, draftId?, orderId?, paypalOrderId }
 *
 * Response:
 *   { status, bookingId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionType, draftId, orderId, paypalOrderId } = body as {
      sessionType: "booking" | "shop";
      draftId?: string;
      orderId?: string;
      paypalOrderId: string;
    };

    if (!sessionType || !paypalOrderId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionType, paypalOrderId" },
        { status: 400 }
      );
    }

    // ── IDEMPOTENCY CHECK ─────────────────────────────────────────────────────
    const eventId = `paypal_${paypalOrderId}`;
    const eventRef = adminDb.collection("paymentEvents").doc(eventId);
    const existingEvent = await eventRef.get();

    if (existingEvent.exists) {
      console.log("[PayPal] Duplicate capture ignored (idempotency):", paypalOrderId);
      return NextResponse.json({
        status: "already_processed",
        message: "Payment already captured",
      });
    }

    // ── CAPTURE ───────────────────────────────────────────────────────────────
    const captureResult = await paypalServer.captureOrder(paypalOrderId);

    if (captureResult.status !== "COMPLETED") {
      console.error("[PayPal] Capture did not complete:", captureResult.status);
      return NextResponse.json(
        { error: `PayPal capture status: ${captureResult.status}` },
        { status: 400 }
      );
    }

    // ── RECORD EVENT (idempotency) ────────────────────────────────────────────
    await eventRef.set({
      provider: "paypal",
      paypalOrderId,
      sessionType,
      draftId: draftId ?? null,
      orderId: orderId ?? null,
      processedAt: FieldValue.serverTimestamp(),
    });

    // ── BOOKING FINALIZATION ──────────────────────────────────────────────────
    if (sessionType === "booking") {
      if (!draftId) {
        return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
      }

      const draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
      if (!draftSnap.exists) {
        return NextResponse.json({ error: "Booking draft not found" }, { status: 404 });
      }

      const draft = draftSnap.data()!;
      const bookingId = `booking_${draftId}`;

      // Create the canonical booking record (server-side only)
      await adminDb.collection("bookings").doc(bookingId).set({
        bookingId,
        draftId,
        userId: draft.userId ?? null,
        styleId: draft.styleId ?? null,
        styleName: draft.styleName ?? null,
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
        amountCents: draft.payment?.amountCents ?? 0,
        amountPaidCents: draft.payment?.amountCents ?? 0,
        paymentChoice: draft.payment?.choice ?? "deposit",
        provider: "paypal",
        paypalOrderId,
        status: "confirmed",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Mark draft as confirmed
      await adminDb.collection("bookingDrafts").doc(draftId).update({
        "payment.status": "paid",
        status: "confirmed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Release slot lock if one exists
      const lockId = draft.lockId;
      if (lockId) {
        await adminDb.collection("slotLocks").doc(lockId).delete().catch(() => {
          console.warn("[PayPal] Could not delete slotLock:", lockId);
        });
      }

      // Send Emails
      const customerEmail = draft.clientEmail;
      const amountCents = draft.payment?.amountCents ?? 0;
      if (customerEmail) {
        const formattedAmount = `$${(amountCents / 100).toFixed(2)} USD`;
        const clientHtml = generateElegantReceiptEmail(draft, bookingId, "client", formattedAmount);
        const ownerHtml = generateElegantReceiptEmail(draft, bookingId, "owner", formattedAmount);

        try {
          // Send Receipt
          await EmailManager.sendEmail({
            to: customerEmail,
            subject: `Booking Confirmed - Dede's Braids #${bookingId}`,
            bodyHtml: clientHtml,
          } as any);
          
          // Notify the owner
          await EmailManager.sendEmail({
            to: "info@dedesbraids.com", // Send to owner
            subject: `New Booking via PayPal! ${draft.clientName} - ${draft.styleName}`,
            bodyHtml: ownerHtml,
          });
          console.log("[PayPal] Emails sent successfully.");
        } catch (error) {
          console.error("[PayPal] Failed to send emails via EmailManager:", error);
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
          eventId: paypalOrderId, // Use PayPal Order ID for idempotency
        });
      }

      console.log("[PayPal] Booking confirmed:", bookingId);
      return NextResponse.json({ status: "confirmed", bookingId });
    }

    // ── SHOP FINALIZATION ─────────────────────────────────────────────────────
    if (sessionType === "shop") {
      if (!orderId) {
        return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
      }

      await adminDb.collection("shopOrders").doc(orderId).update({
        "payment.status": "paid",
        "payment.paypalOrderId": paypalOrderId,
        "payment.updatedAt": FieldValue.serverTimestamp(),
        status: "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("[PayPal] Shop order paid:", orderId);
      return NextResponse.json({ status: "paid", orderId });
    }

    return NextResponse.json({ error: "Invalid sessionType" }, { status: 400 });
  } catch (err: any) {
    console.error("[PayPal] capture error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
