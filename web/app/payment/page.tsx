import Link from "next/link";

export default function PaymentPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-icons text-green-600 dark:text-green-400 text-4xl">check_circle</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                    Booking Confirmed!
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Your appointment at MHDESIGNS&apos;s Braids is all set. We can&apos;t wait to see you!
                </p>
            </div>

            {/* Appointment Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-[#9F2D5C]/10 mb-8">
                <h2 className="text-xl font-bold mb-6">Appointment Details</h2>
                <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Service</span>
                        <span className="font-semibold">Small Knotless Braids</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Date</span>
                        <span className="font-semibold">March 15, 2024</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Time</span>
                        <span className="font-semibold">10:00 AM</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Duration</span>
                        <span className="font-semibold">4h 30m</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold">
                        <span>Total</span>
                        <span className="text-[#9F2D5C]">$180</span>
                    </div>
                </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-[#9F2D5C]/10 mb-8">
                <h2 className="text-xl font-bold mb-6">Salon Location</h2>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#9F2D5C]/10 flex items-center justify-center rounded-xl text-[#9F2D5C] flex-shrink-0">
                        <span className="material-icons">location_on</span>
                    </div>
                    <div>
                        <p className="font-bold">MHDESIGNS&apos;s Braids Salon</p>
                        <p className="text-slate-600 dark:text-slate-400">
                            123 Braid Ave, Suite 100
                            <br />
                            New York, NY 10001
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">(555) 123-4567</p>
                    </div>
                </div>
            </div>

            {/* Next Steps */}
            <div className="bg-[#9F2D5C]/5 rounded-2xl p-8 mb-8">
                <h2 className="text-xl font-bold mb-4">What&apos;s Next?</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-3">
                        <span className="material-icons text-[#9F2D5C] text-sm mt-0.5">check</span>
                        <span>You&apos;ll receive a confirmation email with all the details</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="material-icons text-[#9F2D5C] text-sm mt-0.5">check</span>
                        <span>We&apos;ll send you a reminder 24 hours before your appointment</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="material-icons text-[#9F2D5C] text-sm mt-0.5">check</span>
                        <span>Please arrive 10 minutes early to complete any necessary paperwork</span>
                    </li>
                </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/"
                    className="flex-1 bg-[#9F2D5C] text-white font-bold py-4 rounded-xl hover:bg-[#9F2D5C]/90 transition-all text-center"
                >
                    Back to Home
                </Link>
                <Link
                    href="/contact"
                    className="flex-1 bg-white dark:bg-slate-800 border border-[#9F2D5C]/20 font-bold py-4 rounded-xl hover:border-[#9F2D5C] transition-all text-center"
                >
                    Contact Us
                </Link>
            </div>
        </main>
    );
}
