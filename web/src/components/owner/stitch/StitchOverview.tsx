"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { getDb } from "@/src/lib/firebase/client";
import { 
    TrendingUp, 
    Calendar, 
    ShoppingBag, 
    Users, 
    ArrowRight, 
    Scissors, 
    Download, 
    Plus,
    Tag,
    Briefcase,
    Zap,
    MoreHorizontal,
    Bell,
    Settings,
    Database
} from "lucide-react";
import Link from "next/link";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { motion } from "framer-motion";
import { 
    useAggregateSales, 
    useBusinessTrends, 
    useTopPerformers, 
    useNewClientsCount,
    useConversionMetrics,
    useAffiliateMetrics
} from "@/src/lib/firebase/ownerService";
import { useAuth } from "@/src/hooks/useAuth";

// --- Types ---

interface DashboardStats {
    totalRevenue: number;
    bookingsCount: number;
    newClients: number;
    conversionRate: number;
    payoutsDue: number;
    serviceRevenue: number;
    shopRevenue: number;
}

interface ChartData {
    month: string;
    completed: number;
    cancelled: number;
}

// --- Components ---

function StatCard({ label, value, trend, icon, color, suffix }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
                    {icon}
                </div>
                {trend && (
                    <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <TrendingUp size={10} /> {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
                    {suffix && <span className="text-slate-400 text-sm font-medium">{suffix}</span>}
                </div>
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl">
                <p className="text-xs font-bold text-slate-400 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {entry.name}: {entry.value}
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function StitchOverview() {
    const { user, profile } = useAuth();
    const isSuperAdmin = user?.email === "sales@edxstore.com";
    const [showSeedData, setShowSeedData] = useState(false);
    
    const { metrics, loading: salesLoading, bookings, orders } = useAggregateSales(showSeedData);
    const { chartData, loading: trendsLoading } = useBusinessTrends(6, showSeedData);
    const { topServices, topProducts, loading: performersLoading } = useTopPerformers(showSeedData);
    const { count: newClientsCount, loading: customersLoading } = useNewClientsCount(showSeedData);
    const { conversionRate, loading: conversionLoading } = useConversionMetrics(showSeedData);
    const { metrics: affiliateMetrics, loading: affiliateLoading } = useAffiliateMetrics();
    const [seeding, setSeeding] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showDevMenu, setShowDevMenu] = useState(false);

    const [styles, setStyles] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        const { subscribeToStyles, subscribeToProducts } = require("@/src/lib/firebase/ownerService");
        const unsubStyles = subscribeToStyles((data: any) => setStyles(data));
        const unsubProducts = subscribeToProducts((data: any) => setProducts(data));
        return () => {
            unsubStyles();
            unsubProducts();
        };
    }, []);

    const loading = salesLoading || trendsLoading || performersLoading || customersLoading || conversionLoading || affiliateLoading;

    // --- Data Mapping ---

    const stats: DashboardStats = useMemo(() => ({
        totalRevenue: metrics.totalRevenue,
        bookingsCount: metrics.bookingsCount,
        newClients: newClientsCount,
        conversionRate: parseFloat((conversionRate || 0).toFixed(1)),
        payoutsDue: affiliateMetrics.payoutsDue,
        serviceRevenue: metrics.serviceRevenue,
        shopRevenue: metrics.shopRevenue
    }), [metrics, newClientsCount, conversionRate, affiliateMetrics]);

    const displayTopServices = useMemo(() => {
        return topServices.map(s => {
            const matchedStyle = styles.find(st => st.name === s.name);
            let displayPrice = s.price;
            
            if (matchedStyle && matchedStyle.price) {
                if (typeof matchedStyle.price === 'string') {
                    const numericPrice = parseFloat(matchedStyle.price.replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericPrice)) {
                        displayPrice = numericPrice;
                    }
                } else if (typeof matchedStyle.price === 'number') {
                    displayPrice = matchedStyle.price;
                }
            }

            return {
                ...s,
                price: displayPrice,
                img: s.img || (matchedStyle ? (matchedStyle.imageUrl || matchedStyle.image) : undefined)
            };
        });
    }, [topServices, styles]);

    const displayTopProducts = useMemo(() => {
        return topProducts.map(p => {
            const matchedProduct = products.find(pr => pr.name === p.name);
            return {
                ...p,
                img: p.img || (matchedProduct ? (matchedProduct.imageUrl || matchedProduct.image) : undefined)
            };
        });
    }, [topProducts, products]);

    // Adapt chart data keys if necessary (hook uses 'name', UI uses 'month')
    const adaptedChartData = useMemo(() => 
        chartData.map(d => ({ ...d, month: d.name })), 
    [chartData]);

    const revenueData = [
        { name: 'Salon Services', value: stats.serviceRevenue, color: '#9F2D5C' },
        { name: 'Product Sales', value: stats.shopRevenue, color: '#B8326A' },
    ];

    const runSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch("/api/admin/seed");
            const data = await res.json();
            if (data.success) {
                alert("Success! Dashboard populated with historical data.");
            } else {
                alert("Seeding failed check console");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSeeding(false);
        }
    };

    const runReminders = async () => {
        setSendingReminders(true);
        try {
            const res = await fetch("/api/admin/reminders", { 
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.success) {
                alert(`Success! Sent ${data.count} reminders.`);
            } else {
                alert(`Failed: ${data.error || "Unknown error"}`);
            }
        } catch (e) {
            console.error(e);
            alert("Unexpected error triggering reminders.");
        } finally {
            setSendingReminders(false);
        }
    };

    const handleExport = (type: 'bookings' | 'sales' | 'inventory') => {
        const { exportToCSV } = require("@/src/lib/firebase/ownerService");
        if (type === 'bookings') {
            const data = bookings.map(b => ({
                ID: b.id,
                Client: b.clientName || b.name,
                Email: b.clientEmail || b.email,
                Phone: b.clientPhone || b.phone,
                Style: b.styleName || b.service,
                Date: b.date,
                Time: b.time,
                Status: b.status,
                Price: ((b.priceCents || b.totalAmountCents || 0) / 100).toFixed(2),
                Deposit: ((b.pricing?.depositPaidCents || b.depositCents || 0) / 100).toFixed(2)
            }));
            exportToCSV(data, "Bookings_Report");
        } else if (type === 'sales') {
            const data = orders.map(o => ({
                ID: o.id,
                Client: o.clientName || o.customerName || "Unknown",
                Email: o.clientEmail || o.customerEmail || "Unknown",
                Status: o.status,
                Total: ((o.totalAmountCents || (o.totalAmount * 100) || 0) / 100).toFixed(2),
                Date: o.createdAt?.toDate ? format(o.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : "N/A"
            }));
            exportToCSV(data, "Shop_Sales_Report");
        } else if (type === 'inventory') {
            const data = products.map(p => ({
                ID: p.id,
                Name: p.name || "Unnamed",
                Category: p.category || "General",
                Price: (p.price || (p.priceCents || 0) / 100).toFixed(2),
                Stock: p.stock ?? 0,
                Status: p.isActive ? "Active" : "Inactive"
            }));
            exportToCSV(data, "Inventory_Report");
        }
        setShowExportMenu(false);
    };

    const revenueTarget = 15000;
    const currentMonthRevenue = stats.totalRevenue;
    const goalPercentage = Math.min(100, Math.round((currentMonthRevenue / revenueTarget) * 100));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="w-12 h-12 border-4 border-[#6b38d4] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">Dashboard Overview</h1>
                    <p className="text-slate-500 font-medium">Welcome back, <span className="font-bold text-slate-900 dark:text-white">{profile?.name || user?.displayName || user?.email?.split('@')[0] || "Admin"}</span>. Here's what's happening at the studio.</p>
                </div>
                <div className="flex items-center gap-3 relative">
                    {isSuperAdmin && (
                        <div className="relative">
                            <button 
                                onClick={() => { setShowDevMenu(!showDevMenu); setShowExportMenu(false); }}
                                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all"
                                title="Developer Options"
                            >
                                <Settings size={18} />
                            </button>
                            {showDevMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 dark:border-slate-800">Developer Tools</div>
                                    <button 
                                        onClick={runSeed}
                                        disabled={seeding}
                                        className="w-full text-left px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Database size={16} className="text-amber-500" />
                                        {seeding ? "Seeding..." : "Inject Seed Samples"}
                                    </button>
                                    <label className="w-full flex items-center justify-between px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className="text-purple-500" />
                                            Show Seed Data
                                        </div>
                                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showSeedData ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showSeedData ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={showSeedData} 
                                            onChange={(e) => setShowSeedData(e.target.checked)} 
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="relative">
                        <button 
                            onClick={() => { setShowExportMenu(!showExportMenu); setShowDevMenu(false); }}
                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                        >
                            <Download size={18} /> Export Report
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-850 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => handleExport('bookings')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Bookings Report</button>
                                <button onClick={() => handleExport('sales')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Shop Sales Report</button>
                                <button onClick={() => handleExport('inventory')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Inventory Report</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
                <StatCard 
                    label="Total Revenue" 
                    value={`$${stats.totalRevenue.toLocaleString()}`} 
                    trend="+12.5%" 
                    icon={<TrendingUp size={24} />} 
                    color="bg-brand-primary text-brand-primary"
                />
                <StatCard 
                    label="Bookings" 
                    value={stats.bookingsCount} 
                    suffix="Target: 1,500" 
                    icon={<Calendar size={24} />} 
                    color="bg-brand-secondary text-brand-secondary"
                />
                <StatCard 
                    label="New Clients" 
                    value={stats.newClients} 
                    icon={<Users size={24} />} 
                    color="bg-orange-500 text-orange-600"
                />
                <StatCard 
                    label="Conversion" 
                    value={`${stats.conversionRate}%`} 
                    icon={<Tag size={24} />} 
                    color="bg-blue-500 text-blue-600"
                />
                <StatCard 
                    label="Payouts Due" 
                    value={`$${stats.payoutsDue.toLocaleString()}`} 
                    suffix={`${affiliateMetrics.totalCount} Affiliates`}
                    icon={<Briefcase size={24} />} 
                    color="bg-red-500 text-red-600"
                />
            </div>

            {/* Middle Section: Chart + Sidebar */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Bookings Chart */}
                <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Bookings Trend</h3>
                            <p className="text-sm text-slate-400 font-medium">Historical booking volume over 6 months</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#9F2D5C]" />
                                <span className="text-xs font-bold text-slate-500">Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#fceef3]" />
                                <span className="text-xs font-bold text-slate-500">Cancelled</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adaptedChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="completed" fill="#9F2D5C" radius={[10, 10, 0, 0]} barSize={40} />
                                <Bar dataKey="cancelled" fill="#fceef3" radius={[10, 10, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar Cards */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Business Health */}
                    <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-8 rounded-[3rem] text-white shadow-xl shadow-brand-primary/10 dark:shadow-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform group-hover:scale-110 transition-transform">
                            <Zap size={80} />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-xl font-bold">Business Health</h3>
                        </div>
                        <p className="text-white/80 text-sm font-medium mb-8 leading-relaxed">
                            Your weekend slots are filling up fast! Consider opening more slots for Sunday to maximize revenue potential.
                        </p>
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold">
                                <span>MONTHLY GOAL</span>
                                <span>{goalPercentage}% REACH</span>
                            </div>
                            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${goalPercentage}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                />
                            </div>
                            <p className="text-[10px] text-white/60 font-medium italic">Expected to hit 100% soon based on booking acceleration.</p>
                        </div>
                    </div>

                    {/* Revenue Split */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Revenue Split</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-1/2 h-[180px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={revenueData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {revenueData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Services</span>
                                    <span className="text-2xl font-black text-brand-primary">
                                        {stats.totalRevenue > 0 
                                            ? Math.round((stats.serviceRevenue / stats.totalRevenue) * 100) 
                                            : 0}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-1/2 space-y-4">
                                {revenueData.map((item) => (
                                    <div key={item.name} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-xs font-bold text-slate-500">{item.name}</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white ml-4">
                                            ${item.value.toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Top Lists + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Services */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex justify-between items-center">
                        Top 3 Services
                        <MoreHorizontal size={18} className="text-slate-300" />
                    </h3>
                    <div className="space-y-6">
                        {performersLoading ? (
                            <div className="py-12 text-center text-slate-400 font-bold">Loading...</div>
                        ) : displayTopServices.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 font-bold">No bookings this month</div>
                        ) : displayTopServices.map((service, idx) => (
                            <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                    {service.img ? <img src={service.img} alt={service.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-400"><Scissors size={20} /></div>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-primary transition-colors">{service.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{service.count} Total Bookings</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                        ${Number(service.price || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex justify-between items-center">
                        Top 3 Products
                        <MoreHorizontal size={18} className="text-slate-300" />
                    </h3>
                    <div className="space-y-6">
                        {performersLoading ? (
                            <div className="py-12 text-center text-slate-400 font-bold">Loading...</div>
                        ) : displayTopProducts.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 font-bold">No product sales this month</div>
                        ) : displayTopProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                    {product.img ? <img src={product.img} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-pink-50 text-pink-400"><ShoppingBag size={20} /></div>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-secondary transition-colors">{product.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.count} Total Sales</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                        ${Number(product.price || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <ActionButton 
                            icon={<Plus size={18} />} 
                            label="Add Appointment" 
                            color="text-purple-600 bg-purple-50 dark:bg-purple-900/10"
                            onClick={() => window.location.href = '/owner/appointments'}
                        />
                        <ActionButton 
                            icon={<Scissors size={18} />} 
                            label="Add Style" 
                            color="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10"
                            onClick={() => window.location.href = '/owner/styles?action=new'}
                        />
                        <ActionButton 
                            icon={<ShoppingBag size={18} />} 
                            label="Add Product" 
                            color="text-pink-600 bg-pink-50 dark:bg-pink-900/10"
                            onClick={() => window.location.href = '/owner/inventory?action=new'}
                        />
                        <ActionButton 
                            icon={<Bell size={18} />} 
                            label={sendingReminders ? "Sending..." : "Send Reminders"} 
                            color="text-amber-600 bg-amber-50 dark:bg-amber-900/10"
                            onClick={runReminders}
                        />
                    </div>
                </div>
            </div>

            {/* Affiliate Performance Section */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Affiliate Performance</h3>
                        <p className="text-sm text-slate-400 font-medium">Tracking usage by category</p>
                    </div>
                    <Link href="/owner/affiliates" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
                        View Details <ArrowRight size={12} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-[2rem] bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Total Affiliates</span>
                        </div>
                        <p className="text-3xl font-black text-purple-600">{affiliateMetrics.totalCount}</p>
                        <p className="text-xs font-medium text-slate-500 mt-2">{affiliateMetrics.clientCount} Clients • {affiliateMetrics.generalCount} General</p>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                                <Tag size={20} />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Client Referrals</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-600">{affiliateMetrics.clientUsages}</p>
                        <p className="text-xs font-medium text-slate-500 mt-2">Code usages by braiding clients</p>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                                <ShoppingBag size={20} />
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">General Referrals</span>
                        </div>
                        <p className="text-3xl font-black text-blue-600">{affiliateMetrics.generalUsages}</p>
                        <p className="text-xs font-medium text-slate-500 mt-2">Code usages by general affiliates</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, color, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-full p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all border border-slate-50 dark:border-slate-800 ${color}`}
        >
            <div className="flex items-center gap-3">
                <div className="group-hover:scale-110 transition-transform">{icon}</div>
                <span className="text-sm font-bold">{label}</span>
            </div>
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
        </button>
    );
}
