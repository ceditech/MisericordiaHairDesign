"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    subscribeToShopOrders,
    updateOrderStatus,
} from "@/src/lib/firebase/ownerService";
import {
    ShoppingBag,
    Filter,
    Download,
    ChevronRight,
    X,
    Search,
    Package,
    CreditCard,
    CheckCircle2,
    RotateCcw,
    Clock,
    AlertTriangle,
    Loader2,
} from "lucide-react";

type Order = {
    id: string;
    customerEmail?: string;
    customerName?: string;
    status?: string;
    fulfillmentStatus?: string;
    totalCents?: number;
    total?: number;
    items?: Array<{ name?: string; quantity?: number; price?: number; priceCents?: number; imageUrl?: string }>;
    paymentMethod?: string;
    createdAt?: any;
};

type FilterTab = "all" | "pending" | "completed" | "refunded";

function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(cents?: number, flat?: number): string {
    const amount = cents != null ? cents / 100 : (flat ?? 0);
    return `$${amount.toFixed(2)}`;
}

function statusBadge(status?: string, fulfillment?: string) {
    const s = (fulfillment || status || "").toLowerCase();
    if (s.includes("refund")) return { label: "Refunded", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (s.includes("fulfill") || s === "completed" || s === "delivered") return { label: "Fulfilled", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
    if (s === "paid" || s === "succeeded") return { label: "Paid", cls: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" };
    if (s.includes("pend")) return { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: status || "Unknown", cls: "bg-slate-100 text-slate-600" };
}

export default function StitchSales() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<FilterTab>("all");
    const [search, setSearch] = useState("");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const unsub = subscribeToShopOrders((data) => {
            setOrders(data as Order[]);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        let list = orders;
        if (tab !== "all") {
            list = list.filter(o => {
                const s = (o.fulfillmentStatus || o.status || "").toLowerCase();
                if (tab === "pending") return s.includes("pend") || s === "paid" || s === "succeeded";
                if (tab === "completed") return s.includes("fulfill") || s === "completed" || s === "delivered";
                if (tab === "refunded") return s.includes("refund");
                return true;
            });
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                (o.customerEmail || "").toLowerCase().includes(q) ||
                (o.customerName || "").toLowerCase().includes(q) ||
                o.id.toLowerCase().includes(q)
            );
        }
        return list;
    }, [orders, tab, search]);

    const totalRevenue = orders.reduce((acc, o) => {
        const s = (o.fulfillmentStatus || o.status || "").toLowerCase();
        if (s.includes("refund")) return acc;
        return acc + (o.totalCents != null ? o.totalCents / 100 : (o.total ?? 0));
    }, 0);

    const handleAction = async (orderId: string, status: string, fulfillment?: string) => {
        setActionLoading(true);
        try {
            await updateOrderStatus(orderId, status, fulfillment);
            setSelectedOrder(prev => prev ? { ...prev, status, fulfillmentStatus: fulfillment ?? prev.fulfillmentStatus } : prev);
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-[#6b38d4]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">Shop Sales</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your product orders and fulfillment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#6b38d4] font-semibold text-sm hover:bg-[#e9ddff] transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#eff4ff] dark:bg-slate-800 text-[#6b38d4] font-semibold text-sm hover:bg-[#e9ddff] transition-colors">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* KPI summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Orders", value: orders.length, cls: "" },
                    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, cls: "text-[#6b38d4]" },
                    { label: "Pending", value: orders.filter(o => { const s = (o.fulfillmentStatus || o.status || "").toLowerCase(); return s.includes("pend") || s === "paid" || s === "succeeded"; }).length, cls: "text-amber-600" },
                    { label: "Refunds", value: orders.filter(o => (o.fulfillmentStatus || o.status || "").toLowerCase().includes("refund")).length, cls: "text-red-500" },
                ].map(k => (
                    <div key={k.label} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
                        <p className={`text-3xl font-black font-headline ${k.cls || "text-slate-900 dark:text-white"}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex bg-[#eff4ff] dark:bg-slate-800 rounded-full p-1 gap-1">
                    {(["all", "pending", "completed", "refunded"] as FilterTab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-white dark:bg-slate-900 text-[#6b38d4] shadow-sm" : "text-slate-500 hover:text-[#6b38d4]"}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search orders..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6b38d4]"
                    />
                </div>
            </div>

            {/* Order list + Detail */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Orders list */}
                <div className="flex-1 space-y-4 min-w-0">
                    {filtered.length === 0 && (
                        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="font-bold text-slate-500">No orders found.</p>
                        </div>
                    )}
                    {filtered.map(order => {
                        const badge = statusBadge(order.status, order.fulfillmentStatus);
                        const total = order.totalCents != null ? order.totalCents / 100 : (order.total ?? 0);
                        const isRefund = badge.label === "Refunded";
                        const isSelected = selectedOrder?.id === order.id;
                        return (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className={`group bg-white dark:bg-slate-900 p-6 rounded-[1.75rem] border cursor-pointer transition-all hover:shadow-lg hover:shadow-[#6b38d4]/5 ${isSelected ? "border-[#6b38d4] ring-2 ring-[#6b38d4]/20" : isRefund ? "border-red-200 dark:border-red-900/40" : "border-slate-100 dark:border-slate-800"}`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isRefund ? "bg-red-50 dark:bg-red-900/30 text-red-500" : "bg-[#e9ddff] dark:bg-[#6b38d4]/20 text-[#6b38d4]"}`}>
                                            {isRefund ? <RotateCcw size={22} /> : <ShoppingBag size={22} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold font-headline text-slate-900 dark:text-white">#{order.id.slice(-6).toUpperCase()}</span>
                                                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider ${badge.cls}`}>{badge.label}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{order.customerEmail || order.customerName || "Unknown customer"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">{(order.items?.length ?? 0)} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}</p>
                                            <p className={`text-lg font-bold font-headline ${isRefund ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>{formatCurrency(order.totalCents, order.total)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <CreditCard size={12} /> {order.paymentMethod || "Stripe"}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-300 group-hover:text-[#6b38d4] transition-colors shrink-0" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Order detail panel */}
                {selectedOrder && (
                    <aside className="w-full lg:w-[400px] shrink-0 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-[#6b38d4]/5 p-8 self-start sticky top-24 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-extrabold font-headline text-slate-900 dark:text-white">Order Details</h2>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Customer */}
                        <div className="flex items-center gap-4 p-4 bg-[#eff4ff] dark:bg-slate-800 rounded-2xl">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6b38d4] to-[#fd56a7] flex items-center justify-center text-white font-bold text-lg shrink-0">
                                {(selectedOrder.customerName || selectedOrder.customerEmail || "?")[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerName || "Customer"}</p>
                                <p className="text-xs text-slate-500">{selectedOrder.customerEmail}</p>
                            </div>
                        </div>

                        {/* Items */}
                        {selectedOrder.items && selectedOrder.items.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Items Ordered ({selectedOrder.items.length})</p>
                                {selectedOrder.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-[#e9ddff] dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            {item.imageUrl
                                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full rounded-xl object-cover" />
                                                : <Package size={20} className="text-[#6b38d4]" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name || "Product"}</p>
                                            <p className="text-xs text-slate-400">Qty: {item.quantity ?? 1}</p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.priceCents, item.price)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Totals */}
                        <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedOrder.totalCents, selectedOrder.total)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Payment</span>
                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                    <CreditCard size={13} className="text-[#6b38d4]" /> {selectedOrder.paymentMethod || "Stripe"}
                                </span>
                            </div>
                            <div className="flex justify-between text-base pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-extrabold font-headline text-slate-900 dark:text-white">Total</span>
                                <span className="font-extrabold font-headline text-[#6b38d4]">{formatCurrency(selectedOrder.totalCents, selectedOrder.total)}</span>
                            </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${statusBadge(selectedOrder.status, selectedOrder.fulfillmentStatus).cls}`}>
                                {statusBadge(selectedOrder.status, selectedOrder.fulfillmentStatus).label}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Action</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction(selectedOrder.id, "paid", "ready")}
                                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#ffd9e4] dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300 text-xs font-extrabold hover:bg-fuchsia-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Clock size={14} /> Mark Ready
                                </button>
                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleAction(selectedOrder.id, "completed", "fulfilled")}
                                    className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#6b38d4] text-white text-xs font-extrabold shadow-lg shadow-[#6b38d4]/20 hover:translate-y-[-1px] transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Fulfilled
                                </button>
                            </div>
                            <button
                                disabled={actionLoading}
                                onClick={() => handleAction(selectedOrder.id, "refunded", "refunded")}
                                className="w-full py-3 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw size={14} /> Initiate Refund
                            </button>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Timeline</p>
                            <div className="relative space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                                        <CheckCircle2 size={12} className="text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Payment Captured</p>
                                    <p className="text-[10px] text-slate-400">{selectedOrder.paymentMethod || "Stripe"} • {formatDate(selectedOrder.createdAt)}</p>
                                </div>
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-6 h-6 bg-[#6b38d4] rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                                        <AlertTriangle size={12} className="text-white" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Order Confirmed</p>
                                    <p className="text-[10px] text-slate-400">Auto-generated</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
