"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { loadConfirmedBooking, ConfirmedBooking, clearDraft } from "@/lib/bookingDraft";
import { BRAID_STYLES } from "@/lib/styles";
import { buildIcs, downloadIcs } from "@/lib/calendar/ics";
import { sendBookingConfirmation } from "@/lib/notifications/notificationService";
import { buildClientConfirmationEmail, buildProviderConfirmationEmail } from "@/lib/notifications/emailTemplates";
import { Modal, useToast, Button, Badge } from "@/components/ui";
import { getDb } from "@/src/lib/firebase/client";
import { getDoc, doc } from "firebase/firestore";

function SuccessPageInner() {
    const searchParams = useSearchParams();
    const draftId = searchParams.get("draftId");
    const { showToast } = useToast();
    const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [activeEmailTab, setActiveEmailTab] = useState<"client" | "provider">("client");

    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 2000;
        
        const fetchBooking = async () => {
            // 1. First try localStorage (immediate)
            const localData = loadConfirmedBooking();
            if (localData && isMounted) {
                setBooking(localData);
                clearDraft();
            }

            // 2. Then try secure API if we have a draftId
            if (draftId) {
                const attemptFetch = async () => {
                    try {
                        const response = await fetch(`/api/bookings/confirmation?draftId=${draftId}`);
                        
                        if (response.ok && isMounted) {
                            const firestoreBooking = await response.json();
                            setBooking(firestoreBooking);
                            clearDraft();
                            if (isMounted) setLoading(false);
                            
                            // 3. Trigger confirmation notification (BFF handled)
                            // We do this after positive confirmation from server.
                            sendBookingConfirmation(firestoreBooking).then(() => {
                                if (isMounted) showToast("Confirmation email sent!", "success");
                            });
                            return; 
                        }
                        
                        // If not found, it might be the webhook delay
                        if (response.status === 404 && retryCount < MAX_RETRIES && isMounted) {
                            retryCount++;
                            console.log(`[Booking Success] Not found yet, retrying ${retryCount}/${MAX_RETRIES}...`);
                            setTimeout(attemptFetch, RETRY_DELAY);
                            return;
                        }
                    } catch (err) {
                        console.error("[Booking Success] API load failed:", err);
                    }
                    if (isMounted) setLoading(false);
                };

                attemptFetch();
            } else {
                if (isMounted) setLoading(false);
            }
        };

        fetchBooking();
        return () => { isMounted = false; };
    }, [draftId, showToast]);

    if (loading && !booking) {
        return (
            <main className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20">
                <div className="w-16 h-16 border-4 border-[#9F2D5C] border-t-transparent rounded-full animate-spin mb-6"></div>
                <h1 className="text-xl font-medium text-slate-600 dark:text-slate-400">Confirming your booking...</h1>
            </main>
        );
    }

    if (!booking) {
        return (
            <main className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                    <span className="material-icons text-slate-400 text-4xl">search_off</span>
                </div>
                <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Booking Not Found</h1>
                <p className="text-slate-500 text-center max-w-xs mb-8">
                    We couldn&apos;t find your recent booking details. If you just completed a payment, please check your email.
                </p>
                <Link href="/book">
                    <Button>Start New Booking</Button>
                </Link>
            </main>
        );
    }

    const style = BRAID_STYLES.find(s => s.name === booking.styleName);
    const refId = draftId ? `DB-${draftId.slice(-6).toUpperCase()}` : "DB-PENDING";

    const handleDownloadCalendar = () => {
        const icsContent = buildIcs({
            title: `Braiding Appointment: ${booking.styleName}`,
            description: `Appointment for ${booking.clientName} at Dede's Braids.`,
            location: "Dede's Braids, Manor, TX",
            startISO: `${booking.date} ${booking.time}`,
            durationMins: style?.duration.includes("8-12") ? 600 : 300 // estimate
        });
        downloadIcs("appointment.ics", icsContent);
        showToast("Calendar invite downloaded", "info");
    };

    const clientEmail = buildClientConfirmationEmail(booking);
    const providerEmail = buildProviderConfirmationEmail(booking);

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center mb-12">
                <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8 animate-in zoom-in duration-500">
                    <span className="material-icons text-white text-4xl font-bold">check</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 text-center">
                    Booking Confirmed!
                </h1>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm font-medium">Ref:</span>
                    <Badge variant="default" className="font-mono text-xs">{refId}</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Summary and Actions */}
                <div className="lg:col-span-12 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Summary Card */}
                        <div className="bg-surface p-8 rounded-[2rem] border border-border shadow-xl shadow-brand-primary/5">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-icons text-brand-primary">bookmark</span>
                                Appointment Summary
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between py-3 border-b border-border">
                                    <span className="text-text-muted text-sm font-medium">Service</span>
                                    <span className="font-bold text-text-primary">{booking.styleName}</span>
                                </div>
                                {booking.sizeName && (
                                    <div className="flex justify-between py-3 border-b border-border">
                                        <span className="text-text-muted text-sm font-medium">Size</span>
                                        <span className="font-bold text-text-primary">{booking.sizeName}</span>
                                    </div>
                                )}
                                {booking.lengthName && (
                                    <div className="flex justify-between py-3 border-b border-border">
                                        <span className="text-text-muted text-sm font-medium">Length</span>
                                        <span className="font-bold text-text-primary">{booking.lengthName}</span>
                                    </div>
                                )}
                                {booking.washingAddon && (
                                    <div className="flex justify-between py-3 border-b border-border">
                                        <span className="text-text-muted text-sm font-medium">Add-on</span>
                                        <span className="font-bold text-text-primary">Washing Service</span>
                                    </div>
                                )}
                                {booking.takeDownAddon && (
                                    <div className="flex justify-between py-3 border-b border-border">
                                        <span className="text-text-muted text-sm font-medium">Add-on</span>
                                        <span className="font-bold text-text-primary">Take Down Service</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-3 border-b border-border">
                                    <span className="text-text-muted text-sm font-medium">Date</span>
                                    <span className="font-bold text-text-primary">{booking.date}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-border">
                                    <span className="text-text-muted text-sm font-medium">Time</span>
                                    <span className="font-bold text-text-primary">{booking.time}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4">
                                    <span className="text-brand-primary text-sm font-bold uppercase tracking-wider">Paid Today</span>
                                    <span className="text-2xl font-black text-brand-primary">{booking.amountPaidLabel}</span>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-3">
                                <Button
                                    onClick={handleDownloadCalendar}
                                    className="rounded-2xl py-4 justify-center"
                                >
                                    <span className="material-icons text-xl">event_available</span>
                                    Add to Calendar
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsEmailModalOpen(true)}
                                    className="rounded-2xl py-4 justify-center"
                                >
                                    <span className="material-icons text-xl">visibility</span>
                                    Email Preview
                                </Button>
                            </div>
                        </div>

                        {/* Prep Checklist Card */}
                        <div className="bg-brand-primary/5 p-8 rounded-[2rem] border border-brand-primary/20">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-brand-primary">
                                <span className="material-icons font-bold">assignment</span>
                                Before You Arrive
                            </h2>
                            <ul className="space-y-4">
                                {(style?.prepChecklist ?? []).map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
                                        <span className="material-icons text-emerald-500 text-base font-bold flex-shrink-0">check_circle</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8 pt-6 border-t border-brand-primary/10 text-xs text-text-muted italic">
                                * Failure to follow prep steps may result in increased service time or rescheduling.
                            </div>
                        </div>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4 py-8">
                        <Link href="/book">
                            <Button variant="ghost" className="px-10 py-5">
                                Book Another Appointment
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="ghost" className="px-10 py-5">
                                Need Changes? Contact Support
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Email Preview Modal */}
            <Modal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                title="Email Confirmations Sent"
                className="max-w-2xl"
            >
                <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                    <button
                        onClick={() => setActiveEmailTab("client")}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeEmailTab === "client" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Client Email
                    </button>
                    <button
                        onClick={() => setActiveEmailTab("provider")}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all ${activeEmailTab === "provider" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Provider Email
                    </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">Subject</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                            {activeEmailTab === "client" ? clientEmail.subject : providerEmail.subject}
                        </p>
                    </div>
                    <div className="p-8 max-h-[50vh] overflow-y-auto">
                        <div
                            dangerouslySetInnerHTML={{ __html: activeEmailTab === "client" ? clientEmail.html : providerEmail.html }}
                            className="bg-white p-8 rounded-xl shadow-sm border border-slate-100"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={() => setIsEmailModalOpen(false)} className="rounded-xl px-10">Done</Button>
                </div>
            </Modal>
        </main>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-icons animate-spin text-[#9F2D5C] text-4xl">autorenew</span>
            </div>
        }>
            <SuccessPageInner />
        </Suspense>
    );
}

