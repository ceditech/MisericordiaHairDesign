import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const targetEmail = (url.searchParams.get("email") || "sales@edxstore.com").toLowerCase().trim();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/admin/email/callback";

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Google OAuth is not configured on the server." }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    // Scopes needed for sending email and verifying the identity
    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const urlAuth = oauth2Client.generateAuthUrl({
        // 'offline' gets a refresh_token
        access_type: 'offline',
        // Force approval prompt so we always get a refresh token during setup
        prompt: 'consent',
        scope: scopes,
        state: targetEmail, // Pass target email in state to persist and validate
    });

    // Redirect the user to the Google OAuth consent screen
    return NextResponse.redirect(urlAuth);
}
