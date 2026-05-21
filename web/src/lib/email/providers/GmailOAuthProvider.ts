import { google } from "googleapis";
import { EmailProvider, SendEmailOptions } from "../EmailProvider";
import { SenderRepository } from "../SenderRepository";

export class GmailOAuthProvider implements EmailProvider {
    readonly providerId = 'gmail_oauth';

    /**
     * Initializes the OAuth2 Client with our server's credentials
     */
    private getOAuthClient() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/admin/email/callback";

        if (!clientId || !clientSecret) {
            throw new Error("Missing Google OAuth credentials in environment variables.");
        }

        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    async isConfigured(): Promise<boolean> {
        try {
            // Must have env vars
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
                return false;
            }
            // Must have saved tokens in Firestore
            const sender = await SenderRepository.getPrimarySender();
            return !!sender && !!sender.refreshToken;
        } catch (error) {
            return false;
        }
    }

    async sendEmail(options: SendEmailOptions): Promise<void> {
        const configured = await this.isConfigured();
        if (!configured) {
            console.error("[GmailOAuthProvider] Cannot send email. Provider is not configured.");
            throw new Error("Email provider not configured. Please connect Gmail in the dashboard.");
        }

        const sender = await SenderRepository.getPrimarySender();
        if (!sender) {
            throw new Error("Sender configuration missing");
        }

        const oauth2Client = this.getOAuthClient();
        oauth2Client.setCredentials({
            access_token: sender.accessToken,
            refresh_token: sender.refreshToken,
            expiry_date: sender.expiryDate
        });

        // Whenever googleapis refreshes the token, we should technically save it.
        // We can attach a listener to 'tokens' event on the client.
        oauth2Client.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                SenderRepository.savePrimarySender({
                    email: sender.email,
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token,
                    expiryDate: tokens.expiry_date!
                }).catch((err: any) => console.error("Failed to save refreshed token", err));
            } else {
                SenderRepository.savePrimarySender({
                    email: sender.email,
                    accessToken: tokens.access_token!,
                    refreshToken: sender.refreshToken, // keep old refresh token
                    expiryDate: tokens.expiry_date!
                }).catch((err: any) => console.error("Failed to save refreshed token", err));
            }
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Construct raw email according to RFC 2822
        const boundary = 'foo123'; // Unique boundary
        
        let rawMessage = [
            `From: "${options.fromName || 'Dedes Braids'}" <${sender.email}>`,
            `To: ${options.to}`,
            `Subject: ${options.subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            '',
            options.bodyText || 'Please view this email in an HTML-compatible email client.',
            '',
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            '',
            options.bodyHtml,
            '',
            `--${boundary}--`
        ].join('\n');

        // Base64 URL encode
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });
            console.log(`[GmailOAuthProvider] Successfully sent email to ${options.to}`);
        } catch (error) {
            console.error("[GmailOAuthProvider] Failed to send email via Gmail API:", error);
            throw new Error("Failed to send email");
        }
    }
}
