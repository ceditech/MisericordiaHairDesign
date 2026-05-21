/**
 * payment-env/page.tsx
 * 
 * Diagnostic page to verify that the server-side payment environment variables 
 * are correctly set up (e.g. key presence, prefixes) WITHOUT exposing the secrets.
 */

export const dynamic = "force-dynamic";

export default function PaymentEnvDebug() {
    // Collect non-sensitive metadata from environment
    const stripeSet = !!process.env.STRIPE_SECRET_KEY;
    const stripePrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 7) || "None";
    const stripeWebhookSet = !!process.env.STRIPE_WEBHOOK_SECRET;

    const paypalSet = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;
    const paypalIdPrefix = process.env.PAYPAL_CLIENT_ID?.substring(0, 7) || "None";
    const paypalMode = process.env.PAYPAL_MODE || "sandbox";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Configuration Diagnostics</h1>
                    <p className="text-slate-500 dark:text-slate-400">Verify server-side environment setup (Secrets are NOT shown)</p>
                </header>

                {/* Stripe Card */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                <span className="material-icons text-indigo-600 dark:text-indigo-400">payments</span>
                            </span>
                            <h2 className="text-lg font-semibold dark:text-white">Stripe Checkout</h2>
                        </div>
                        <StatusBadge active={stripeSet} />
                    </div>

                    <div className="space-y-3">
                        <InfoRow label="Secret Key Set" value={stripeSet ? "Yes" : "No"} />
                        <InfoRow label="Key Prefix" value={stripePrefix + "..."} />
                        <InfoRow label="Webhook Secret" value={stripeWebhookSet ? "Yes" : "No"} />
                    </div>
                </section>

                {/* PayPal Card */}
                <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <span className="material-icons text-blue-600 dark:text-blue-400">account_balance_wallet</span>
                            </span>
                            <h2 className="text-lg font-semibold dark:text-white">PayPal Hosted</h2>
                        </div>
                        <StatusBadge active={paypalSet} />
                    </div>

                    <div className="space-y-3">
                        <InfoRow label="Credentials Set" value={paypalSet ? "Yes (ID & Secret)" : "No"} />
                        <InfoRow label="Client ID Prefix" value={paypalIdPrefix + "..."} />
                        <InfoRow label="Current Mode" value={paypalMode} isMode />
                    </div>
                </section>

                <footer className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                    <div className="flex gap-3">
                        <span className="material-icons text-blue-500 text-lg">info</span>
                        <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            <strong>Note on Keys:</strong> If any key above shows "None" or No, you must add it to your 
                            <code>.env.local</code> file and restart the dev server. Trimming is automatically applied to 
                            all keys server-side to prevent whitespace errors.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            active 
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" 
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        }`}>
            {active ? "Configured" : "Missing"}
        </span>
    );
}

function InfoRow({ label, value, isMode }: { label: string; value: string; isMode?: boolean }) {
    return (
        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`text-sm font-mono ${
                isMode && value === "live" ? "text-orange-600 font-bold" : "text-slate-900 dark:text-slate-200"
            }`}>
                {value}
            </span>
        </div>
    );
}
