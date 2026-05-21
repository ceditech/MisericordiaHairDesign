export function generateContactInquiryEmail(
    name: string,
    email: string,
    service: string,
    message: string
): string {
    const accentColor = "#a319c5";
    const bgColor = "#f8f6f7";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Inquiry</title>
    <style>
        body { margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background-color: #1e293b; color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 40px 30px; color: #334155; }
        .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 24px; border-bottom: 2px solid ${accentColor}; display: inline-block; padding-bottom: 4px; }
        .info-grid { background-color: ${bgColor}; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .info-item { margin-bottom: 12px; }
        .info-item:last-child { margin-bottom: 0; }
        .label { color: #64748b; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 2px; }
        .value { color: #0f172a; font-weight: 600; font-size: 15px; }
        .message-box { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; color: #334155; line-height: 1.6; font-size: 15px; white-space: pre-wrap; }
        .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: white;">Dede's Braids</h1>
        </div>
        
        <div class="content">
            <h2>New Inquiry Received</h2>
            
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">From</span>
                    <span class="value">${name}</span>
                </div>
                <div class="info-item">
                    <span class="label">Email</span>
                    <span class="value">${email}</span>
                </div>
                <div class="info-item">
                    <span class="label">Service Interest</span>
                    <span class="value" style="color: ${accentColor};">${service}</span>
                </div>
            </div>
            
            <span class="label" style="margin-left: 4px; margin-bottom: 8px;">Message</span>
            <div class="message-box">
${message}
            </div>
        </div>
        
        <div class="footer">
            Sent from dedesbraids.com contact form
        </div>
    </div>
</body>
</html>
`;
}
