import { EmailProvider, SendEmailOptions } from "./EmailProvider";
import { GmailOAuthProvider } from "./providers/GmailOAuthProvider";

class EmailManagerClass {
    private provider: EmailProvider;

    constructor() {
        // We inject the GmailOAuthProvider by default. 
        // In the future, this could be dynamic based on a Firestore config.
        this.provider = new GmailOAuthProvider();
    }

    /**
     * Gets the currently active email provider.
     */
    getProvider(): EmailProvider {
        return this.provider;
    }

    /**
     * Helper to quickly send an email using the active provider.
     */
    async sendEmail(options: SendEmailOptions): Promise<void> {
        await this.provider.sendEmail(options);
    }

    /**
     * Helper to quickly check if the email system is ready to send.
     */
    async isSystemConfigured(): Promise<boolean> {
        return await this.provider.isConfigured();
    }
}

// Export as a singleton
export const EmailManager = new EmailManagerClass();
