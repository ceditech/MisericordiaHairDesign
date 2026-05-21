import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SenderRepository } from "@/src/lib/email/SenderRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL("/owner/settings?email_error=" + encodeURIComponent(error), request.url));
    }

    if (!code) {
        return NextResponse.json({ error: "No authorization code provided." }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/admin/email/callback";

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user's email address
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!email) {
            throw new Error("Could not retrieve email address from Google.");
        }

        // Save tokens to Firestore via Admin SDK
        // (Ensure this API route runs server-side, not edge, because admin SDK relies on Node.js)
        await SenderRepository.savePrimarySender({
            email,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token!,
            expiryDate: tokens.expiry_date!
        });

        return NextResponse.redirect(new URL("/owner/settings?email_success=true", request.url));
    } catch (err: any) {
        console.error("Error exchanging OAuth code:", err);
        return NextResponse.redirect(new URL("/owner/settings?email_error=" + encodeURIComponent(err.message), request.url));
    }
}
