import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";

// Public endpoint, one Firestore query per call: best-effort per-IP limit (see src/lib/http/rateLimit.ts).
// Generous because /book calls it each time the visitor changes the date.
const availabilityLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });

/**
 * GET /api/bookings/availability?date=...
 * Fetches confirmed bookings for a specific date and returns only non-sensitive timing information.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = availabilityLimiter.check(clientIp(req));
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

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
  } catch (error: unknown) {
    console.error("[API Availability] Error fetching availability:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
