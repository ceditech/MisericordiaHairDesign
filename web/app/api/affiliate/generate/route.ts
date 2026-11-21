import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { adminDb } from "@/src/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { AffiliateType } from "@/src/lib/affiliate/types";
import { escapeHtml } from "@/src/lib/html";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";
import { getAppUrl, getAppHost } from "@/src/lib/config/appUrl";

export const runtime = "nodejs";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AFFILIATE_TYPES: readonly string[] = ["client", "general"];
// Public endpoint: best-effort per-IP limit (see src/lib/http/rateLimit.ts).
const signupLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

/**
 * Generates a referral code in the format DB-AFF-XXXXXX using a
 * cryptographically secure random source.
 */
function generateCode(): string {
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
        randomPart += CODE_CHARS.charAt(randomInt(CODE_CHARS.length));
    }
    return `DB-AFF-${randomPart}`;
}

/**
 * POST /api/affiliate/generate
 * Used both by the public affiliate signup page and by staff in the dashboard,
 * so it stays public. It is hardened with input validation, a per-IP rate
 * limit, secure unique codes, and HTML-escaped email content.
 */
export async function POST(req: NextRequest) {
    try {
        const limit = signupLimiter.check(clientIp(req));
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
        const { name, email, type } = (body ?? {}) as { name?: unknown; email?: unknown; type?: unknown };

        if (!name || !email || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof type !== "string" ||
            name.trim().length === 0 ||
            name.length > 100 ||
            email.length > 254 ||
            !EMAIL_PATTERN.test(email) ||
            !AFFILIATE_TYPES.includes(type)
        ) {
            return NextResponse.json({ error: "Invalid name, email, or type" }, { status: 400 });
        }
        const affiliateType = type as AffiliateType;
        const safeName = escapeHtml(name);

        // Pick a code that is not already taken (36^6 space; retry on the rare collision).
        let code = generateCode();
        for (let attempt = 0; attempt < 5; attempt++) {
            const taken = await adminDb.collection("codes").doc(code).get();
            if (!taken.exists) break;
            if (attempt === 4) throw new Error("Could not allocate a unique affiliate code");
            code = generateCode();
        }

        // 1+2. Create the affiliate profile and register its code atomically
        const affRef = adminDb.collection("affiliates").doc();
        const codeRef = adminDb.collection("codes").doc(code);
        const batch = adminDb.batch();
        batch.set(affRef, {
            name,
            email,
            type: affiliateType,
            code,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        batch.set(codeRef, {
            code,
            affiliateId: affRef.id,
            affiliateEmail: email,
            active: true,
            discountPercent: 10,
            type: "referral",
            category: affiliateType,
            usageCount: 0,
            createdAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();

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
                        <p style="font-size: 16px; color: #444; line-height: 1.6;">Hi <strong>${safeName}</strong>,</p>
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
                            <a href="${getAppUrl()}" style="color: #9F2D5C; text-decoration: none;">${getAppHost()}</a>
                        </p>
                    </div>
                `
            });
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
            type: affiliateType,
            code,
            createdAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("[Affiliate API] Error generating code:", error);
        return NextResponse.json({ error: "Failed to generate affiliate code" }, { status: 500 });
    }
}
