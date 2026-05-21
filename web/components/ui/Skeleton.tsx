import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "text" | "circular" | "rectangular";
    width?: string | number;
    height?: string | number;
}

export function Skeleton({
    className,
    variant = "rectangular",
    width,
    height,
    style,
    ...props
}: SkeletonProps) {
    const baseStyles = "animate-pulse bg-slate-200 dark:bg-slate-700";

    const variants = {
        text: "rounded h-4",
        circular: "rounded-full",
        rectangular: "rounded-lg",
    };

    return (
        <div
            className={cn(baseStyles, variants[variant], className)}
            style={{
                width: width,
                height: height,
                ...style,
            }}
            {...props}
        />
    );
}
