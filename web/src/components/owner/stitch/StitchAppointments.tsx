"use client";

import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/src/lib/firebase/client";
import { Calendar, Search, ChevronRight, X, CheckCircle, XCircle, Clock, Filter, TrendingUp, DollarSign, Ban, ReceiptText } from "lucide-react";

type Booking = {
    id: string;
    clientName?: string;
    name?: string;
    clientEmail?: string;
    email?: string;
    service?: string;
    styleId?: string;
    styleName?: string;
    date?: string;
    time?: string;
    status?: string;
    depositPaid?: boolean;
    paymentChoice?: string;
    amountPaidCents?: number;
    totalCents?: number;
    amountCents?: number;
    priceCents?: number;
    taxCents?: number;
    pricing?: {
        totalCents?: number;
        depositCents?: number;
        taxCents?: number;
        amountDueCents?: number;
    };
    createdAt?: any;
};

const STATUS_OPTIONS = ["all", "upcoming", "confirmed", "pending", "cancelled", "completed"];

function statusColor(status?: string) {
    switch ((status || "").toLowerCase()) {
        case "confirmed":
        case "upcoming": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
        case "pending": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
        case "cancelled": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
        case "completed": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
        default: return "bg-slate-100 dark:bg-slate-800 text-slate-500";
    }
}

function formatDate(ts: any): string {
    if (!ts) return "—";
    try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return "—"; }
}

export default function StitchAppointments() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selected, setSelected] = useState<Booking | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const { subscribeToBookings } = require("@/src/lib/firebase/ownerService");
        const unsub = subscribeToBookings((data: Booking[]) => {
            setBookings(data);
            if (data.length > 0 && !selected) setSelected(data[0]);
            setLoading(false);
        });
        return () => unsub();
    }, [selected]);

    const updateStatus = async (id: string, status: string) => {
        setUpdating(true);
        try {
            const db = getDb();
            await updateDoc(doc(db, "bookings", id), { status, updatedAt: serverTimestamp() });
            setSelected(prev => prev ? { ...prev, status } : prev);
        } catch (err) { console.error(err); }
        finally { setUpdating(false); }
    };

    const filtered = bookings.filter(b => {
        const name = (b.clientName || b.name || "").toLowerCase();
        const email = (b.clientEmail || b.email || "").toLowerCase();
        const q = search.toLowerCase();
        const matchSearch = !search || name.includes(q) || email.includes(q) || b.id.includes(q);
        const matchStatus = statusFilter === "all" || (b.status || "").toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
    });

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading appointments...</div>;

    const TAX_RATE = 0.0825; // System Tax Rate

    // --- Analytics Calculations ---
    const stats = {
        potentialRevenue: bookings
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => sum + (b.totalCents || b.amountCents || b.priceCents || b.pricing?.totalCents || 0), 0) / 100,
        
        securedRevenue: bookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => {
                const amount = (b as any).isSeedData 
                    ? (b.totalCents || b.amountCents || b.priceCents || 0)
                    : (b.amountPaidCents || b.pricing?.amountDueCents || b.pricing?.depositCents || 0);
                return sum + amount;
            }, 0) / 100,
            
        cancelledCount: bookings.filter(b => b.status === 'cancelled').length,
    };

    // Calculate taxes based on the revenue stats
    const taxes = {
        potential: stats.potentialRevenue * TAX_RATE,
        secured: stats.securedRevenue * TAX_RATE
    };


    const StatCard = ({ label, value, icon, color }: any) => (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-opacity-100 shrink-0 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {typeof value === 'number' && label.includes('Revenue') || label.includes('Taxes') ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : value}
                </h3>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">Appointments</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{bookings.length} total bookings on file.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    label="Potential Revenue" 
                    value={stats.potentialRevenue} 
                    icon={<TrendingUp size={24} />} 
                    color="bg-purple-500 text-purple-600"
                />
                <StatCard 
                    label="Secured Revenue" 
                    value={stats.securedRevenue} 
                    icon={<DollarSign size={24} />} 
                    color="bg-emerald-500 text-emerald-600"
                />
                <StatCard 
                    label="Cancelled" 
                    value={stats.cancelledCount} 
                    icon={<Ban size={24} />} 
                    color="bg-red-500 text-red-600"
                />
                <StatCard 
                    label="Taxes Collected" 
                    value={taxes.secured} 
                    icon={<ReceiptText size={24} />} 
                    color="bg-blue-500 text-blue-600"
                />
            </div>
            {/* Tax Sub-info */}
            <div className="flex gap-6 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-fit">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Secured Tax: <span className="text-emerald-500">${taxes.secured.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 self-center" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Potential Tax: <span className="text-purple-500">${taxes.potential.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* List */}
                <div className="flex-1 space-y-4 min-w-0">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-sm focus:ring-2 focus:ring-[#e9ddff] text-slate-900 dark:text-white"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#e9ddff] capitalize"
                        >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        {filtered.length === 0 && (
                            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="font-bold text-slate-500">No appointments match your filters.</p>
                            </div>
                        )}
                        {filtered.map(booking => {
                            const isSelected = selected?.id === booking.id;
                            const clientName = booking.clientName || booking.name || "Client";
                            const clientEmail = booking.clientEmail || booking.email || "—";
                            return (
                                <div
                                    key={booking.id}
                                    onClick={() => setSelected(booking)}
                                    className={`group bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border transition-all cursor-pointer ${isSelected ? "border-[#6b38d4] shadow-lg shadow-[#6b38d4]/10" : "border-slate-100 dark:border-slate-800 hover:shadow-md"}`}
                                >
                                    <div className="flex items-center gap-4 justify-between">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-[#e9ddff] dark:bg-slate-800 flex items-center justify-center text-[#6b38d4] dark:text-[#d0bcff] font-bold text-lg shrink-0">
                                                {clientName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{clientName}</p>
                                                <p className="text-xs text-slate-400 truncate">{clientEmail}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{booking.date || formatDate(booking.createdAt)}</p>
                                                <p className="text-xs text-slate-400">{booking.time || ""}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${statusColor(booking.status)}`}>
                                                {booking.status || "pending"}
                                            </span>
                                            <button className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-[#6b38d4] hover:bg-[#e9ddff] transition-all">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail Panel */}
                <aside className="w-full lg:w-[380px] bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-[#6b38d4]/5 p-8 self-start sticky top-24">
                    {!selected ? (
                        <div className="py-12 text-center">
                            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-400 font-medium text-sm">Select an appointment to view details</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-extrabold font-headline text-slate-900 dark:text-white">Details</h2>
                                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                            </div>
                            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div className="w-14 h-14 rounded-full bg-[#e9ddff] dark:bg-slate-700 flex items-center justify-center text-[#6b38d4] font-bold text-xl">
                                    {(selected.clientName || selected.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{selected.clientName || selected.name || "Client"}</p>
                                    <p className="text-xs text-slate-400">{selected.clientEmail || selected.email || "—"}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {[
                                    { label: "Service", value: selected.styleName || selected.service || selected.styleId || "—" },
                                    { label: "Date", value: selected.date || formatDate(selected.createdAt) },
                                    { label: "Time", value: selected.time || "—" },
                                    { label: "Status", value: selected.status || "pending" },
                                    { 
                                        label: "Deposit Paid", 
                                        value: selected.paymentChoice === 'full' 
                                            ? "Full Payment" 
                                            : (selected.amountPaidCents || selected.pricing?.amountDueCents)
                                                ? `$${((selected.amountPaidCents || selected.pricing?.amountDueCents || 0) / 100).toFixed(2)}`
                                                : (selected as any).isSeedData && selected.status !== 'pending'
                                                    ? "Yes (Seed)"
                                                    : selected.depositPaid ? "Yes" : "No"
                                    },
                                    { label: "Total", value: (selected.totalCents || selected.amountCents || selected.priceCents || selected.pricing?.totalCents) ? `$${((selected.totalCents || selected.amountCents || selected.priceCents || selected.pricing?.totalCents || 0) / 100).toFixed(2)}` : "—" },
                                ].map(item => (
                                    <div key={item.label} className="flex justify-between text-sm">
                                        <span className="text-slate-400 font-medium">{item.label}</span>
                                        <span className="font-bold text-slate-900 dark:text-white capitalize">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        disabled={updating}
                                        onClick={() => updateStatus(selected.id, "confirmed")}
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-extrabold hover:bg-emerald-200 transition-all disabled:opacity-50"
                                    >
                                        <CheckCircle size={14} />
                                        Confirm
                                    </button>
                                    <button
                                        disabled={updating}
                                        onClick={() => updateStatus(selected.id, "completed")}
                                        className="flex items-center justify-center gap-2 py-3 px-4 bg-[#6b38d4] text-white rounded-full text-xs font-extrabold hover:-translate-y-0.5 transition-all shadow-lg shadow-[#6b38d4]/20 disabled:opacity-50"
                                    >
                                        <CheckCircle size={14} />
                                        Complete
                                    </button>
                                </div>
                                <button
                                    disabled={updating}
                                    onClick={() => updateStatus(selected.id, "cancelled")}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all disabled:opacity-50"
                                >
                                    <XCircle size={14} />
                                    Cancel Appointment
                                </button>
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
