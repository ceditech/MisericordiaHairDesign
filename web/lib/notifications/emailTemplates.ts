import { ConfirmedBooking } from "@/lib/bookingDraft";
import { DEPOSIT_POLICY, CANCELLATION_POLICY } from "@/src/content/legal";

interface EmailData {
    subject: string;
    text: string;
    html: string;
}

const POLICIES = `
- ${DEPOSIT_POLICY}
- ${CANCELLATION_POLICY}
`;

export function buildClientConfirmationEmail(booking: ConfirmedBooking): EmailData {
    const subject = `Confirmed: Your Braiding Appointment with Dede's Braids`;

    const text = `
Hello ${booking.clientName},

Your booking is confirmed!

Details:
- Service: ${booking.styleName} (${booking.duration})
${booking.sizeName ? `- Size: ${booking.sizeName}` : ''}
${booking.lengthName ? `- Length: ${booking.lengthName}` : ''}
${booking.washingAddon ? `- Add-on: Washing Service` : ''}
${booking.takeDownAddon ? `- Add-on: Take Down Service` : ''}
- Date: ${booking.date}
- Time: ${booking.time}
- Payment: ${booking.amountPaidLabel} paid now via ${booking.provider} (${booking.paymentChoice === 'deposit' ? 'Deposit' : 'Full amount'})

Policies:
${POLICIES}

Location: Dede's Braids, Manor, TX
We look forward to seeing you!
`;

    const html = `
<div style="font-family: sans-serif; line-height: 1.5; color: #333;">
    <h1 style="color: #a319c5;">Booking Confirmed!</h1>
    <p>Hello <strong>${booking.clientName}</strong>,</p>
    <p>Your appointment at Dede's Braids is locked in. We're excited to see you!</p>
    
    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Appointment Details</h2>
        <ul style="list-style: none; padding: 0;">
            <li><strong>Service:</strong> ${booking.styleName}</li>
            ${booking.sizeName ? `<li><strong>Size:</strong> ${booking.sizeName}</li>` : ''}
            ${booking.lengthName ? `<li><strong>Length:</strong> ${booking.lengthName}</li>` : ''}
            ${booking.washingAddon ? `<li><strong>Add-on:</strong> Washing Service</li>` : ''}
            ${booking.takeDownAddon ? `<li><strong>Add-on:</strong> Take Down Service</li>` : ''}
            <li><strong>Duration:</strong> ${booking.duration}</li>
            <li><strong>When:</strong> ${booking.date} at ${booking.time}</li>
        </ul>
    </div>

    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Payment Summary</h2>
        <p><strong>Amount Paid:</strong> ${booking.amountPaidLabel}</p>
        <p><strong>Payment Choice:</strong> ${booking.paymentChoice === 'deposit' ? 'Deposit Only' : 'Full Payment'}</p>
        <p><strong>Method:</strong> ${booking.provider}</p>
    </div>

    <h2 style="font-size: 16px;">Important Policies</h2>
    <ul style="color: #666; font-size: 14px;">
        <li>${DEPOSIT_POLICY}</li>
        <li>${CANCELLATION_POLICY}</li>
    </ul>

    <p style="margin-top: 30px; font-size: 14px; color: #888;">
        Location: Dedes Braids, Manor, TX<br>
        Questions? Reply to this email or call us.
    </p>
</div>
`;

    return { subject, text, html };
}

export function buildProviderConfirmationEmail(booking: ConfirmedBooking): EmailData {
    const subject = `New Booking: ${booking.clientName} - ${booking.styleName}`;

    const text = `
Dede, you have a new appointment!

Client Details:
- Name: ${booking.clientName}
- Email: ${booking.clientEmail}
- Phone: ${booking.clientPhone}

Service Details:
- Style: ${booking.styleName} (${booking.duration})
- Date: ${booking.date}
- Time: ${booking.time}

Payment Info:
- Choice: ${booking.paymentChoice}
- Amount: ${booking.amountPaidLabel}
- Provider: ${booking.provider}
`;

    const html = `
<div style="font-family: sans-serif; line-height: 1.5; color: #333;">
    <h1 style="color: #a319c5;">New Appointment Alert</h1>
    <p>You have a new booking from <strong>${booking.clientName}</strong>.</p>
    
    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Client Info</h2>
        <p><strong>Name:</strong> ${booking.clientName}</p>
        <p><strong>Email:</strong> ${booking.clientEmail}</p>
        <p><strong>Phone:</strong> ${booking.clientPhone}</p>
    </div>

    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Service Details</h2>
        <p><strong>Style:</strong> ${booking.styleName}</p>
        ${booking.sizeName ? `<p><strong>Size:</strong> ${booking.sizeName}</p>` : ''}
        ${booking.lengthName ? `<p><strong>Length:</strong> ${booking.lengthName}</p>` : ''}
        ${booking.washingAddon ? `<p><strong>Add-on:</strong> Washing Service</p>` : ''}
        ${booking.takeDownAddon ? `<p><strong>Add-on:</strong> Take Down Service</p>` : ''}
        <p><strong>Duration:</strong> ${booking.duration}</p>
        <p><strong>When:</strong> ${booking.date} at ${booking.time}</p>
    </div>

    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Payment Details</h2>
        <p><strong>Choice:</strong> ${booking.paymentChoice}</p>
        <p><strong>Amount Collected:</strong> ${booking.amountPaidLabel}</p>
        <p><strong>Provider:</strong> ${booking.provider}</p>
    </div>
</div>
`;

    return { subject, text, html };
}

export function buildReminderEmail(booking: any): EmailData {
    const subject = `Reminder: Your appointment tomorrow at Dede's Braids`;
    
    // Fallback logic for date/time if coming from Firestore doc directly
    const dateStr = booking.date;
    const timeStr = booking.time;
    const clientName = booking.clientName || booking.name || "Client";

    const text = `
Hello ${clientName},

This is a friendly reminder for your braiding appointment tomorrow!

Details:
- Service: ${booking.styleName || booking.service}
- Time: ${timeStr}
- Date: ${dateStr}

Location: Dede's Braids, Manor, TX

If you need to reschedule or cancel, please let us know at least 24 hours in advance as per our policy.

We look forward to seeing you!
`;

    const html = `
<div style="font-family: sans-serif; line-height: 1.5; color: #333;">
    <h1 style="color: #a319c5;">Appointment Tomorrow!</h1>
    <p>Hello <strong>${clientName}</strong>,</p>
    <p>We're looking forward to your appointment tomorrow at Dede's Braids.</p>
    
    <div style="background: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">Appointment Reminder</h2>
        <ul style="list-style: none; padding: 0;">
            <li><strong>Service:</strong> ${booking.styleName || booking.service}</li>
            <li><strong>When:</strong> ${dateStr} at ${timeStr}</li>
            <li><strong>Location:</strong> Dede's Braids, Manor, TX</li>
        </ul>
    </div>

    <p style="font-size: 14px; color: #666;">
        If you need to reschedule, please refer to our <a href="https://dedesbraids.com/policies" style="color: #a319c5;">cancellation policy</a>.
    </p>

    <p style="margin-top: 30px; font-size: 14px; color: #888;">
        Dedes Braids, Manor, TX<br>
        Questions? Reply to this email.
    </p>
</div>
`;

    return { subject, text, html };
}
