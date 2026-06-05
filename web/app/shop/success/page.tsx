"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Badge } from "@/components/ui";
import { CONTACT_EMAIL } from "@/src/content/legal";
import { CheckCircle, ShoppingBag, ArrowRight, Printer, Share2 } from "lucide-react";
import { getStatus } from "@/lib/payments/paymentService";
import { PaymentSession } from "@/lib/payments/types";
import { getDb } from "@/src/lib/firebase/client";
import { getDoc, doc } from "firebase/firestore";

function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

function ShopSuccessInner() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const [session, setSession] = useState<PaymentSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const checkStatus = async () => {
            try {
                // Milestone 10: Prioritize Firestore persistence
                const db = getDb();
                const orderDoc = await getDoc(doc(db, "shop_orders", sessionId));
                
                if (orderDoc.exists() && isMounted) {
                    const data = orderDoc.data();
                    setSession({
                        id: sessionId,
                        status: data.status || "success",
                        amountCents: data.totalCents,
                        provider: data.provider,
                        sessionType: 'shop',
                        shop: {
                            items: data.items,
                            fulfillmentType: data.fulfillmentType,
                            shipping: data.shipping,
                            customerEmail: data.customerEmail,
                            customerName: data.customerName
                        }
                    } as any);
                    setLoading(false);
                    return;
                }

                // Fallback to payment service polling
                const statusData = await getStatus(sessionId);
                if (!isMounted) return;

                if (statusData.status === "success" || statusData.status === "cancelled" || statusData.status === "failed") {
                    setSession(statusData);
                    setLoading(false);
                } else {
                    // Still pending, check again
                    setTimeout(checkStatus, 2000);
                }
            } catch (err) {
                console.error("Error fetching session status:", err);
                if (isMounted) setLoading(false);
            }
        };

        checkStatus();
        return () => { isMounted = false; };
    }, [sessionId]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const shareData = {
            title: "Dede's Braids - Order Confirmation",
            text: `Check out my order from Dede's Braids! Order #${session?.id.slice(-6).toUpperCase()}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#9F2D5C] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Confirming Order...</p>
                </div>
            </main>
        );
    }

    if (!session || session.sessionType !== 'shop') {
        return (
            <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Order Not Found</h1>
                <p className="text-slate-500 mb-12">We couldn&apos;t find an order associated with this session.</p>
                <Link
                    href="/products"
                    className="bg-[#9F2D5C] hover:bg-[#B8326A] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 inline-flex items-center justify-center"
                >
                    Return to Shop
                </Link>
            </main>
        );
    }

    const isShipping = session.shop?.fulfillmentType === 'shipping';
    const shipping = session.shop?.shipping;

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-3xl mx-auto print:pt-10 print:pb-10">
            <div className="text-center mb-12 print:mb-6">
                <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10 scale-110 print:hidden">
                    <CheckCircle size={48} />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 uppercase tracking-widest text-xs font-black mb-4 print:hidden">
                    Payment Successful
                </Badge>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6 italic uppercase tracking-tighter">
                    Thank You for Your Order!
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                    Your order <span className="text-slate-900 dark:text-white font-bold">#{session.id.slice(-6).toUpperCase()}</span> has been confirmed. A confirmation receipt has been sent to your email.
                </p>
            </div>

            <Card className="p-8 sm:p-12 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-950/10 relative overflow-hidden print:shadow-none print:border-none print:p-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#9F2D5C]/5 rounded-bl-[5rem] -mr-16 -mt-16 print:hidden" />

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-10 italic border-b border-slate-100 dark:border-slate-800 pb-6">Order Details</h2>

                <div className="space-y-8 mb-12">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Order Status</p>
                            <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">Paid</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Method</p>
                            <p className="font-bold text-slate-900 dark:text-white uppercase text-sm">{session.provider}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Total Paid</p>
                        <p className="text-5xl font-black text-[#9F2D5C] italic">{formatCents(session.amountCents)}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                        {isShipping ? (
                            <>
                                <div className="flex items-center gap-4 text-[#9F2D5C] mb-4">
                                    <ShoppingBag size={20} />
                                    <h3 className="font-black italic uppercase tracking-widest text-sm">Shipping Information</h3>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    <p className="font-bold text-slate-900 dark:text-white mb-1">Standard Shipping</p>
                                    <p>{shipping?.address}</p>
                                    <p>{shipping?.city}, {shipping?.state} {shipping?.zipCode}</p>
                                    <p className="mt-4 text-xs italic text-slate-500">Your items will be shipped within 1-2 business days.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 text-[#9F2D5C] mb-4">
                                    <ShoppingBag size={20} />
                                    <h3 className="font-black italic uppercase tracking-widest text-sm">Pickup Information</h3>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    Your essentials will be ready for pickup at <span className="text-slate-900 dark:text-white font-bold">Dede&apos;s Braids (Manor, TX)</span> in roughly <span className="text-slate-900 dark:text-white font-bold">2-4 hours</span>. Please bring your order confirmation or ID.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 print:hidden">
                    <Link
                        href="/products"
                        className="w-full bg-[#9F2D5C] hover:bg-[#B8326A] text-white py-7 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98]"
                    >
                        Keep Shopping
                        <ArrowRight size={18} />
                    </Link>
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            className="flex-1 py-7 rounded-2xl border-2 border-slate-100 dark:border-slate-800"
                            onClick={handlePrint}
                        >
                            <Printer size={18} />
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="flex-1 py-7 rounded-2xl border-2 border-slate-100 dark:border-slate-800"
                            onClick={handleShare}
                        >
                            <Share2 size={18} />
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="mt-12 text-center print:hidden">
                <p className="text-sm text-slate-400 font-medium">
                    Need help? Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#9F2D5C] font-bold">{CONTACT_EMAIL}</a>
                </p>
            </div>
        </main>
    );
}

export default function ShopSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><h2 className="text-2xl font-black italic animate-pulse">Loading...</h2></div>}>
            <ShopSuccessInner />
        </Suspense>
    );
}
