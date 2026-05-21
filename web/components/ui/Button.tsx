import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
        const baseStyles =
            "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:pointer-events-none";

        const variants = {
            primary:
                "bg-brand-primary hover:bg-brand-secondary text-white shadow-lg shadow-brand-primary/20 hover:shadow-brand-lg",
            secondary:
                "border-2 border-border bg-surface hover:border-brand-primary text-text-primary",
            ghost: "hover:bg-slate-100 dark:hover:bg-white/5 text-text-primary",
        };

        const sizes = {
            sm: "px-4 py-2 text-sm",
            md: "px-6 py-2.5 text-base",
            lg: "px-10 py-4 text-lg",
        };

        return (
            <button
                ref={ref}
                suppressHydrationWarning
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <span className="material-icons animate-spin text-sm">refresh</span>
                        Loading...
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
