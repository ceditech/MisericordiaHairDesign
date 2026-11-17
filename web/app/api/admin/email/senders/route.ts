import { NextRequest, NextResponse } from "next/server";
import { SenderRepository } from "@/src/lib/email/SenderRepository";
import { withAuth } from "@/src/lib/auth/withAuth";

export const dynamic = "force-dynamic";

/** GET /api/admin/email/senders: super admin only (matches the dashboard UI). */
export const GET = withAuth(["superAdmin"], async () => {
    try {
        const senders = await SenderRepository.getAllSenders();
        // Safe mapping - do not expose tokens to frontend
        const safeSenders = senders.map(s => ({
            email: s.email,
            name: s.name || "",
            isPrimary: s.isPrimary || false,
            updatedAt: s.updatedAt,
            connected: !!s.refreshToken
        }));
        return NextResponse.json({ success: true, senders: safeSenders });
    } catch (error) {
        console.error("[Email Senders API] List failed:", error);
        return NextResponse.json({ success: false, error: "Failed to load email senders." }, { status: 500 });
    }
});

/** DELETE /api/admin/email/senders?email=...: super admin only. */
export const DELETE = withAuth(["superAdmin"], async (req: NextRequest, auth) => {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get("email");
        if (!email) {
            return NextResponse.json({ success: false, error: "Email parameter is required" }, { status: 400 });
        }
        console.info(`[Email Senders API] ${email} removed by ${auth.uid}`);
        await SenderRepository.deleteSender(email);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Email Senders API] Delete failed:", error);
        return NextResponse.json({ success: false, error: "Failed to delete email sender." }, { status: 500 });
    }
});
