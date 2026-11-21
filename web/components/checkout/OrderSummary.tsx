import type { ReactNode } from "react";
import Link from "next/link";
import type { BookingDraft } from "@/src/lib/bookingDraft";
import type { BraidStyle } from "@/src/lib/styles";
import type { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import type { PaymentChoice } from "@/src/lib/payments/types";
import { formatCents, type calculateBookingPrice } from "@/src/lib/pricing";

interface OrderSummaryProps {
    style: BraidStyle;
    draft: BookingDraft;
    pricing: ReturnType<typeof calculateBookingPrice>;
    sizePresets: SizePreset[];
    lengthPresets: LengthPreset[];
    addons: AddonDoc[];
    paymentChoice: PaymentChoice;
    amountDueNow: number;
    /** The promo code box. */
    promoBox: ReactNode;
    /** The pay button for the chosen provider. */
    children: ReactNode;
}

/** The sticky right-hand panel: what is being booked, the price breakdown, and the pay button. */
export function OrderSummary({ style, draft, pricing, sizePresets, lengthPresets, addons, paymentChoice, amountDueNow, promoBox, children }: OrderSummaryProps) {
    return (
        <div className="bg-surface rounded-[2rem] p-10 border border-border shadow-xl shadow-brand-primary/5">
            <h2 className="text-xl font-bold text-text-primary mb-8">Order Summary</h2>

            {/* Service */}
            <div className="space-y-4 pb-6 border-b border-border">
                <div className="flex justify-between">
                    <div>
                        <p className="font-bold text-text-primary">{style.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{style.duration}</p>
                    </div>
                    <p className="font-bold text-text-primary text-right">{style.price}</p>
                </div>
            </div>

            {promoBox}

            {/* When */}
            <div className="py-5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Appointment</p>
                <p className="font-bold text-text-primary">{draft.date}</p>
                <p className="text-text-secondary">{draft.time}</p>
            </div>

            {/* Client */}
            <div className="py-5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Client</p>
                <p className="font-bold text-text-primary">{draft.name}</p>
                <p className="text-xs text-text-muted">{draft.email}</p>
                {draft.phone && <p className="text-xs text-text-muted">{draft.phone}</p>}
            </div>

            {/* Inspiration photo thumbnail */}
            {draft.photoPreview && (
                <div className="py-5 border-b border-border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Inspiration</p>
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border">
                        <img src={draft.photoPreview} alt="Inspiration" className="w-full h-full object-cover" />
                    </div>
                </div>
            )}

            {/* Pricing breakdown */}
            <div className="pt-6 space-y-3">
                <div className="flex justify-between text-sm text-text-secondary">
                    <span>Base service</span>
                    <span className="font-semibold">{style.price}</span>
                </div>
                <div className="flex justify-between text-sm text-text-secondary">
                    <span>Size ({sizePresets.find(s => s.id === draft.sizeId)?.label || "Medium"})</span>
                    <span className="font-semibold">{pricing.sizeAdjustmentCents >= 0 ? '+' : ''}{formatCents(pricing.sizeAdjustmentCents)}</span>
                </div>
                <div className="flex justify-between text-sm text-text-secondary">
                    <span>Length ({lengthPresets.find(l => l.id === draft.lengthId)?.label || "Shoulder"})</span>
                    <span className="font-semibold">{pricing.lengthAdjustmentCents >= 0 ? '+' : ''}{formatCents(pricing.lengthAdjustmentCents)}</span>
                </div>
                {draft.washingAddon && (
                    <div className="flex justify-between text-sm text-text-secondary">
                        <span>Washing Service</span>
                        <span className="font-semibold">+{formatCents((addons.find(a => a.id === "wash")?.price || 25) * 100)}</span>
                    </div>
                )}
                {draft.takeDownAddon && (
                    <div className="flex justify-between text-sm text-text-secondary">
                        <span>Take Down Service</span>
                        <span className="font-semibold">+{formatCents((addons.find(a => a.id === "take-down")?.price || 45) * 100)}</span>
                    </div>
                )}
                {pricing.discountCents > 0 && (
                    <div className="flex justify-between text-sm text-text-secondary text-emerald-400">
                        <span>Discount</span>
                        <span className="font-semibold">-{formatCents(pricing.discountCents)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm text-text-secondary font-bold pt-2 border-t border-border mt-2">
                    <span>Estimated total</span>
                    <span className="font-semibold">{formatCents(pricing.totalCents)}</span>
                </div>

                {paymentChoice === "deposit" && (
                    <div className="flex justify-between text-sm text-text-secondary">
                        <span>Balance at appointment</span>
                        <span className="font-semibold">
                            {formatCents(pricing.totalCents - pricing.depositCents)}
                        </span>
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border">
                    <p className="font-bold text-text-primary">Due Today</p>
                    <p className="text-3xl font-black text-brand-primary">{formatCents(amountDueNow)}</p>
                </div>

                {paymentChoice === "deposit" && (
                    <p className="text-[10px] text-text-muted text-right">Non-refundable · Applied to total at appointment</p>
                )}
            </div>

            {/* CTA */}
            <div className="mt-8 space-y-3">
                {children}

                <Link
                    href="/book"
                    className="w-full py-4 rounded-full font-bold text-slate-400 hover:text-[#9F2D5C] transition-colors text-center text-sm flex items-center justify-center gap-2"
                >
                    <span className="material-icons text-sm">arrow_back</span>
                    Edit my booking
                </Link>
            </div>

            {/* Trust note */}
            <p className="text-center text-[10px] text-slate-400 mt-4">
                Your payment is handled securely. We never store card details.
            </p>
        </div>
    );
}
