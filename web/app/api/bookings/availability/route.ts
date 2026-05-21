import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";

/**
 * GET /api/bookings/availability?date=...
 * Fetches confirmed bookings for a specific date and returns only non-sensitive timing information.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const bookingsRef = adminDb.collection("bookings");
    
    // Fetch bookings for the date with confirmed status
    const snapshot = await bookingsRef
      .where("date", "==", date)
      .where("status", "in", ["confirmed", "confirmed_paypal"])
      .get();

    const availability = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        time: data.time,
        styleId: data.styleId,
        styleName: data.styleName,
        // Include duration if it exists, but calculating it from style is safer on frontend
        // We're deliberately stripping name, email, phone, and notes.
      };
    });

    return NextResponse.json(availability);
  } catch (error: any) {
    console.error("[API Availability] Error fetching availability:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
