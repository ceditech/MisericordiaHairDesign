import { formatCents } from "@/src/lib/pricing";
import type { PaymentChoice } from "@/src/lib/payments/types";

interface PaymentChoiceSectionProps {
    paymentChoice: PaymentChoice;
    onChange: (choice: PaymentChoice) => void;
    depositCents: number;
    totalCents: number;
}

/** Deposit or pay in full. */
export function PaymentChoiceSection({ paymentChoice, onChange, depositCents, totalCents }: PaymentChoiceSectionProps) {
    return (
        <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                Payment Option
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deposit */}
                <button
                    id="choice-deposit"
                    onClick={() => onChange("deposit")}
                    className={`relative p-7 rounded-[1.5rem] border-2 text-left transition-all ${paymentChoice === "deposit"
                        ? "border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10"
                        : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#9F2D5C]/40"
                        }`}
                    aria-pressed={paymentChoice === "deposit"}
                >
                    {paymentChoice === "deposit" && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#9F2D5C] flex items-center justify-center">
                            <span className="material-icons text-white text-[14px]">check</span>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Deposit</p>
                    <p className="text-3xl font-black text-[#9F2D5C] mb-1">{formatCents(depositCents)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Secure your spot now. Non-refundable, applied to your total.
                    </p>
                </button>

                {/* Full amount */}
                <button
                    id="choice-full"
                    onClick={() => onChange("full")}
                    className={`relative p-7 rounded-[1.5rem] border-2 text-left transition-all ${paymentChoice === "full"
                        ? "border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10"
                        : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#9F2D5C]/40"
                        }`}
                    aria-pressed={paymentChoice === "full"}
                >
                    {paymentChoice === "full" && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#9F2D5C] flex items-center justify-center">
                            <span className="material-icons text-white text-[14px]">check</span>
                        </div>
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Pay in Full</p>
                    <p className="text-3xl font-black text-[#9F2D5C] mb-1">{formatCents(totalCents)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pay the full service cost today. No balance due at appointment.
                    </p>
                </button>
            </div>
        </section>
    );
}
