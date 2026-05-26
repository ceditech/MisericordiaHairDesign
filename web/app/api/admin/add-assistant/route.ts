import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { EmailManager } from "@/src/lib/email/EmailManager";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { email, name, phone } = await req.json();

        if (!email || !name || !phone) {
            return NextResponse.json({ success: false, error: "Email, name, and phone are required." }, { status: 400 });
        }

        let uid = "";
        let isNewUser = false;
        let resetLink = "";

        // 1. Check if user exists in Firebase Auth
        try {
            const userRecord = await adminAuth.getUserByEmail(email);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist, create them
                const newUser = await adminAuth.createUser({
                    email,
                    displayName: name,
                    // Note: phone numbers must be E.164. We will just save phone to firestore to avoid verification errors
                });
                uid = newUser.uid;
                isNewUser = true;

                // Generate a password reset link for the new user to set their password
                // continueUrl brings them back to login after setting their password
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://misericordiahairdesign.com";
                resetLink = await adminAuth.generatePasswordResetLink(email, {
                    url: `${appUrl}/login?email=${encodeURIComponent(email)}&welcome=true`,
                });
            } else {
                throw error;
            }
        }

        // 2. Update Firestore user document
        const userRef = adminDb.collection("users").doc(uid);
        await userRef.set({
            email,
            name,
            phone,
            role: "assistant",
            updatedAt: FieldValue.serverTimestamp(),
            ...(isNewUser ? { createdAt: FieldValue.serverTimestamp() } : {})
        }, { merge: true });

        // 3. Send Email Notification
        let emailSent = false;
        let emailError = null;

        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://misericordiahairdesign.com";
            const subject = "You've been added as an Admin!";
            
            let bodyHtml = `
                <div style="font-family: sans-serif; max-w-lg mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h2 style="color: #6b38d4; margin-bottom: 16px;">Welcome to the Misericordia Hair Designs Dashboard, ${name}!</h2>
                    <p style="color: #475569; line-height: 1.6;">You have been granted Assistant access to the Misericordia Hair Designs management dashboard.</p>
            `;

            if (isNewUser) {
                bodyHtml += `
                    <p style="color: #475569; line-height: 1.6;">An account has been automatically created for you. To get started, please set your password by clicking the secure link below:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #6b38d4; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px; margin-bottom: 16px;">Set Your Password</a>
                `;
            } else {
                bodyHtml += `
                    <p style="color: #475569; line-height: 1.6;">Your existing account has been upgraded. You can now log in to the dashboard.</p>
                    <a href="${appUrl}/login" style="display: inline-block; padding: 12px 24px; background-color: #6b38d4; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px; margin-bottom: 16px;">Log In to Dashboard</a>
                `;
            }

            bodyHtml += `
                    <p style="color: #475569; line-height: 1.6; font-size: 14px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        If you have any questions, please contact the Super Admin.<br/>
                        Misericordia Hair Designs
                    </p>
                </div>
            `;

            await EmailManager.sendEmail({
                to: email,
                subject,
                bodyHtml,
            });
            emailSent = true;
        } catch (error: any) {
            console.error("[Add Assistant API] Email Error:", error);
            emailError = error.message;
        }

        return NextResponse.json({ 
            success: true, 
            message: isNewUser ? "User created and added as assistant." : "Existing user upgraded to assistant.",
            emailStatus: {
                sent: emailSent,
                error: emailError
            }
        });

    } catch (error: any) {
        console.error("[Add Assistant API] Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Failed to add assistant." 
        }, { status: 500 });
    }
}
