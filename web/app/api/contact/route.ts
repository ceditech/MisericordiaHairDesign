import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateContactInquiryEmail } from "@/src/lib/email/templates/contactTemplate";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
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
            } as any);
        } catch (emailError) {
            console.error("[Contact API] Email sending failed:", emailError);
            // We don't fail the whole request if email fails, 
            // because the message is already saved in Firestore.
        }

        return NextResponse.json({ 
            success: true, 
            messageId: messageRef.id 
        });

    } catch (error: any) {
        console.error("[Contact API] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
