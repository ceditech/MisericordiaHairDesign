interface PromoCodeBoxProps {
    /** What the visitor has typed. */
    promoCode: string;
    /** The code that was accepted, or null. */
    appliedCode: string | null;
    onChange: (value: string) => void;
    onApply: () => void;
    onRemove: () => void;
}

/** Promo code field, or the "Code Applied" row once one is accepted. */
export function PromoCodeBox({ promoCode, appliedCode, onChange, onApply, onRemove }: PromoCodeBoxProps) {
    return (
        <>
        {!appliedCode ? (
            <div className="mt-8 pt-8 border-t border-border">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Promo Code"
                        value={promoCode}
                        onChange={(e) => onChange(e.target.value)}
                        className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#9F2D5C] transition-colors"
                    />
                    <button
                        onClick={onApply}
                        disabled={!promoCode.trim()}
                        className="bg-[#9F2D5C]/20 hover:bg-[#9F2D5C]/30 text-[#9F2D5C] px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        Apply
                    </button>
                </div>
            </div>
        ) : (
            <div className="mt-8 pt-8 border-t border-border flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <span className="material-icons text-xs">check_circle</span>
                    Code Applied
                </div>
                <button
                    onClick={onRemove}
                    className="text-text-muted hover:text-text-primary text-[10px] font-black uppercase tracking-widest underline underline-offset-4"
                >
                    Remove
                </button>
            </div>
        )}
        </>
    );
}
