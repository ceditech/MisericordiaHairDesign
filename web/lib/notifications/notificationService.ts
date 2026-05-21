import { ConfirmedBooking } from "@/lib/bookingDraft";

/**
 * Mock Notification Service
 * In production, this would call /api/notifications or similar.
 */
export async function sendBookingConfirmation(booking: ConfirmedBooking): Promise<{ ok: true }> {
    console.log("[NotificationService] Simulating sending confirmation emails...", {
        to: booking.clientEmail,
        cc: "dedesbraids@example.com (Provider)"
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Optional: Placeholder for future backend integration
    // await fetch('/api/notifications/booking-confirmation', {
    //   method: 'POST',
    //   body: JSON.stringify(booking)
    // });

    return { ok: true };
}
