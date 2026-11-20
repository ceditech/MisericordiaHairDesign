import { NextRequest, NextResponse } from "next/server";
import { paypalServer } from "@/src/lib/payments/paypalServer";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { addInventoryDecrements } from "@/src/lib/shop/finalizeShopOrder";
import type { ShopReceiptOrder } from "@/src/lib/email/templates/shopReceiptTemplate";
import { emailStatusFields, sendShopOrderEmails } from "@/src/lib/shop/shopOrderEmails";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";

export const runtime = "nodejs";

/** Fields of a shop order document that the capture step reads. */
interface ShopOrderDoc {
  status?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
  totals?: { totalCents?: number };
  payment?: { sessionId?: string };
}

/** The part of PayPal's capture response used to verify the captured amount. */
interface CaptureResult {
  purchase_units?: Array<{ payments?: { captures?: Array<{ amount?: { value?: string } }> } }>;
}

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

    // ── SHOP: verify the order BEFORE any money is captured ───────────────────
    let shopOrder: ShopOrderDoc | null = null;
    if (sessionType === "shop") {
      if (!orderId) {
        return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
      }
      const orderSnap = await adminDb.collection("shopOrders").doc(orderId).get();
      if (!orderSnap.exists) {
        return NextResponse.json({ error: "Shop order not found" }, { status: 404 });
      }
      shopOrder = orderSnap.data() as ShopOrderDoc;
      if (shopOrder.status && shopOrder.status !== "pending_payment") {
        return NextResponse.json({ error: "This order has already been processed" }, { status: 409 });
      }
      // The PayPal order must be the one created for this shop order
      if (shopOrder.payment?.sessionId !== paypalOrderId) {
        return NextResponse.json({ error: "PayPal order does not match this order" }, { status: 409 });
      }
    }

    // ── BOOKING: verify the draft BEFORE any money is captured ────────────────
    let bookingDraft: FirebaseFirestore.DocumentData | null = null;
    if (sessionType === "booking") {
      if (!draftId) {
        return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
      }
      const draftSnap = await adminDb.collection("bookingDrafts").doc(draftId).get();
      if (!draftSnap.exists) {
        return NextResponse.json({ error: "Booking draft not found" }, { status: 404 });
      }
      bookingDraft = draftSnap.data()!;
      if (bookingDraft.status === "confirmed" || bookingDraft.payment?.status === "paid") {
        return NextResponse.json({ status: "already_processed", message: "Booking already confirmed" });
      }
      // The PayPal order must be the one created for this draft
      if (bookingDraft.payment?.provider !== "paypal" || bookingDraft.payment?.sessionId !== paypalOrderId) {
        return NextResponse.json({ error: "PayPal order does not match this booking" }, { status: 409 });
      }
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

    const eventData = {
      provider: "paypal",
      paypalOrderId,
      sessionType,
      draftId: draftId ?? null,
      orderId: orderId ?? null,
      processedAt: FieldValue.serverTimestamp(),
    };

    // ── BOOKING FINALIZATION ──────────────────────────────────────────────────
    if (sessionType === "booking" && draftId && bookingDraft) {
      const draft = bookingDraft;
      const bookingId = `booking_${draftId}`;

      // The captured amount must equal the amount the server priced for this draft
      const capturedValue = (captureResult as CaptureResult).purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      const capturedCents = capturedValue !== undefined ? Math.round(parseFloat(capturedValue) * 100) : NaN;
      const expectedCents: number | undefined = draft.payment?.amountCents;
      if (!Number.isFinite(capturedCents) || capturedCents !== expectedCents) {
        console.error("[PayPal] Booking capture amount mismatch", { draftId, capturedCents, expectedCents });
        await eventRef.set(eventData);
        await adminDb.collection("bookingDrafts").doc(draftId).update({
          "payment.status": "amount_mismatch",
          "payment.capturedCents": Number.isFinite(capturedCents) ? capturedCents : null,
          status: "payment_review",
          updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ error: "Payment amount did not match the booking. We will review it." }, { status: 409 });
      }

      // Booking record, draft update and idempotency event are written together
      const batch = adminDb.batch();
      batch.set(eventRef, eventData);
      batch.set(adminDb.collection("bookings").doc(bookingId), {
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
      batch.update(adminDb.collection("bookingDrafts").doc(draftId), {
        "payment.status": "paid",
        "payment.capturedCents": capturedCents,
        status: "confirmed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();

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
            subject: `Booking Confirmed - Misericordia Hair Design #${bookingId}`,
            bodyHtml: clientHtml,
          } as any);
          
          // Notify the owner
          await EmailManager.sendEmail({
            to: "sales@edxstore.com", // Send to owner
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
    if (sessionType === "shop" && orderId && shopOrder) {
      await eventRef.set(eventData);
      const orderRef = adminDb.collection("shopOrders").doc(orderId);

      // The captured amount must equal the order total computed by the server
      const capturedValue = (captureResult as CaptureResult).purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      const capturedCents = capturedValue !== undefined ? Math.round(parseFloat(capturedValue) * 100) : NaN;
      if (!Number.isFinite(capturedCents) || capturedCents !== shopOrder.totals?.totalCents) {
        console.error("[PayPal] Shop capture amount mismatch", { orderId, capturedCents, expected: shopOrder.totals?.totalCents });
        await orderRef.update({
          status: "payment_review",
          "payment.status": "amount_mismatch",
          "payment.paypalOrderId": paypalOrderId,
          "payment.capturedCents": Number.isFinite(capturedCents) ? capturedCents : null,
          "payment.updatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ error: "Payment amount did not match the order. We will review it." }, { status: 409 });
      }

      const batch = adminDb.batch();
      batch.update(orderRef, {
        "payment.status": "paid",
        "payment.paypalOrderId": paypalOrderId,
        "payment.amountCents": capturedCents,
        "payment.updatedAt": FieldValue.serverTimestamp(),
        status: "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await addInventoryDecrements(adminDb, batch, shopOrder.items);
      await batch.commit();

      console.log("[PayPal] Shop order paid:", orderId);

      // Receipt + owner notification (best effort: never undoes or blocks the payment)
      const emailResult = await sendShopOrderEmails(shopOrder as unknown as ShopReceiptOrder, orderId);
      await orderRef
        .update(emailStatusFields(emailResult, FieldValue.serverTimestamp()))
        .catch((e) => console.error("[PayPal] Could not record email status:", orderId, e));
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
