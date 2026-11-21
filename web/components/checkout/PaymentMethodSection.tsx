import type { PaymentProvider } from "@/src/lib/payments/types";
import { PaymentMethodCard } from "./PaymentMethodCard";

/** Card or PayPal, plus the security badges. */
export function PaymentMethodSection({ provider, onSelect }: { provider: PaymentProvider; onSelect: (provider: PaymentProvider) => void }) {
    return (
        <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                Payment Method
            </h2>
            <div className="space-y-3">
                <PaymentMethodCard
                    provider="stripe"
                    selected={provider === "stripe"}
                    onSelect={() => onSelect("stripe")}
                    icon="credit_card"
                    label="Credit / Debit Card"
                    description="Visa, Mastercard, Amex — powered by Stripe"
                />
                <PaymentMethodCard
                    provider="paypal"
                    selected={provider === "paypal"}
                    onSelect={() => onSelect("paypal")}
                    icon="account_balance_wallet"
                    label="PayPal"
                    description="Pay with your PayPal balance or linked card"
                />
            </div>

            {/* Security badges */}
            <div className="flex flex-wrap gap-3 mt-5">
                {["🔒 SSL Encrypted", "✓ Stripe Secured", "✓ PayPal Buyer Protection"].map((badge) => (
                    <span key={badge} className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1.5 rounded-full">
                        {badge}
                    </span>
                ))}
            </div>
        </section>
    );
}
