import Link from "next/link";

export function NoBookingState() {
    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-20">
            <div className="w-20 h-20 rounded-3xl bg-[#9F2D5C]/10 flex items-center justify-center mb-8 shadow-xl shadow-[#9F2D5C]/10">
                <span className="material-icons text-[#9F2D5C] text-3xl">calendar_today</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">No Booking Found</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed">
                It looks like you haven&apos;t completed a booking yet, or your session expired.
                Head back to the booking page to get started.
            </p>
            <Link
                href="/book"
                className="bg-[#9F2D5C] hover:bg-[#B8326A] text-white font-bold px-10 py-5 rounded-full shadow-2xl shadow-[#9F2D5C]/30 transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-3"
            >
                <span className="material-icons text-base">arrow_back</span>
                Start a Booking
            </Link>
        </main>
    );
}
