export interface SendEmailOptions {
    to: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    fromName?: string;
    fromEmail?: string;
}

export interface EmailProvider {
    /**
     * The unique identifier for this provider (e.g., 'gmail_oauth', 'sendgrid')
     */
    readonly providerId: string;

    /**
     * Send an email using this provider
     */
    sendEmail(options: SendEmailOptions): Promise<void>;

    /**
     * Check if the provider has all necessary configuration to send emails
     */
    isConfigured(): Promise<boolean>;
}
