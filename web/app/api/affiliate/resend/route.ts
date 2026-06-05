import { NextRequest, NextResponse } from "next/server";
import { EmailManager } from "@/src/lib/email/EmailManager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
        }

        console.log(`[Affiliate Resend API] Resending email to ${email} for code ${code}`);

        await EmailManager.sendEmail({
            to: email,
            subject: "Your Dede's Braids Affiliate Code (Resent)",
            bodyHtml: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                         <h1 style="color: #9F2D5C; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin: 0;">Your Referral Code</h1>
                    </div>
                    <p style="font-size: 16px; color: #444; line-height: 1.6;">Hi <strong>${name || "Affiliate"}</strong>,</p>
                    <p style="font-size: 16px; color: #444; line-height: 1.6;">As requested, here is your unique Dede's Braids referral code again:</p>
                    
                    <div style="background: #fdf6ff; border: 2px dashed #9F2D5C; padding: 30px; text-align: center; border-radius: 15px; margin: 30px 0;">
                        <span style="font-size: 36px; font-weight: 900; color: #9F2D5C; letter-spacing: 4px;">${code}</span>
                    </div>
                    
                    <div style="background: #fafafa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <p style="margin: 0; font-size: 14px; color: #666;"><strong>Reminder:</strong> Your referrals get 10% OFF, and you earn rewards for every booking!</p>
                    </div>

                    <p style="font-size: 16px; color: #444; line-height: 1.6;">Keep sharing and keep earning!</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    
                    <p style="font-size: 14px; color: #888; text-align: center; margin: 0;">
                        Best regards,<br/>
                        <strong>Misericordia Hair Design Team</strong><br/>
                        <a href="https://misericordiahairdesign.com" style="color: #9F2D5C; text-decoration: none;">misericordiahairdesign.com</a>
                    </p>
                </div>
            `
        } as any);

        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error("[Affiliate Resend API] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to resend email" }, { status: 500 });
    }
}
