import type { ReactNode } from "react";
import { ReviewSummary } from "@/components/book/ReviewSummary";
import type { BookingFormData } from "@/src/lib/bookings/useBookingDraft";

interface ReviewStepProps {
    styleName?: string;
    styleDuration?: string;
    bookingData: BookingFormData;
    customization: ReactNode;
}

export function ReviewStep({ styleName, styleDuration, bookingData, customization }: ReviewStepProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">Review Appointment</h2>
            <ReviewSummary
                styleName={styleName}
                styleDuration={styleDuration}
                date={bookingData.date}
                time={bookingData.time}
                name={bookingData.name}
                email={bookingData.email}
                phone={bookingData.phone}
                photoPreview={bookingData.photoPreview}
            />

            {customization}
        </div>
    );
}
