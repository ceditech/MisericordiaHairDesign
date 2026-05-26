import { NextRequest, NextResponse } from "next/server";
import { SenderRepository } from "@/src/lib/email/SenderRepository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get("email");
        if (!email) {
            return NextResponse.json({ success: false, error: "Email parameter is required" }, { status: 400 });
        }
        await SenderRepository.deleteSender(email);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
