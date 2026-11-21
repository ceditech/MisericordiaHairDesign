import type { PaymentProvider } from "@/src/lib/payments/types";

interface PaymentMethodCardProps {
    provider: PaymentProvider;
    selected: boolean;
    onSelect: () => void;
    icon: string;
    label: string;
    description: string;
}

export function PaymentMethodCard({ provider, selected, onSelect, icon, label, description }: PaymentMethodCardProps) {
    return (
        <button
            id={`payment-method-${provider}`}
            onClick={onSelect}
            className={`w-full text-left flex items-center gap-5 p-6 rounded-2xl border-2 transition-all ${selected
                ? "border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10"
                : "border-slate-100 dark:border-slate-700 hover:border-[#9F2D5C]/40 bg-white dark:bg-slate-800"
                }`}
            aria-pressed={selected}
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-[#9F2D5C] text-white shadow-lg shadow-[#9F2D5C]/30" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                <span className="material-icons text-xl">{icon}</span>
            </div>
            <div className="flex-1">
                <p className={`font-bold text-base transition-colors ${selected ? "text-[#9F2D5C]" : "text-slate-900 dark:text-white"}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "border-[#9F2D5C] bg-[#9F2D5C]" : "border-slate-300 dark:border-slate-600"}`}>
                {selected && <span className="material-icons text-white text-[12px]">check</span>}
            </div>
        </button>
    );
}
