import { NextResponse } from "next/server";
import { google } from "googleapis";
import { SenderRepository } from "@/src/lib/email/SenderRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state") || "sales@edxstore.com";
    const targetEmail = state.toLowerCase().trim();

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

        const authenticatedEmail = email.toLowerCase().trim();
        if (authenticatedEmail !== targetEmail) {
            throw new Error(`Account mismatch. Expected: ${targetEmail}, but authorized: ${authenticatedEmail}. Please select the matching account.`);
        }

        if (!tokens.refresh_token) {
            // Check if we already have a refresh token for this email to avoid losing it
            const existing = targetEmail === "sales@edxstore.com" 
                ? await SenderRepository.getPrimarySender()
                : await SenderRepository.getSender(targetEmail);
            
            if (existing && existing.refreshToken) {
                tokens.refresh_token = existing.refreshToken;
            } else {
                throw new Error("No refresh token returned by Google. Please disconnect and reconnect to prompt for full consent.");
            }
        }

        // Save tokens to Firestore via Admin SDK
        if (targetEmail === "sales@edxstore.com") {
            await SenderRepository.savePrimarySender({
                email: authenticatedEmail,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiryDate: tokens.expiry_date!
            });
        } else {
            await SenderRepository.saveSender(targetEmail, {
                email: authenticatedEmail,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                expiryDate: tokens.expiry_date!
            });
        }

        return NextResponse.redirect(new URL("/owner/settings?email_success=true", request.url));
    } catch (err: any) {
        console.error("Error exchanging OAuth code:", err);
        return NextResponse.redirect(new URL("/owner/settings?email_error=" + encodeURIComponent(err.message), request.url));
    }
}
