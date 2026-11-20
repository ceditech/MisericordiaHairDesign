import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";
import { FieldValue } from "firebase-admin/firestore";
import { withAuth } from "@/src/lib/auth/withAuth";

/** POST /api/admin/bookings/reactivate: staff only (owner, admin, assistant). */
export const POST = withAuth(["owner", "admin", "assistant"], async (req: NextRequest, auth) => {
    try {
        const { bookingId } = await req.json();

        if (!bookingId || typeof bookingId !== "string") {
            return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
        }

        const bookingRef = adminDb.collection("bookings").doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const bookingData = bookingSnap.data();

        console.info(`[Reactivate] booking ${bookingId} by ${auth.uid}`);

        // Update booking status to confirmed
        await bookingRef.update({
            status: "confirmed",
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Send email
        const clientEmail = bookingData?.clientEmail || bookingData?.email;
        if (clientEmail) {
            const amountPaidCents = bookingData?.amountPaidCents || bookingData?.pricing?.amountDueCents || bookingData?.pricing?.depositCents || 0;
            const amountPaidFormatted = `$${(amountPaidCents / 100).toFixed(2)} USD`;
            const htmlContent = generateElegantReceiptEmail(bookingData, bookingId, "client", amountPaidFormatted, true);
            
            await EmailManager.sendEmail({
                to: clientEmail,
                subject: "Booking Reactivated - Misericordia Hair Design",
                bodyHtml: htmlContent,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error reactivating booking:", error);
        return NextResponse.json({ error: "Failed to reactivate booking" }, { status: 500 });
    }
});
