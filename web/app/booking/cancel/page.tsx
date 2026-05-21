"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui";

function CancelPageInner() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-slate-50 dark:bg-slate-900/10">
            {/* Warning Icon */}
            <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-10 shadow-xl shadow-amber-500/5">
                <span className="material-icons text-amber-500 text-5xl">error_outline</span>
            </div>

            <div className="max-w-md w-full text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">
                    Checkout Canceled
                </h1>

                <div className="bg-white dark:bg-slate-800/60 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none mb-10">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                        Your payment session was cancelled. <strong className="text-slate-900 dark:text-white">No charge has been made</strong> to your account.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
                        Don&apos;t worry—your booking draft is still safe. You can pick up right where you left off or make adjustments to your appointment.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <Link href="/checkout">
                        <Button className="w-full py-6 rounded-2xl shadow-lg shadow-[#a319c5]/20">
                            <span className="material-icons text-base mr-2">refresh</span>
                            Return to Checkout
                        </Button>
                    </Link>
                    <Link href="/book">
                        <Button variant="secondary" className="w-full py-6 rounded-2xl">
                            <span className="material-icons text-base mr-2">edit_calendar</span>
                            Edit Booking Details
                        </Button>
                    </Link>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/5">
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Having trouble with payment? <Link href="/contact" className="text-[#a319c5] font-bold hover:underline">Contact us</Link> and we can help you finalize your booking.
                    </p>
                </div>
            </div>
        </main>
    );
}

export default function CancelPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-icons animate-spin text-[#a319c5] text-4xl">autorenew</span>
            </div>
        }>
            <CancelPageInner />
        </Suspense>
    );
}

