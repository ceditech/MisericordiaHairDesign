"use client";

import React, { useState, useEffect } from "react";
import { subscribeToShopOrders, updateOrderStatus } from "@/src/lib/firebase/ownerService";
import { Card, Badge, Button } from "@/components/ui";
import { ShoppingBag, Package, Truck, User, Search, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function OrdersTab() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeToShopOrders((data) => {
            setOrders(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (orderId: string, status: string, fulfillment: string) => {
        try {
            await updateOrderStatus(orderId, status, fulfillment);
        } catch (err) {
            console.error("Error updating order:", err);
        }
    };

    const filteredOrders = orders.filter(o => 
        o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.shopOrderId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "pending_payment": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        }
    };

    if (loading) return <div className="p-8 text-center font-bold">Loading orders...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-[#a319c5] text-sm"
                        placeholder="Search orders by customer or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-6">
                {filteredOrders.map((order) => (
                    <Card key={order.id} className="p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#a319c5]/10 text-[#a319c5] flex items-center justify-center shrink-0">
                                            <ShoppingBag size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                                Order #{order.shopOrderId?.slice(-6).toUpperCase()}
                                            </h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), "PPP p") : "Just now"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={`uppercase text-[10px] font-black tracking-widest ${getStatusBadge(order.status)}`}>
                                        {order.status}
                                    </Badge>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <User size={10} /> Customer
                                        </p>
                                        <p className="font-bold text-slate-900 dark:text-white">{order.customerName}</p>
                                        <p className="text-xs text-slate-500">{order.customerEmail}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Truck size={10} /> Fulfillment
                                        </p>
                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter italic">
                                            {order.fulfillmentType === 'pickup' ? "In-Studio Pickup" : "Shipping"}
                                        </p>
                                        <Badge className="bg-slate-200 text-slate-600 border-none text-[9px] font-black uppercase tracking-widest mt-1">
                                            {order.fulfillmentStatus || "Pending"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items</p>
                                    <div className="space-y-2">
                                        {order.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-3 rounded-xl border border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                <span className="font-bold text-slate-900 dark:text-white">{item.name} <span className="text-[#a319c5] ml-1">x{item.quantity}</span></span>
                                                <span className="font-black">${(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-64 space-y-4 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-8 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-[#a319c5] uppercase tracking-widest">Total Amount</p>
                                    <p className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                                        ${(order.totalCents / 100).toFixed(2)}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action Required</p>
                                    {order.fulfillmentType === 'pickup' ? (
                                        <Button 
                                            onClick={() => handleUpdateStatus(order.id, "paid", "picked_up")}
                                            className="w-full rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold h-12 gap-2 shadow-lg shadow-emerald-500/20"
                                            disabled={order.fulfillmentStatus === 'picked_up'}
                                        >
                                            <CheckCircle size={18} />
                                            Mark Picked Up
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => handleUpdateStatus(order.id, "paid", "shipped")}
                                            className="w-full rounded-2xl bg-[#a319c5] text-white hover:bg-[#8e16ac] font-bold h-12 gap-2 shadow-lg shadow-[#a319c5]/20"
                                            disabled={order.fulfillmentStatus === 'shipped'}
                                        >
                                            <Truck size={18} />
                                            Mark Shipped
                                        </Button>
                                    )}
                                    {order.fulfillmentStatus && order.fulfillmentStatus !== 'pending' && (
                                         <p className="text-[10px] text-center text-emerald-500 font-bold uppercase tracking-widest animate-in fade-in">
                                            Fulfillment Complete
                                         </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <ShoppingBag size={48} className="mx-auto text-slate-300 mb-6" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No orders found</h2>
                    </div>
                )}
            </div>
        </div>
    );
}
