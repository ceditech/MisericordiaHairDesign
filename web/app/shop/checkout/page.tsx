"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/src/lib/shop/cartStore";
import { useAuth } from "@/src/providers/AuthProvider";
import { signUpUser } from "@/src/lib/firebase/auth";
import { getDb } from "@/src/lib/firebase/client";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import type { PaymentProvider, PaymentStatus } from "@/lib/payments/types";
import { Button, Input, Card, Badge, useToast } from "@/components/ui";
import { ChevronRight, ShieldCheck, ArrowLeft, ShoppingBag, Info, Truck, Tag } from "lucide-react";
import StripeCheckout from "@/components/StripeCheckout";
import { formatUSPhone, isValidUSPhone } from "@/lib/utils";

// --- Helpers ---
const SHIPPING_FLAT_RATE_CENTS = 1500;
function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

function ShopCheckoutInner() {
    const { cart, cartTotal, cartCount, clearCart } = useCart();
    const { user, profile } = useAuth();
    const router = useRouter();

    const [checkoutData, setCheckoutData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        password: "",
        createAccount: true,
    });
    
    const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'shipping'>('pickup');
    
    const { showToast } = useToast();
    const [provider, setProvider] = useState<PaymentProvider>("stripe");
    const [flowStatus, setFlowStatus] = useState<PaymentStatus>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [promoCode, setPromoCode] = useState("");
    const [appliedCode, setAppliedCode] = useState<string | null>(null);

    // Promo Code logic
    let discountCents = 0;
    if (appliedCode) {
        discountCents = Math.round(cartTotal * 0.10);
    }
    
    const discountedCartTotal = cartTotal - discountCents;
    const taxCents = Math.round(discountedCartTotal * 0.0825);
    const shippingCostCents = fulfillmentType === 'shipping' ? SHIPPING_FLAT_RATE_CENTS : 0;
    const finalTotalCents = discountedCartTotal + taxCents + shippingCostCents;

    const handleApplyPromo = () => {
        const code = promoCode.trim().toUpperCase();
        if (code === "AFFILIATE10" || code.startsWith("DB-AFF-")) {
            setAppliedCode(code);
            showToast?.(`${code} applied! 10% discount added.`, "success");
        } else if (code) {
            setErrorMsg("Invalid promotional code.");
        }
    };

    const hasRedirected = useRef(false);
    // Stable ID for this shop checkout session (persisted as draft before payment)
    const [shopOrderId, setShopOrderId] = useState<string | null>(null);

    // Generate a stable shopOrderId on mount (once cart is populated)
    useEffect(() => {
        if (cartCount > 0) {
            setShopOrderId(`shop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        }
    }, []);

    // Redirect if cart is empty
    useEffect(() => {
        const safePush = async (url: string) => {
            try {
                await (router.push(url) as any);
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        };

        if (cartCount === 0 && flowStatus === "idle" && !hasRedirected.current) {
            hasRedirected.current = true;
            safePush("/cart");
        }
    }, [cartCount, flowStatus, router]);

    // ── Pre-fill from Auth Profile ────────────────────────────────────────────
    useEffect(() => {
        if (profile || user) {
            setCheckoutData((prev) => ({
                ...prev,
                name: prev.name || profile?.name || profile?.displayName || user?.displayName || "",
                email: prev.email || profile?.email || user?.email || "",
                phone: prev.phone || profile?.phone || "",
            }));
        } else if (!user) {
            // Clear if logged out
            setCheckoutData((prev) => ({
                ...prev,
                name: "",
                email: "",
                phone: "",
            }));
        }
    }, [profile, user]);


    // ── Persist shop order draft to Firestore before payment ─────────────────
    const persistShopOrderToFirestore = async (id: string): Promise<void> => {
        const db = getDb();
        await setDoc(doc(db, "shopOrders", id), {
            shopOrderId: id,
            userId: user?.uid ?? null,
            items: cart.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                priceCents: item.priceCents,
                selectedOptions: item.selectedOptions ?? null,
            })),
            customerName: checkoutData.name,
            customerEmail: checkoutData.email,
            customerPhone: checkoutData.phone,
            fulfillmentType,
            shipping: fulfillmentType === "shipping" ? {
                address: checkoutData.address,
                city: checkoutData.city,
                state: checkoutData.state,
                zipCode: checkoutData.zip,
                shippingCostCents,
            } : null,
            taxCents,
            totalCents: finalTotalCents,
            status: "pending_payment",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    };

    // ── PayPal: redirect to PayPal approval page ──────────────────────────────
    const handlePayPalRedirect = async () => {
        if (!shopOrderId) {
            setErrorMsg("Session expired. Please add items to your cart again.");
            return;
        }
        setFlowStatus("creating");
        try {
            await persistShopOrderToFirestore(shopOrderId);
            const res = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionType: "shop",
                    shopOrderId,
                    choice: "full",
                    returnUrl: `${window.location.origin}/shop/success?provider=paypal&shopOrderId=${shopOrderId}`,
                    cancelUrl: `${window.location.origin}/shop/checkout?cancelled=true`,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(err.error ?? `Server error ${res.status}`);
            }
            const { approvalLink } = await res.json();
            if (!approvalLink) throw new Error("No PayPal approval link returned.");
            window.location.href = approvalLink;
        } catch (err: any) {
            console.error("[ShopCheckout] PayPal initiation error:", err);
            setFlowStatus("failed");
            setErrorMsg(err.message ?? "Failed to initialize PayPal. Please try again.");
        }
    };

    // ── Stripe: persist draft then let StripeCheckout handle redirect ─────────
    const handleStripeBeforeRedirect = async () => {
        if (!shopOrderId) return;
        await persistShopOrderToFirestore(shopOrderId);
    };

    const isProcessing = flowStatus === "creating" || flowStatus === "redirecting";

    const isFormValid = () => {
        if (!checkoutData.email) return false;
        if (!isValidUSPhone(checkoutData.phone)) return false;
        if (fulfillmentType === 'shipping' && (!checkoutData.address || !checkoutData.city || !checkoutData.state || !checkoutData.zip)) return false;
        if (!user && checkoutData.createAccount && (!checkoutData.password || checkoutData.password.length < 6)) return false;
        return true;
    };

    if (cartCount === 0 && flowStatus === "idle") return null;

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
            <Link href="/cart" className="inline-flex items-center gap-2 text-slate-400 font-bold mb-12 hover:text-[#a319c5] transition-colors group">
                <ArrowLeft size={16} />
                Back to Cart
            </Link>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-12 italic uppercase tracking-tighter">
                Checkout
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left: Form */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-12">
                    {/* Customer Info */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-[#a319c5] text-white flex items-center justify-center font-bold text-sm">1</div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Information</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                                <Input
                                    placeholder="John Doe"
                                    className="rounded-2xl py-6"
                                    value={checkoutData.name}
                                    onChange={(e) => setCheckoutData(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Email Address *</label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="rounded-2xl py-6"
                                    value={checkoutData.email}
                                    onChange={(e) => setCheckoutData(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${checkoutData.phone && !isValidUSPhone(checkoutData.phone) ? 'text-red-500' : 'text-slate-400'}`}>Phone Number *</label>
                                <Input
                                    type="tel"
                                    placeholder="(555) 000-0000"
                                    className={`rounded-2xl py-6 transition-all ${checkoutData.phone && !isValidUSPhone(checkoutData.phone) ? 'border-red-500 text-red-600 focus-visible:ring-red-500 bg-red-50 dark:bg-red-900/10' : ''}`}
                                    value={checkoutData.phone}
                                    onChange={(e) => setCheckoutData(prev => ({ ...prev, phone: formatUSPhone(e.target.value) }))}
                                />
                                {checkoutData.phone && !isValidUSPhone(checkoutData.phone) && (
                                    <p className="text-[10px] text-red-500 font-bold ml-1 animate-in fade-in">Please enter a valid 10-digit phone number.</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Delivery Method */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-[#a319c5] text-white flex items-center justify-center font-bold text-sm">2</div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fulfillment Method</h2>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={() => setFulfillmentType('pickup')}
                                className={`w-full p-6 pb-2 rounded-[2rem] border-2 text-left transition-all ${fulfillmentType === 'pickup' ? "border-[#a319c5] bg-[#a319c5]/5" : "border-slate-100 dark:border-slate-800"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${fulfillmentType === 'pickup' ? "border-[#a319c5]" : "border-slate-300"}`}>
                                            {fulfillmentType === 'pickup' && <div className="w-3 h-3 rounded-full bg-[#a319c5]" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">In-Studio Pickup</p>
                                            <p className="text-sm text-slate-500">Pick up at Manor, TX location</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-[#a319c5]/10 text-[#a319c5] border-none font-bold">Free</Badge>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => setFulfillmentType('shipping')}
                                className={`w-full p-6 pb-2 rounded-[2rem] border-2 text-left transition-all ${fulfillmentType === 'shipping' ? "border-[#a319c5] bg-[#a319c5]/5" : "border-slate-100 dark:border-slate-800"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${fulfillmentType === 'shipping' ? "border-[#a319c5]" : "border-slate-300"}`}>
                                            {fulfillmentType === 'shipping' && <div className="w-3 h-3 rounded-full bg-[#a319c5]" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Standard Shipping</p>
                                            <p className="text-sm text-slate-500">Delivered to your door</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-[#a319c5]/10 text-[#a319c5] border-none font-bold">{formatCents(SHIPPING_FLAT_RATE_CENTS)}</Badge>
                                </div>
                            </button>
                        </div>

                        {fulfillmentType === 'shipping' && (
                            <div className="mt-8 space-y-6 animate-in slide-in-from-top duration-500">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Street Address</label>
                                    <Input
                                        placeholder="123 Main St"
                                        className="rounded-2xl py-6"
                                        value={checkoutData.address}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, address: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                    <div className="col-span-2 sm:col-span-1 space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">City</label>
                                        <Input
                                            placeholder="Austin"
                                            className="rounded-2xl py-6"
                                            value={checkoutData.city}
                                            onChange={(e) => setCheckoutData(prev => ({ ...prev, city: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">State</label>
                                        <Input
                                            placeholder="TX"
                                            className="rounded-2xl py-6"
                                            value={checkoutData.state}
                                            onChange={(e) => setCheckoutData(prev => ({ ...prev, state: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Zip Code</label>
                                        <Input
                                            placeholder="78701"
                                            className="rounded-2xl py-6"
                                            value={checkoutData.zip}
                                            onChange={(e) => setCheckoutData(prev => ({ ...prev, zip: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Account Creation for Guest Users */}
                    {!user && (
                        <div className="p-8 rounded-3xl bg-[#a319c5]/5 border border-[#a319c5]/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#a319c5] flex items-center justify-center shadow-lg shadow-[#a319c5]/20">
                                    <span className="material-icons text-white text-base">person_add</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Create an Account</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recommended</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Save your order history and speed up future checkouts. You&apos;ll also be able to track your shipments!
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                                    <Input
                                        type="password"
                                        value={checkoutData.password}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, password: e.target.value }))}
                                        className="rounded-2xl py-6"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={checkoutData.createAccount}
                                                onChange={(e) => setCheckoutData(prev => ({ ...prev, createAccount: e.target.checked }))}
                                                className="peer hidden"
                                            />
                                            <div className="w-6 h-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:bg-[#a319c5] peer-checked:border-[#a319c5] transition-all flex items-center justify-center">
                                                <span className="material-icons text-white text-[14px]">check</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply this password</span>
                                    </label>
                                </div>
                            </div>
                            {checkoutData.createAccount && checkoutData.password.length > 0 && checkoutData.password.length < 6 && (
                                <p className="text-[10px] text-red-500 font-bold ml-4">Password must be at least 6 characters</p>
                            )}
                        </div>
                    )}

                    {/* Payment Method */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-[#a319c5] text-white flex items-center justify-center font-bold text-sm">3</div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Method</h2>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={() => setProvider("stripe")}
                                className={`w-full p-6 pb-2 rounded-[2rem] border-2 text-left transition-all ${provider === "stripe" ? "border-[#a319c5] bg-[#a319c5]/5" : "border-slate-100 dark:border-slate-800"}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${provider === "stripe" ? "border-[#a319c5]" : "border-slate-300"}`}>
                                            {provider === "stripe" && <div className="w-3 h-3 rounded-full bg-[#a319c5]" />}
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs">Credit / Debit Card</p>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4 grayscale opacity-60" />
                                </div>
                                <p className="text-xs text-slate-400 ml-10 mb-4">Secure credit card payment processed via Stripe.</p>
                            </button>
                            <button
                                onClick={() => setProvider("paypal")}
                                className={`w-full p-6 pb-2 rounded-[2rem] border-2 text-left transition-all ${provider === "paypal" ? "border-[#a319c5] bg-[#a319c5]/5" : "border-slate-100 dark:border-slate-800"}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${provider === "paypal" ? "border-[#a319c5]" : "border-slate-300"}`}>
                                            {provider === "paypal" && <div className="w-3 h-3 rounded-full bg-[#a319c5]" />}
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs">PayPal</p>
                                    </div>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 grayscale opacity-60" />
                                </div>
                                <p className="text-xs text-slate-400 ml-10 mb-4">Pay with your PayPal balance or linked accounts.</p>
                            </button>
                        </div>
                    </section>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-500 p-6 rounded-3xl border border-red-100 flex items-center gap-4 animate-in shake duration-500">
                            <Info size={20} />
                            <p className="font-bold text-sm">{errorMsg}</p>
                        </div>
                    )}
                </div>

                {/* Right: Summary */}
                <div className="lg:col-span-12 xl:col-span-5 sticky top-32">
                    <Card className="p-8 pb-10 rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-2xl shadow-slate-950/5">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 italic uppercase tracking-tighter">Summary</h2>

                        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {cart.map(item => (
                                <div key={item.productId + item.variantId} className="flex justify-between gap-4">
                                    <div className="text-sm">
                                        <p className="font-bold text-slate-900 dark:text-white italic">{item.name} <span className="text-[#a319c5] ml-1">x{item.quantity}</span></p>
                                        {item.selectedOptions && (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {Object.values(item.selectedOptions).join(" / ")}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{formatCents(item.priceCents * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCents(cartTotal)}</span>
                            </div>
                            {appliedCode && (
                                <div className="flex justify-between text-sm text-emerald-500 animate-in fade-in duration-500">
                                    <span className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                                        <Tag size={10} />
                                        Discount ({appliedCode})
                                    </span>
                                    <span className="font-bold">-{formatCents(discountCents)}</span>
                                </div>
                            )}
                            {shippingCostCents > 0 && (
                                <div className="flex justify-between text-sm animate-in fade-in duration-500">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Shipping</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatCents(shippingCostCents)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tax (8.25%)</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCents(taxCents)}</span>
                            </div>
                            <div className="pt-6 flex justify-between items-end">
                                <span className="text-xs font-black uppercase tracking-widest text-[#a319c5]">Total Amount</span>
                                <span className="text-4xl font-black text-slate-900 dark:text-white italic">{formatCents(finalTotalCents)}</span>
                            </div>
                        </div>

                        {/* Promo Code Input */}
                        {!appliedCode ? (
                            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Promo Code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        className="flex-1 bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a319c5] transition-colors"
                                    />
                                    <Button
                                        onClick={handleApplyPromo}
                                        disabled={!promoCode.trim()}
                                        variant="secondary"
                                        className="bg-[#a319c5]/10 hover:bg-[#a319c5]/20 text-[#a319c5] border-[#a319c5]/20 px-6 py-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                    <ShieldCheck size={12} className="text-emerald-500" />
                                    Code Applied
                                </div>
                                <button
                                    onClick={() => { setAppliedCode(null); setPromoCode(""); }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-black uppercase tracking-widest underline underline-offset-4"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        {/* Interactive Payment Section */}
                        <div className="mt-10">
                            {!isFormValid() ? (
                                <div className="p-6 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold leading-relaxed">
                                    Please fill in all required customer and shipping information to proceed to payment.
                                    {checkoutData.createAccount && checkoutData.password.length < 6 && (
                                        <p className="mt-2">Password must be at least 6 characters.</p>
                                    )}
                                </div>
                            ) : provider === "stripe" ? (
                                <StripeCheckout
                                    sessionType="shop"
                                    shopOrderId={shopOrderId || undefined}
                                    amountCents={finalTotalCents}
                                    onBeforeRedirect={handleStripeBeforeRedirect}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <Button
                                        onClick={handlePayPalRedirect}
                                        disabled={isProcessing || !shopOrderId}
                                        className="w-full bg-[#FFC439] hover:bg-[#F4BB33] text-black h-14 rounded-2xl text-base font-bold shadow-lg shadow-[#FFC439]/20 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isProcessing ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                Pay with <img src="/paypal-logo.svg" alt="PayPal" className="h-5 ml-1" />
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-center text-[10px] text-slate-400 font-medium">You will be redirected to PayPal to complete your purchase securely.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-3 text-slate-400">
                            <ShieldCheck size={18} />
                            <span className="text-[10px] uppercase font-black tracking-widest">Secure Checkout</span>
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}

export default function ShopCheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><h2 className="text-2xl font-black italic animate-pulse">Loading...</h2></div>}>
            <ShopCheckoutInner />
        </Suspense>
    );
}
