import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { withUser } from "@/src/lib/auth/withAuth";
import { sortNewestFirst, toClientBooking } from "@/src/lib/bookings/clientBooking";

export const dynamic = "force-dynamic";

const MAX_BOOKINGS = 200;

/**
 * GET /api/bookings/mine
 * Returns the signed-in customer's own bookings (matched by the verified uid),
 * limited to the fields the dashboard shows. Served by the server so the
 * `bookings` collection stays closed to browsers and needs no composite index
 * (the query is equality-only; sorting happens here).
 */
export const GET = withUser(async (_req, user) => {
    try {
        const snapshot = await adminDb
            .collection("bookings")
            .where("userId", "==", user.uid)
            .limit(MAX_BOOKINGS)
            .get();

        const bookings = sortNewestFirst(snapshot.docs.map((doc) => toClientBooking(doc.id, doc.data())));
        return NextResponse.json({ success: true, bookings });
    } catch (error) {
        console.error("[My Bookings API] Failed to load bookings:", error);
        return NextResponse.json({ success: false, error: "Failed to load bookings" }, { status: 500 });
    }
});
