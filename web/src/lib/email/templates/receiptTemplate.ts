export function generateElegantReceiptEmail(
    draft: any,
    bookingId: string,
    role: "client" | "owner",
    amountPaidFormatted: string,
    isReactivation?: boolean
): string {
    const isOwner = role === "owner";
    const title = isOwner ? "New Booking Received! 🎉" : (isReactivation ? "Booking Reactivated!" : "Your Booking is Confirmed!");
    const preheader = isOwner
        ? `New appointment for ${draft.clientName} on ${draft.date}.`
        : (isReactivation ? `Your appointment has been successfully reactivated.` : `Thank you for booking with Misericordia Hair Design. Here are your appointment details.`);

    const accentColor = "#a319c5";
    const bgColor = "#f8f6f7";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background-color: #1e293b; color: #ffffff; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; color: #334155; }
        .content h2 { color: #0f172a; font-size: 22px; margin-top: 0; margin-bottom: 24px; }
        .summary-card { background-color: ${bgColor}; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
        .summary-item { display: flex; justify-content: space-between; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
        .summary-item:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
        .label { color: #64748b; font-weight: 500; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; display: block; margin-bottom: 4px; }
        .value { color: #0f172a; font-weight: 600; font-size: 16px; display: block; }
        .price-row { display: flex; justify-content: space-between; align-items: center; background-color: rgba(163, 25, 197, 0.05); padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid rgba(163, 25, 197, 0.1); }
        .price-label { color: ${accentColor}; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
        .price-value { color: ${accentColor}; font-weight: 900; font-size: 24px; }
        .footer { text-align: center; padding: 30px; color: #94a3b8; font-size: 13px; background-color: #ffffff; border-top: 1px solid #f1f5f9; }
        .button { display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: 700; margin-top: 20px; }
        .button:hover { background-color: #8b15a8; }
    </style>
</head>
<body>
    <div style="display: none; max-height: 0px; overflow: hidden;">
        ${preheader}
    </div>
    
    <div class="container">
        <div class="header">
            <h1 style="color: white; margin-bottom: 8px;">Misericordia Hair Design</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">Booking Reference: ${bookingId.split('_').pop()?.toUpperCase() || bookingId}</p>
        </div>
        
        <div class="content">
            <h2>${title}</h2>
            
            ${isOwner ? '' : `<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #475569;">Hi ${draft.clientName?.split(' ')[0]}, your appointment has been successfully booked. We've received your payment and locked in your time.</p>`}
            
            <div class="summary-card">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                        <td width="50%" style="padding-bottom: 20px;">
                            <span class="label">Date</span>
                            <span class="value">${draft.date || 'TBD'}</span>
                        </td>
                        <td width="50%" style="padding-bottom: 20px;">
                            <span class="label">Time</span>
                            <span class="value">${draft.time || 'TBD'}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-bottom: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <span class="label">Service</span>
                            <span class="value" style="color: ${accentColor}; font-size: 18px;">${draft.styleName || 'Custom Braid Style'}</span>
                        </td>
                    </tr>
                    ${draft.sizeName ? `
                    <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                            <span class="label" style="display: inline-block; width: 100px;">Size:</span>
                            <span class="value" style="display: inline-block; font-size: 15px;">${draft.sizeName}</span>
                        </td>
                    </tr>` : ''}
                    ${draft.lengthName ? `
                    <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                            <span class="label" style="display: inline-block; width: 100px;">Length:</span>
                            <span class="value" style="display: inline-block; font-size: 15px;">${draft.lengthName}</span>
                        </td>
                    </tr>` : ''}
                    ${draft.duration ? `
                    <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                            <span class="label" style="display: inline-block; width: 100px;">Est. Time:</span>
                            <span class="value" style="display: inline-block; font-size: 15px;">${draft.duration}</span>
                        </td>
                    </tr>` : ''}
                    ${draft.washingAddon ? `
                    <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                            <span class="label" style="display: inline-block; width: 100px;">Add-on:</span>
                            <span class="value" style="display: inline-block; font-size: 15px;">Washing Service (+15 USD)</span>
                        </td>
                    </tr>` : ''}
                    ${draft.takeDownAddon ? `
                    <tr>
                        <td colspan="2" style="padding-bottom: 12px;">
                            <span class="label" style="display: inline-block; width: 100px;">Add-on:</span>
                            <span class="value" style="display: inline-block; font-size: 15px;">Take Down Service (+30 USD)</span>
                        </td>
                    </tr>` : ''}
                </table>
            </div>

            <div class="summary-card" style="background-color: #ffffff; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Client Information</h3>
                <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${draft.clientName || 'N/A'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${draft.clientEmail || 'N/A'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${draft.clientPhone || 'N/A'}</p>
                ${draft.notes ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px solid #f1f5f9;"><strong>Notes:</strong> ${draft.notes}</p>` : ''}
            </div>
            
            ${draft.photoUrl ? `
            <div class="summary-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; text-align: center;">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Inspiration Photo</h3>
                <img src="${draft.photoUrl}" alt="Inspiration Photo" style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover;">
            </div>
            ` : ''}
            
            <div class="price-row">
                <span class="price-label">Amount Paid (${draft.paymentChoice === 'deposit' ? 'Deposit' : 'Full Payment'})</span>
                <span class="price-value">${amountPaidFormatted}</span>
            </div>
            
            ${!isOwner ? `
            <div style="text-align: center; margin-top: 40px;">
                <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Need to make changes to your appointment?</p>
                <a href="https://misericordiahairdesign.com/contact" class="button" style="color: white;">Contact Us</a>
            </div>
            ` : `
            <div style="text-align: center; margin-top: 40px;">
                <a href="https://misericordiahairdesign.com/owner/dashboard" class="button" style="color: white;">View in Dashboard</a>
            </div>
            `}
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0; color: #0f172a;"><strong>Misericordia Hair Design</strong></p>
            <p style="margin: 0; line-height: 1.5;">1931 Market Center Blvd, Dallas, TX 75207<br>Gate Code 823 near Stair Six or 7</p>
            <p style="margin: 10px 0 0 0;">Phone: 945-275-4778 • Email: <a href="mailto:mariefleurekpe@gmail.com" style="color: #94a3b8; text-decoration: none;">mariefleurekpe@gmail.com</a></p>
            <div style="margin-top: 16px; display: inline-block;">
                <a href="https://www.facebook.com/profile.php?id=61585347691705" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 8px;">
                    <img src="https://img.icons8.com/ios-filled/50/94a3b8/facebook-new.png" width="24" height="24" alt="Facebook" style="vertical-align: middle; border: none; display: block;">
                </a>
                <a href="https://www.tiktok.com/@misericordiahairdesign" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 8px;">
                    <img src="https://img.icons8.com/ios-filled/50/94a3b8/tiktok.png" width="24" height="24" alt="TikTok" style="vertical-align: middle; border: none; display: block;">
                </a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}
