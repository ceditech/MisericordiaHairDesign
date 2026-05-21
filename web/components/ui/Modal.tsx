"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

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

    // Prevent body scroll when modal is open
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
        if (!isOpen || !modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
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
        firstElement?.focus();

        return () => document.removeEventListener("keydown", handleTab);
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={cn(
                    "relative bg-surface rounded-2xl shadow-2xl",
                    "max-w-lg w-full max-h-[90vh] overflow-y-auto",
                    "border border-border",
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
            >
                {/* Header and Content combined into a new structure */}
                <div className="p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 id="modal-title" className="text-2xl font-black text-text-primary">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-text-muted"
                            aria-label="Close modal"
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
