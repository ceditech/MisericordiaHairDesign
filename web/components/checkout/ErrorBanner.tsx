/** Shown when a payment step failed. A missing message gets a generic one. */
export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
    return (
        <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-5">
            <span className="material-icons text-red-500 text-xl">error_outline</span>
            <p className="text-sm text-red-600 dark:text-red-400 font-semibold flex-1">
                {message ?? "Something went wrong. Please try again."}
            </p>
            <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Dismiss error"
            >
                <span className="material-icons text-base">close</span>
            </button>
        </div>
    );
}
