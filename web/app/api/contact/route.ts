import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateContactInquiryEmail } from "@/src/lib/email/templates/contactTemplate";
import { FieldValue } from "firebase-admin/firestore";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";

// Public endpoint that saves a document and emails the owner: best-effort per-IP limit (see src/lib/http/rateLimit.ts).
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function POST(req: NextRequest) {
    try {
        const limit = contactLimiter.check(clientIp(req));
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
            );
        }

        const body = await req.json();
        const { name, email, service, message } = body;

        // 1. Basic Validation
        if (!name || !email || !service || !message) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 2. Save to Firestore
        const messageRef = await adminDb.collection("contactMessages").add({
            name,
            email,
            service,
            message,
            status: "new",
            createdAt: FieldValue.serverTimestamp(),
            source: "web_contact_form"
        });

        // 3. Send Email Notification to Owner
        try {
            const emailHtml = generateContactInquiryEmail(name, email, service, message);
            await EmailManager.sendEmail({
                to: "sales@edxstore.com",
                subject: `New Contact Inquiry: ${name} - ${service}`,
                bodyHtml: emailHtml,
            });
        } catch (emailError) {
            console.error("[Contact API] Email sending failed:", emailError);
            // We don't fail the whole request if email fails, 
            // because the message is already saved in Firestore.
        }

        return NextResponse.json({ 
            success: true, 
            messageId: messageRef.id 
        });

    } catch (error: unknown) {
        console.error("[Contact API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
