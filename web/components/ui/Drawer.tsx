"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Drawer({ isOpen, onClose, title, children, className }: DrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (!isOpen || !drawerRef.current) return;

        const focusableElements = drawerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener("keydown", handleTab);

        // Focus the close button initially for accessibility
        closeButtonRef.current?.focus();

        return () => document.removeEventListener("keydown", handleTab);
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={cn(
                    "relative w-full max-w-sm h-full bg-surface shadow-2xl flex flex-col",
                    "border-l border-border",
                    "animate-in slide-in-from-right duration-300",
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "drawer-title" : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
                    {title ? (
                        <h2 id="drawer-title" className="text-xl font-bold">
                            {title}
                        </h2>
                    ) : (
                        <div /> // Spacer
                    )}
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
                        aria-label="Close menu"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
