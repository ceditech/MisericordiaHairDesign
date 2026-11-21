import { DEPOSIT_POLICY, CANCELLATION_POLICY, PRICE_NOTE_POLICY } from "@/src/content/legal";

/** Cancellation and price-note policies. */
export function PolicyNotice() {
    return (
        <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-[1.5rem] p-6 text-sm text-amber-800 dark:text-amber-300 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-bold mb-1">
                <span className="material-icons text-base">info</span>
                Cancellation Policy
            </div>
            <p>
                {DEPOSIT_POLICY}
            </p>
            <p>
                {CANCELLATION_POLICY}
            </p>
            <div className="flex items-center gap-2 font-bold mb-1">
                <span className="material-icons text-base">info</span>
                Price Note Policy
            </div>
            <p>
                {PRICE_NOTE_POLICY}
            </p>
        </section>
    );
}
