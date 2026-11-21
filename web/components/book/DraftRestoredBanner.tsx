export function DraftRestoredBanner({ onStartOver, onDismiss }: { onStartOver: () => void; onDismiss: () => void }) {
    return (
        <div className="max-w-4xl mx-auto mb-8 flex items-center gap-4 bg-[#9F2D5C]/8 dark:bg-[#9F2D5C]/10 border border-[#9F2D5C]/20 rounded-2xl px-6 py-4">
            <span className="material-icons text-[#9F2D5C] text-base">restore</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">
                We restored your booking draft. Pick up right where you left off!
            </p>
            <button
                onClick={onStartOver}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Dismiss and clear draft"
            >
                Start over
            </button>
            <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Dismiss banner"
            >
                <span className="material-icons text-base">close</span>
            </button>
        </div>
    );
}
