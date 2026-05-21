import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "elevated";
}

export function Card({ className, variant = "default", children, ...props }: CardProps) {
    const baseStyles = "rounded-2xl border transition-all";

    const variants = {
        default:
            "bg-surface border-border shadow-sm hover:shadow-md",
        elevated:
            "bg-elevated border-border shadow-lg hover:shadow-xl",
    };

    return (
        <div className={cn(baseStyles, variants[variant], className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 pb-4", className)} {...props}>
            {children}
        </div>
    );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 pt-0", className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-6 pt-4 border-t border-slate-100 dark:border-white/5", className)} {...props}>
            {children}
        </div>
    );
}
