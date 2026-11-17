import { NextResponse } from "next/server";
import { google } from "googleapis";
import { withAuth } from "@/src/lib/auth/withAuth";
import { createOAuthState, newNonce, OAUTH_NONCE_COOKIE } from "@/src/lib/auth/oauthState";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/admin/email/auth?email=...
 * Super admin only. Returns `{ success, url }` (the Google consent URL) instead
 * of redirecting, so the dashboard can call it with an Authorization header and
 * then navigate to `url`. The `state` is signed and bound to the caller, and a
 * matching nonce is set as an httpOnly cookie for the callback to verify.
 */
export const GET = withAuth(["superAdmin"], async (request, auth) => {
    const url = new URL(request.url);
    const targetEmail = (url.searchParams.get("email") || "sales@edxstore.com").toLowerCase().trim();

    if (!EMAIL_PATTERN.test(targetEmail)) {
        return NextResponse.json({ success: false, error: "A valid email is required." }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/admin/email/callback";

    if (!clientId || !clientSecret) {
        return NextResponse.json({ success: false, error: "Google OAuth is not configured on the server." }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Scopes needed for sending email and verifying the identity
    const scopes = [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
    ];

    const nonce = newNonce();
    const state = createOAuthState({ email: targetEmail, uid: auth.uid, nonce }, clientSecret);

    const authUrl = oauth2Client.generateAuthUrl({
        // 'offline' gets a refresh_token
        access_type: "offline",
        // Force approval prompt so we always get a refresh token during setup
        prompt: "consent",
        scope: scopes,
        state,
    });

    const response = NextResponse.json({ success: true, url: authUrl });
    response.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/api/admin/email/callback",
        maxAge: 10 * 60,
    });
    return response;
});
