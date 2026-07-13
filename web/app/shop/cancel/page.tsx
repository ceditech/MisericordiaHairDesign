"use client";

import Link from "next/link";
import { Button, Card, Badge } from "@/components/ui";
import { XCircle, ShoppingCart, ArrowLeft, HelpCircle } from "lucide-react";
import { CONTACT_EMAIL } from "@/src/content/legal";

export default function ShopCancelPage() {
    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/10">
                <XCircle size={48} />
            </div>

            <Badge className="bg-amber-500/10 text-amber-600 border-none px-4 py-1.5 uppercase tracking-widest text-xs font-black mb-4">
                Checkout Canceled
            </Badge>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6 italic uppercase tracking-tighter">
                Payment Canceled
            </h1>

            <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-md mx-auto leading-relaxed">
                No worries! Your payment session was canceled and no funds were captured. Your items are still waiting in your cart.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-16">
                <Link
                    href="/shop/checkout"
                    className="w-full bg-[#9F2D5C] hover:bg-[#B8326A] text-white py-8 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98]"
                >
                    Try Again
                </Link>
                <Link
                    href="/cart"
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white py-8 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98]"
                >
                    <ShoppingCart size={18} />
                    Return to Cart
                </Link>
            </div>

            <Card className="p-8 rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-left flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                    <HelpCircle size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Need Help?</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        If you experienced technical issues or have questions about a product, please reach out to us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#9F2D5C] font-bold">{CONTACT_EMAIL}</a> and we&apos;ll be happy to assist you.
                    </p>
                </div>
            </Card>

            <Link href="/products" className="inline-flex items-center gap-2 text-slate-400 font-bold mt-12 hover:text-[#9F2D5C] transition-colors group">
                <ArrowLeft size={16} />
                Back to Shop
            </Link>
        </main>
    );
}
