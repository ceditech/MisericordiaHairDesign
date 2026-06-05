"use client";

import React, { useState, useEffect } from "react";
import { subscribeToBookings, cancelBooking } from "@/src/lib/firebase/ownerService";
import { Button, Card, Badge } from "@/components/ui";
import { Calendar, User, Clock, Scissors, XCircle, CheckCircle, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function BookingsTab() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeToBookings((data) => {
            setBookings(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleCancel = async (id: string) => {
        if (confirm("Are you sure you want to cancel this booking?")) {
            try {
                await cancelBooking(id);
                alert("Booking cancelled successfully.");
            } catch (err) {
                console.error("Error cancelling booking:", err);
            }
        }
    };

    const filteredBookings = bookings.filter(b => 
        b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.styleName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
            case "completed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        }
    };

    if (loading) return <div className="p-8 text-center font-bold">Loading bookings...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Bookings</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{bookings.length}</h3>
                </Card>
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Confirmed</p>
                    <h3 className="text-3xl font-black text-emerald-500">
                        {bookings.filter(b => b.status === "confirmed").length}
                    </h3>
                </Card>
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cancelled</p>
                    <h3 className="text-3xl font-black text-red-500">
                        {bookings.filter(b => b.status === "cancelled").length}
                    </h3>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-[#9F2D5C] text-sm"
                        placeholder="Search by name, email or style..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {filteredBookings.map((booking) => (
                    <Card key={booking.id} className="p-6 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2rem] hover:shadow-xl transition-all group">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-[#9F2D5C]/10 text-[#9F2D5C] flex items-center justify-center shrink-0">
                                    <Scissors size={28} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                            {booking.styleName}
                                        </h4>
                                        <Badge className={`uppercase text-[10px] font-black tracking-widest ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                        <span className="flex items-center gap-2"><User size={14} className="text-[#9F2D5C]" /> {booking.clientName}</span>
                                        <span className="flex items-center gap-2"><Calendar size={14} className="text-[#9F2D5C]" /> {booking.date}</span>
                                        <span className="flex items-center gap-2"><Clock size={14} className="text-[#9F2D5C]" /> {booking.time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-auto sm:ml-0">
                                <div className="text-right mr-4 hidden sm:block">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount Paid</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">${(booking.amountPaidCents / 100).toFixed(2)}</p>
                                </div>
                                {booking.status === "confirmed" && (
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => handleCancel(booking.id)}
                                        className="rounded-xl bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white transition-all font-bold gap-2"
                                    >
                                        <XCircle size={16} />
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}

                {filteredBookings.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <Calendar size={48} className="mx-auto text-slate-300 mb-6" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No bookings found</h2>
                    </div>
                )}
            </div>
        </div>
    );
}
