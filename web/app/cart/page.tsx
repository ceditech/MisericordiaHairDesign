"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/src/lib/shop/cartStore";
import { Button, Card, Badge } from "@/components/ui";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ShieldCheck, Truck, Clock } from "lucide-react";

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    if (cartCount === 0) {
        return (
            <main className="min-h-[80vh] pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-8 shadow-xl">
                    <ShoppingBag size={40} className="text-slate-300" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Your Cart is Empty</h1>
                <p className="text-slate-500 max-w-md mb-12 leading-relaxed text-lg">
                    Looks like you haven&apos;t added anything to your cart yet. Explore our professional-grade hair essentials.
                </p>
                <Link
                    href="/products"
                    className="bg-[#a319c5] hover:bg-[#8b15a8] text-white px-12 py-8 rounded-2xl text-lg font-bold inline-flex items-center justify-center transition-all shadow-xl active:scale-95"
                >
                    Browse Products
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12">
                {/* Left: Cart Items */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white">Shopping Cart</h1>
                        <Badge className="bg-[#a319c5]/10 text-[#a319c5] border-none text-sm font-bold px-4 py-1">
                            {cartCount} Items
                        </Badge>
                    </div>

                    <div className="space-y-6">
                        {cart.map((item) => (
                            <Card key={item.productId + item.variantId} className="p-6 rounded-[2rem] border-slate-100 dark:border-slate-800 group hover:shadow-xl transition-all duration-300">
                                <div className="flex gap-6">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/40 relative flex-shrink-0 border border-slate-100 dark:border-slate-800">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-[#a319c5] transition-colors line-clamp-1">
                                                {item.name}
                                            </h3>
                                            {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, val]) => (
                                                <p key={key} className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {key}: <span className="text-slate-600 dark:text-slate-300">{val}</span>
                                                </p>
                                            ))}
                                            <div className="flex items-center gap-4 mt-4 sm:hidden">
                                                <span className="text-xl font-black text-[#a319c5] italic">
                                                    {formatPrice(item.priceCents)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-between w-full sm:w-auto">
                                            <div className="hidden sm:block">
                                                <span className="text-2xl font-black text-slate-900 dark:text-white italic">
                                                    {formatPrice(item.priceCents)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white hover:text-brand-primary disabled:opacity-50"
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white hover:text-brand-primary"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.productId, item.variantId)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Link href="/products" className="inline-flex items-center gap-2 text-slate-400 font-bold mt-12 hover:text-[#a319c5] transition-colors group">
                        <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#a319c5] transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        Continue Shopping
                    </Link>
                </div>

                {/* Right: Order Summary */}
                <div className="w-full lg:w-[400px]">
                    <div className="sticky top-32">
                        <Card className="p-8 pb-10 rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-2xl shadow-slate-950/5">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 italic uppercase tracking-tighter">Order Summary</h2>

                            <div className="space-y-6 mb-8">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Subtotal</span>
                                    <span className="text-slate-900 dark:text-white font-black">{formatPrice(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Estimated Tax (8.25%)</span>
                                    <span className="text-slate-900 dark:text-white font-black">{formatPrice(cartTotal * 0.0825)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Shipping</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold">Free Pickup</Badge>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-widest text-[#a319c5] mb-1">Estimated Total</span>
                                            <span className="text-4xl font-black text-slate-900 dark:text-white italic">
                                                {formatPrice(cartTotal * 1.0825)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/shop/checkout"
                                className="w-full bg-[#a319c5] hover:bg-[#8b15a8] text-white py-8 rounded-2xl text-lg font-black flex items-center justify-center transition-all shadow-xl shadow-[#a319c5]/30 active:scale-[0.98]"
                            >
                                Go to Checkout
                            </Link>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                    <ShieldCheck size={18} className="text-emerald-500" />
                                    Secure SSL encrypted checkout
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                    <Clock size={18} className="text-brand-primary" />
                                    Pick up ready in 2-4 hours
                                </div>
                                <div className="bg-slate-900/5 dark:bg-slate-50/5 p-4 rounded-2xl flex items-center justify-between gap-4 grayscale opacity-60">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
                                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}
