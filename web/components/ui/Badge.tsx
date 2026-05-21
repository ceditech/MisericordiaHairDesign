import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "error";
    size?: "sm" | "md";
}

export function Badge({ className, variant = "default", size = "md", children, ...props }: BadgeProps) {
    const baseStyles = "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-widest";

    const variants = {
        default: "bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-accent",
        success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
        error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-3 py-1 text-xs",
    };

    return (
        <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
            {children}
        </span>
    );
}
