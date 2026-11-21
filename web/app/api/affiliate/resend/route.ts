import { NextRequest, NextResponse } from "next/server";
import { EmailManager } from "@/src/lib/email/EmailManager";
import { adminDb } from "@/src/lib/firebase/admin";
import { escapeHtml } from "@/src/lib/html";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";
import { getAppUrl, getAppHost } from "@/src/lib/config/appUrl";

export const runtime = "nodejs";

const CODE_PATTERN = /^DB-AFF-[A-Z0-9]{6}$/;
// Public endpoint: best-effort per-IP limit (see src/lib/http/rateLimit.ts).
const resendLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

/**
 * POST /api/affiliate/resend
 * Public (the signup page calls it right after creating a code). It used to
 * email any address with any caller-supplied name/code (an open mail relay).
 * Now only the `code` is read from the body: the recipient and name come from
 * our own records, so a code can only ever be re-sent to its rightful owner.
 */
export async function POST(req: NextRequest) {
    try {
        const limit = resendLimiter.check(clientIp(req));
        if (!limit.ok) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
            );
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const rawCode = (body as { code?: unknown } | null)?.code;

        if (typeof rawCode !== "string" || !CODE_PATTERN.test(rawCode)) {
            return NextResponse.json({ error: "A valid affiliate code is required" }, { status: 400 });
        }
        const code = rawCode;

        const codeSnap = await adminDb.collection("codes").doc(code).get();
        const codeData = codeSnap.exists ? codeSnap.data() : null;
        const email = typeof codeData?.affiliateEmail === "string" ? codeData.affiliateEmail : null;
        if (!email) {
            return NextResponse.json({ error: "Affiliate code not found" }, { status: 404 });
        }

        let name = "Affiliate";
        if (typeof codeData?.affiliateId === "string") {
            const affSnap = await adminDb.collection("affiliates").doc(codeData.affiliateId).get();
            const storedName = affSnap.exists ? affSnap.data()?.name : null;
            if (typeof storedName === "string" && storedName) name = storedName;
        }
        const safeName = escapeHtml(name);

        console.log(`[Affiliate Resend API] Resending code ${code}`);

        await EmailManager.sendEmail({
            to: email,
            subject: "Your Misericordia Hair Designs Affiliate Code (Resent)",
            bodyHtml: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 20px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                         <h1 style="color: #9F2D5C; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; margin: 0;">Your Referral Code</h1>
                    </div>
                    <p style="font-size: 16px; color: #444; line-height: 1.6;">Hi <strong>${safeName}</strong>,</p>
                    <p style="font-size: 16px; color: #444; line-height: 1.6;">As requested, here is your unique Misericordia Hair Designs referral code again:</p>

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
                        <a href="${getAppUrl()}" style="color: #9F2D5C; text-decoration: none;">${getAppHost()}</a>
                    </p>
                </div>
            `
        });

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("[Affiliate Resend API] Error:", error);
        return NextResponse.json({ error: "Failed to resend email" }, { status: 500 });
    }
}
