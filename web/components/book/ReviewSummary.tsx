import { DEPOSIT_POLICY, CANCELLATION_POLICY, DEPOSIT_AMOUNT } from "@/src/content/legal";

interface ReviewSummaryProps {
    styleName?: string;
    styleDuration?: string;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    photoPreview: string;
}

/** Step 4 body: what the visitor chose, plus the deposit and price notices. */
export function ReviewSummary({ styleName, styleDuration, date, time, name, email, phone, photoPreview }: ReviewSummaryProps) {
    return (
        <div className="space-y-6">
            {/* Details card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Service Details</p>
                            <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{styleName}</p>
                            <p className="text-slate-500">{styleDuration}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">When</p>
                            <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{date || "Not selected"}</p>
                            <p className="text-slate-500">{time || "Not selected"}</p>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-12">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Client Details</p>
                            <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{name || "N/A"}</p>
                            <p className="text-slate-500">{email || "N/A"}</p>
                            {phone && <p className="text-slate-500 mt-1">{phone}</p>}
                        </div>
                        {photoPreview && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Inspiration Photo</p>
                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
                                    <img src={photoPreview} alt="Style inspiration" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Deposit Policy Notice */}
            <div className="flex items-start gap-5 bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10 border border-[#9F2D5C]/20 rounded-[1.5rem] p-7">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#9F2D5C] flex items-center justify-center shadow-lg shadow-[#9F2D5C]/30">
                    <span className="material-icons text-white text-base">lock</span>
                </div>
                <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1">{DEPOSIT_AMOUNT} Non-Refundable Deposit Required</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {DEPOSIT_POLICY} {CANCELLATION_POLICY}
                    </p>
                </div>
            </div>

            {/* Price Discretion Notice */}
            <div className="flex items-start gap-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-[1.5rem] p-7">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="material-icons text-white text-base">info</span>
                </div>
                <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Final Price Disclaimer</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        Price is subject to change at the discretion of the braider based on specific requirements or hair conditions.
                    </p>
                </div>
            </div>
        </div>
    );
}
