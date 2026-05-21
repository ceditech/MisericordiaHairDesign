import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildReminderEmail } from "@/lib/notifications/emailTemplates";
import { format, addDays } from "date-fns";
import { EmailManager } from "@/src/lib/email/EmailManager";

export const dynamic = "force-dynamic";

/**
 * API Route to trigger automated reminders.
 * Can be called by a cron job (e.g. Vercel Cron, GitHub Actions).
 * 
 * Logic:
 * 1. Find all 'confirmed' bookings for tomorrow.
 * 2. Filter for those without reminderSent = true.
 * 3. Send email using EmailManager.
 * 4. Update booking as reminderSent = true.
 */
export async function POST(req: NextRequest) {
    try {
        // Simple security check (optional, but recommended)
        const authHeader = req.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tomorrow = addDays(new Date(), 1);
        const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

        console.log(`[Reminders API] Checking for bookings on ${tomorrowStr}...`);

        const bookingsSnapshot = await adminDb.collection("bookings")
            .where("date", "==", tomorrowStr)
            .where("status", "==", "confirmed")
            .get();

        if (bookingsSnapshot.empty) {
            return NextResponse.json({ 
                success: true, 
                message: "No bookings found for tomorrow", 
                count: 0 
            });
        }

        const batch = adminDb.batch();
        let sentCount = 0;

        for (const doc of bookingsSnapshot.docs) {
            const booking = doc.data();
            
            // Skip if already sent (double check)
            if (booking.reminderSent) continue;

            const clientEmail = booking.clientEmail;
            if (!clientEmail) {
                console.warn(`[Reminders API] No email for booking ${doc.id}`);
                continue;
            }

            // 1. Build Email content
            const { subject, html: bodyHtml } = buildReminderEmail(booking);

            // 2. Send Email
            try {
                await EmailManager.sendEmail({
                    to: clientEmail,
                    subject,
                    bodyHtml,
                });
            } catch (err) {
                console.error(`[Reminders API] Failed to send reminder to ${clientEmail}:`, err);
                continue; // Skip updating reminderSent if email failed
            }

            // 3. Mark booking as reminder sent
            batch.update(doc.ref, {
                reminderSent: true,
                reminderSentAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            sentCount++;
        }

        if (sentCount > 0) {
            await batch.commit();
        }

        console.log(`[Reminders API] Sent ${sentCount} reminders for ${tomorrowStr}`);

        return NextResponse.json({ 
            success: true, 
            message: `Sent ${sentCount} reminders`, 
            count: sentCount 
        });

    } catch (error: any) {
        console.error("[Reminders API] Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

/**
 * GET handler for manual testing or status check.
 */
export async function GET(req: NextRequest) {
    return NextResponse.json({ 
        message: "Reminders API: Use POST to trigger processing.",
        usage: "POST /api/admin/reminders"
    });
}
