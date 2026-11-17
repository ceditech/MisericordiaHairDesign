import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { SenderRepository } from "@/src/lib/email/SenderRepository";
import { OAUTH_NONCE_COOKIE, verifyOAuthState } from "@/src/lib/auth/oauthState";

export const dynamic = "force-dynamic";

/** Errors whose message is written for the user and safe to show on the settings page. */
class OAuthFlowError extends Error {}

const GENERIC_FAILURE = "Email authorization failed. Please try again.";

/**
 * GET /api/admin/email/callback
 * Google redirects the browser here, so no Authorization header is possible.
 * Trust comes from the signed state issued by /api/admin/email/auth (bound to a
 * super admin and a nonce cookie). Without a valid state nothing is saved.
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/admin/email/callback";

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
    }

    const redirectWith = (query: string) => {
        const res = NextResponse.redirect(new URL(`/owner/settings?${query}`, request.url));
        res.cookies.set(OAUTH_NONCE_COOKIE, "", { path: "/api/admin/email/callback", maxAge: 0 });
        return res;
    };

    const verified = verifyOAuthState(url.searchParams.get("state"), clientSecret);
    const nonceCookie = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;
    if (!verified || !nonceCookie || nonceCookie !== verified.nonce) {
        console.warn("[Email OAuth] Rejected callback with missing/invalid state or nonce");
        return redirectWith("email_error=" + encodeURIComponent("Invalid or expired authorization request. Please start again."));
    }
    const targetEmail = verified.email.toLowerCase().trim();

    if (error) {
        return redirectWith("email_error=" + encodeURIComponent("Google authorization was not completed."));
    }

    if (!code) {
        return NextResponse.json({ error: "No authorization code provided." }, { status: 400 });
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
            throw new OAuthFlowError("Could not retrieve email address from Google.");
        }

        const authenticatedEmail = email.toLowerCase().trim();
        if (authenticatedEmail !== targetEmail) {
            throw new OAuthFlowError(`Account mismatch. Expected: ${targetEmail}, but authorized: ${authenticatedEmail}. Please select the matching account.`);
        }

        if (!tokens.refresh_token) {
            // Check if we already have a refresh token for this email to avoid losing it
            const existing = targetEmail === "sales@edxstore.com" 
                ? await SenderRepository.getPrimarySender()
                : await SenderRepository.getSender(targetEmail);
            
            if (existing && existing.refreshToken) {
                tokens.refresh_token = existing.refreshToken;
            } else {
                throw new OAuthFlowError("No refresh token returned by Google. Please disconnect and reconnect to prompt for full consent.");
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

        return redirectWith("email_success=true");
    } catch (err) {
        console.error("Error exchanging OAuth code:", err);
        const message = err instanceof OAuthFlowError ? err.message : GENERIC_FAILURE;
        return redirectWith("email_error=" + encodeURIComponent(message));
    }
}
