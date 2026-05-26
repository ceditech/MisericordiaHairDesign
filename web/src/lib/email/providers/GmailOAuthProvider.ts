import { google } from "googleapis";
import { EmailProvider, SendEmailOptions } from "../EmailProvider";
import { SenderRepository, GmailSenderConfig } from "../SenderRepository";

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
            // Must have primary sender configured
            const sender = await SenderRepository.getPrimarySender();
            return !!sender && !!sender.refreshToken;
        } catch (error) {
            return false;
        }
    }

    async sendEmail(options: SendEmailOptions): Promise<void> {
        // Resolve target sender
        const targetEmail = options.fromEmail ? options.fromEmail.toLowerCase().trim() : "sales@edxstore.com";
        
        let sender: GmailSenderConfig | null = null;
        if (targetEmail === "sales@edxstore.com") {
            sender = await SenderRepository.getPrimarySender();
        } else {
            sender = await SenderRepository.getSender(targetEmail);
        }

        if (!sender || !sender.refreshToken) {
            console.error(`[GmailOAuthProvider] Sender ${targetEmail} is not configured or missing refresh token.`);
            throw new Error(`Email sender ${targetEmail} is not configured. Please authorize this account first.`);
        }

        const oauth2Client = this.getOAuthClient();
        oauth2Client.setCredentials({
            access_token: sender.accessToken,
            refresh_token: sender.refreshToken,
            expiry_date: sender.expiryDate
        });

        // Whenever googleapis refreshes the token, save it to the correct sender document in Firestore
        oauth2Client.on('tokens', (tokens) => {
            const updatedConfig = {
                email: sender!.email,
                name: sender!.name || '',
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token || sender!.refreshToken, // Keep existing refresh token if not returned
                expiryDate: tokens.expiry_date!,
                isPrimary: sender!.isPrimary || false
            };

            if (sender!.isPrimary) {
                SenderRepository.savePrimarySender(updatedConfig).catch((err: any) => 
                    console.error("[GmailOAuthProvider] Failed to save primary sender refreshed token", err)
                );
            } else {
                SenderRepository.saveSender(sender!.email, updatedConfig).catch((err: any) => 
                    console.error(`[GmailOAuthProvider] Failed to save sender ${sender!.email} refreshed token`, err)
                );
            }
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Construct raw email according to RFC 2822
        const boundary = 'foo123'; // Unique boundary
        const messageId = `<${Date.now()}-${Math.random().toString(36).substring(2)}@misericordiahairdesign.com>`;
        
        let rawMessage = [
            `From: "${options.fromName || sender.name || 'Misericordia Hair Design'}" <${sender.email}>`,
            `To: ${options.to}`,
            `Subject: ${options.subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: ${messageId}`,
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
            console.log(`[GmailOAuthProvider] Successfully sent email to ${options.to} from ${sender.email}`);
        } catch (error) {
            console.error(`[GmailOAuthProvider] Failed to send email via Gmail API from ${sender.email}:`, error);
            throw new Error(`Failed to send email via Gmail API: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
