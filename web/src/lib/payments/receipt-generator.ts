/**
 * Receipt Generation Utility
 * Generates an HTML receipt designed for email or PDF conversion.
 */

export interface ReceiptData {
    bookingId: string;
    customerEmail: string;
    amountUSD: string;
    currency: string;
    date: string;
    provider: "stripe" | "paypal";
    paymentIntentId?: string;
    serviceName?: string;
}

export function generateHtmlReceipt(data: ReceiptData): string {
    const {
        bookingId,
        customerEmail,
        amountUSD,
        currency,
        date,
        provider,
        paymentIntentId,
        serviceName = "Premium Braid Service"
    } = data;

    const formattedDate = new Date(date).toLocaleString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
    });

    const isStripe = provider === "stripe";
    const providerName = isStripe ? "Stripe" : "PayPal";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; color: #111827; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
            .header { background-color: #111827; color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
            .header p { margin: 5px 0 0; color: #9ca3af; font-size: 14px; }
            .content { padding: 30px; }
            .amount-box { text-align: center; margin-bottom: 30px; }
            .amount { font-size: 42px; font-weight: 700; color: #111827; margin: 0; }
            .status { display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 10px; }
            .details { border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 20px 0; margin-bottom: 30px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .detail-row:last-child { margin-bottom: 0; }
            .detail-label { color: #6b7280; font-size: 14px; }
            .detail-value { font-weight: 500; font-size: 14px; color: #111827; text-align: right; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { margin: 0; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Misericordia Hair Design</h1>
                <p>Payment Receipt</p>
            </div>
            <div class="content">
                <div class="amount-box">
                    <p class="amount">$${amountUSD} <span style="font-size: 20px; color: #6b7280;">${currency.toUpperCase()}</span></p>
                    <div class="status">Paid via ${providerName}</div>
                </div>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Service</span>
                        <span class="detail-value">${serviceName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date Paid</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Customer Email</span>
                        <span class="detail-value">${customerEmail}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Booking ID</span>
                        <span class="detail-value">${bookingId}</span>
                    </div>
                    ${paymentIntentId ? `
                    <div class="detail-row">
                        <span class="detail-label">${providerName} Transaction ID</span>
                        <span class="detail-value">${paymentIntentId}</span>
                    </div>
                    ` : ''}
                </div>
                
                <p style="text-align: center; color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
                    Thank you for your business! Your appointment is confirmed and payment has been processed securely.
                </p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Misericordia Hair Design. All rights reserved.</p>
                <p style="margin-top: 5px;">This is an automated receipt, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
