import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/confirmation?draftId=...
 * 
 * Securely retrieves booking details for the success page.
 * Uses Admin SDK to bypass client-side rules, then sanitizes the response.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const draftId = searchParams.get("draftId");

  if (!draftId) {
    return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
  }

  try {
    const bookingId = `booking_${draftId}`;
    const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const data = bookingSnap.data()!;

    // Sanitize: Only return what's needed for the success page
    // (Avoid returning internal IDs, provider secrets, etc.)
    const sanitized = {
      bookingId: data.bookingId,
      styleName: data.styleName,
      sizeName: data.sizeName,
      lengthName: data.lengthName,
      date: data.date,
      time: data.time,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      amountPaidLabel: `$${(data.amountPaidCents / 100).toFixed(2)}`,
      paymentChoice: data.paymentChoice,
      status: data.status,
      washingAddon: data.washingAddon,
      takeDownAddon: data.takeDownAddon,
    };

    return NextResponse.json(sanitized);
  } catch (err: any) {
    console.error("[Booking Confirmation API] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
