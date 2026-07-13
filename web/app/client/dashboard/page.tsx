"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { getUserBookingHistory, BookingRecord } from "@/src/lib/firebase/userBookings";
import { Card, Button, Badge } from "@/components/ui";
import { 
    Calendar, Clock, User, LogOut, ChevronRight,
    MapPin, Sparkles, Scissors, AlertCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ClientDashboardPage() {
    const { user, profile, loading, signOut } = useAuth();
    const [upcoming, setUpcoming] = useState<BookingRecord[]>([]);
    const [past, setPast] = useState<BookingRecord[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            fetchBookings(user.uid);
        } else if (!loading && !user) {
            setFetching(false);
        }
    }, [loading, user]);

    const fetchBookings = async (uid: string) => {
        setFetching(true);
        try {
            const data = await getUserBookingHistory(uid);
            setUpcoming(data.upcoming);
            setPast(data.past);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setFetching(false);
        }
    };

    if (loading || fetching) {
        return (
            <main className="min-h-screen pt-32 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center justify-center">
                <RefreshCw size={40} className="text-[#9F2D5C] animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading your dashboard...</p>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="min-h-screen pt-32 pb-20 px-6 max-w-2xl mx-auto text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-8">
                    <User size={48} />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter italic">
                    Welcome Back
                </h1>
                <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
                    Please log in to view your bookings, reschedule appointments, and manage your profile.
                </p>
                <Link
                    href="/shop/login?redirect=/client/dashboard"
                    className="inline-flex bg-[#9F2D5C] hover:bg-[#B8326A] text-white py-4 px-8 rounded-2xl items-center gap-3 font-black transition-all active:scale-[0.98]"
                >
                    Sign In
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-6 text-center sm:text-left">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#9F2D5C] to-indigo-500 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/20 shrink-0">
                        {profile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                            Hello, {profile?.firstName || "Beautiful"}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {user.email}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-500 hover:text-white hover:bg-red-500 rounded-2xl font-bold transition-colors"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Upcoming Bookings */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="text-amber-500" />
                                Upcoming Appointments
                            </h2>
                            <Badge className="bg-[#9F2D5C]/10 text-[#9F2D5C]">
                                {upcoming.length} Next
                            </Badge>
                        </div>

                        {upcoming.length === 0 ? (
                            <Card className="p-12 text-center border-dashed rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50">
                                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Calendar size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    No upcoming appointments
                                </h3>
                                <p className="text-slate-500 mb-6">
                                    Ready for a fresh look? Book your next braiding session with us today.
                                </p>
                                <Link
                                    href="/book"
                                    className="inline-flex bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 px-6 rounded-xl font-bold hover:scale-105 transition-transform"
                                >
                                    Book Now
                                </Link>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {upcoming.map((booking) => (
                                    <UpcomingBookingCard key={booking.id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past Bookings */}
                    {past.length > 0 && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                                Recent History
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {past.map((booking) => (
                                    <PastBookingCard key={booking.id} booking={booking} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Quick Links & Info */}
                <div className="space-y-6">
                    <Card className="p-6 rounded-3xl bg-gradient-to-br from-[#9F2D5C] to-indigo-600 text-white shadow-xl shadow-indigo-500/20 border-none overflow-hidden relative">
                        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 blur-3xl rounded-full" />
                        <h3 className="text-xl font-black mb-2 relative z-10 italic">Rewards & Loyalty</h3>
                        <p className="text-white/80 mb-6 text-sm relative z-10">
                            Every style earns you points toward your next visit. Keep glowing!
                        </p>
                        <div className="flex items-center gap-2 relative z-10">
                            <Sparkles size={20} className="text-amber-300" />
                            <span className="font-bold">Coming Soon</span>
                        </div>
                    </Card>

                    <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin size={18} className="text-slate-400" />
                            Location Details
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-4">
                            MHDESIGNS&apos;s Braids Studio<br />
                            123 Beauty Avenue<br />
                            Braid City, NY 10001
                        </p>
                        <a href="#" className="text-sm font-bold text-[#9F2D5C] hover:underline">
                            Get Directions
                        </a>
                    </Card>
                </div>
            </div>
        </main>
    );
}

function UpcomingBookingCard({ booking }: { booking: BookingRecord }) {
    return (
        <Card className="p-6 sm:p-8 rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#9F2D5C]" />
            <div className="flex flex-col sm:flex-row gap-6 relative">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${
                            booking.status === "confirmed" 
                            ? "bg-emerald-500/10 text-emerald-600" 
                            : "bg-amber-500/10 text-amber-600"
                        } uppercase tracking-widest text-[10px] sm:text-xs font-black border-none px-3 py-1`}>
                            {booking.status}
                        </Badge>
                        <span className="text-sm text-slate-400 font-medium font-mono">
                            ID: {booking.id.slice(0, 8)}
                        </span>
                    </div>
                    
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-4">
                        {booking.styleName || "Hair Braiding Session"}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                            <Calendar size={18} className="text-[#9F2D5C]" />
                            <span className="font-bold text-sm sm:text-base">{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                            <Clock size={18} className="text-[#9F2D5C]" />
                            <span className="font-bold text-sm sm:text-base">{booking.time}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 justify-center border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-6 shrink-0 mt-2 sm:mt-0">
                    <button className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-sm">
                        View Details
                    </button>
                    <button className="w-full sm:w-auto bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold hover:border-[#9F2D5C] hover:text-[#9F2D5C] transition-all text-sm flex items-center justify-center gap-2">
                        Reschedule
                    </button>
                </div>
            </div>
        </Card>
    );
}

function PastBookingCard({ booking }: { booking: BookingRecord }) {
    return (
        <Card className="p-5 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">
                        {booking.styleName || "Hair Service"}
                    </h4>
                    <Scissors size={16} className="text-slate-400 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {booking.date.split(",")[0] || booking.date}</span>
                </div>
            </div>
            <button className="text-left text-sm font-bold text-[#9F2D5C] hover:underline w-max">
                Book Again
            </button>
        </Card>
    );
}
