import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildReminderEmail } from "@/src/lib/notifications/emailTemplates";
import { format, addDays } from "date-fns";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { requireCronSecretOrRole } from "@/src/lib/auth/requireCronSecretOrRole";
import { HttpError } from "@/src/lib/http/HttpError";

export const dynamic = "force-dynamic";

/**
 * API Route to trigger automated reminders.
 * Callable by a scheduler (Authorization: Bearer <CRON_SECRET>) or by the super
 * admin from the dashboard (Firebase ID token). Fails closed: if CRON_SECRET is
 * not configured, only the super admin can trigger it.
 * 
 * Logic:
 * 1. Find all 'confirmed' bookings for tomorrow.
 * 2. Filter for those without reminderSent = true.
 * 3. Send email using EmailManager.
 * 4. Update booking as reminderSent = true.
 */
export async function POST(req: NextRequest) {
    try {
        const caller = await requireCronSecretOrRole(req, ["superAdmin"]);
        console.info(`[Reminders API] Triggered by ${caller.kind === "cron" ? "scheduler" : `user ${caller.auth.uid}`}`);

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

    } catch (error) {
        if (error instanceof HttpError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error("[Reminders API] Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: "Failed to process reminders" 
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
