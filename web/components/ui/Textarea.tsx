import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        "w-full px-4 py-3 rounded-lg border-2 bg-white dark:bg-surface-dark",
                        "border-slate-200 dark:border-white/10",
                        "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
                        "transition-all outline-none resize-y min-h-[120px]",
                        "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

export { Textarea };
