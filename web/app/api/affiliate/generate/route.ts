import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { AffiliateType } from "@/src/lib/affiliate/types";

export const runtime = "nodejs";

/**
 * Generates a unique referral code in the format DB-AFF-XXXXXX
 */
function generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DB-AFF-${randomPart}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, type } = body as { name: string; email: string; type: AffiliateType };

        if (!name || !email || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const code = generateCode();

        // 1. Create the affiliate profile
        const affRef = await adminDb.collection("affiliates").add({
            name,
            email,
            type,
            code,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 2. Register the code in the 'codes' collection
        await adminDb.collection("codes").doc(code).set({
            code,
            affiliateId: affRef.id,
            affiliateEmail: email,
            active: true,
            discountPercent: 10,
            type: "referral",
            category: type,
            usageCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 3. Send the welcome email immediately using EmailManager
        try {
            const { EmailManager } = await import("@/src/lib/email/EmailManager");
            await EmailManager.sendEmail({
                to: email,
                subject: "Your Misericordia Hair Designs Affiliate Code",
                bodyHtml: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; background: #ffffff;">
                        <div style="text-align: center; margin-bottom: 30px;">
                             <h1 style="color: #9F2D5C; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin: 0;">Welcome to the Program!</h1>
                        </div>
                        <p style="font-size: 16px; color: #444; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
                        <p style="font-size: 16px; color: #444; line-height: 1.6;">We're thrilled to have you join Misericordia Hair Designs as an affiliate. Your unique referral code is now active and ready for use:</p>
                        
                        <div style="background: #fdf6ff; border: 2px dashed #9F2D5C; padding: 30px; text-align: center; border-radius: 15px; margin: 30px 0;">
                            <span style="font-size: 36px; font-weight: 900; color: #9F2D5C; letter-spacing: 4px;">${code}</span>
                            <p style="font-size: 12px; color: #9F2D5C; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px;">Share this code to earn</p>
                        </div>
                        
                        <div style="background: #fafafa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                            <p style="margin: 0; font-size: 14px; color: #666;"><strong>The Deal:</strong> Your referrals get <strong>10% OFF</strong> their first service, and you get rewarded based on your affiliate type!</p>
                        </div>

                        <p style="font-size: 16px; color: #444; line-height: 1.6;">Share your code on Instagram, TikTok, or directly with friends to start earning.</p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                        
                        <p style="font-size: 14px; color: #888; text-align: center; margin: 0;">
                            Best regards,<br/>
                            <strong>Misericordia Hair Design Team</strong><br/>
                            <a href="https://misericordiahairdesign.com" style="color: #9F2D5C; text-decoration: none;">misericordiahairdesign.com</a>
                        </p>
                    </div>
                `
            } as any);
            console.log(`[Affiliate API] Welcome email sent to ${email}`);
        } catch (emailError) {
            console.error("[Affiliate API] Error sending welcome email:", emailError);
            // We don't fail the whole request if email fails, but we logged it
        }

        // 4. Also keep the fallback in 'mail' collection just in case
        await adminDb.collection("mail").add({
            to: email,
            message: {
                subject: "Your Misericordia Hair Designs Affiliate Code",
                html: `<h1>Code: ${code}</h1>`
            }
        });

        return NextResponse.json({
            id: affRef.id,
            name,
            email,
            type,
            code,
            createdAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("[Affiliate API] Error generating code:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
