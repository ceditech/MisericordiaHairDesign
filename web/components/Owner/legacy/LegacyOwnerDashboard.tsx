"use client";

import { useState } from "react";
import { Badge, Card, Button } from "@/components/ui";
import { 
    LayoutDashboard, 
    Users, 
    Calendar, 
    ShoppingBag, 
    Scissors, 
    Tag, 
    ChevronRight,
    TrendingUp,
    Store
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Tabs
import BookingsTab from "@/components/Owner/BookingsTab";
import ProductsTab from "@/components/Owner/ProductsTab";
import OrdersTab from "@/components/Owner/OrdersTab";
import AffiliatesTab from "@/components/Owner/AffiliatesTab";
import StylesTab from "@/components/Owner/StylesTab";

type TabType = "dashboard" | "bookings" | "styles" | "products" | "orders" | "affiliates";

export default function LegacyOwnerDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");

    const tabs = [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        { id: "bookings", label: "Appointments", icon: Calendar },
        { id: "styles", label: "Service Styles", icon: Scissors },
        { id: "products", label: "Inventory", icon: ShoppingBag },
        { id: "orders", label: "Shop Sales", icon: Store },
        { id: "affiliates", label: "Affiliates", icon: Users },
    ];

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <Badge className="mb-4 bg-[#9F2D5C]/10 text-[#9F2D5C] border-none uppercase tracking-widest text-xs font-black">
                        Management Portal
                    </Badge>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                        Owner Dashboard
                    </h1>
                </div>

                <div className="flex gap-3">
                    <Badge variant="success" className="h-8">Live Data</Badge>
                    <Badge className="h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 border-none">v2.0.0</Badge>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-12 p-2 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all
                            ${activeTab === tab.id 
                                ? "bg-[#9F2D5C] text-white shadow-lg shadow-[#9F2D5C]/20" 
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "dashboard" && <OverviewTab onNavigate={setActiveTab} />}
                        {activeTab === "bookings" && <BookingsTab />}
                        {activeTab === "styles" && <StylesTab />}
                        {activeTab === "products" && <ProductsTab />}
                        {activeTab === "orders" && <OrdersTab />}
                        {activeTab === "affiliates" && <AffiliatesTab />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </main>
    );
}

function OverviewTab({ onNavigate }: { onNavigate: (tab: TabType) => void }) {
    const panels = [
        { title: "Manage Appointments", description: "View and cancel customer bookings.", tab: "bookings", icon: Calendar, color: "blue" },
        { title: "Braid Styles & Prices", description: "Manage catalogs, prices and durations.", tab: "styles", icon: Scissors, color: "rose" },
        { title: "Inventory & Stock", description: "Update products and manage prices.", tab: "products", icon: ShoppingBag, color: "purple" },
        { title: "Store Fulfillment", description: "Track sales and fulfill orders.", tab: "orders", icon: Store, color: "emerald" },
        { title: "Program Growth", description: "Manage affiliate referral codes.", tab: "affiliates", icon: Users, color: "amber" },
    ];

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {panels.map((panel) => (
                    <Card 
                        key={panel.title}
                        onClick={() => onNavigate(panel.tab as TabType)}
                        className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-[#9F2D5C] hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                            <panel.icon size={120} />
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[#9F2D5C] mb-6 group-hover:bg-[#9F2D5C] group-hover:text-white transition-colors">
                            <panel.icon size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 italic uppercase tracking-tighter">
                            {panel.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            {panel.description}
                        </p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card className="p-10 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Quick Stats</h2>
                        <TrendingUp className="text-[#9F2D5C]" />
                    </div>
                    <div className="space-y-6">
                        {[
                            { label: "Revenue", value: "$4,250", trend: "+12%" },
                            { label: "Bookings", value: "28", trend: "+5%" },
                            { label: "New Clients", value: "14", trend: "+8%" }
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-end justify-between pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">{stat.value}</p>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px]">{stat.trend}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-10 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Business Health</h2>
                        <LayoutDashboard className="text-[#9F2D5C]" />
                    </div>
                    <div className="flex flex-col h-full justify-center pb-12">
                         <div className="space-y-4">
                            <p className="text-sm text-slate-500 leading-relaxed font-bold uppercase tracking-widest text-[10px]">
                                Your business is performing <span className="text-[#9F2D5C]">above average</span> this month. Shop sales have increased by 15% since migrating to the new dashboard.
                            </p>
                            <Button className="rounded-2xl bg-[#9F2D5C] text-white font-bold px-8 h-12 gap-2 shadow-lg shadow-[#9F2D5C]/20">
                                View Full Reports
                                <ChevronRight size={18} />
                            </Button>
                         </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
