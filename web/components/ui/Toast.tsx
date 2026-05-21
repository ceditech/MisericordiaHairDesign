"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const showToast = useCallback((message: string, variant: ToastVariant = "info", duration = 5000) => {
        const id = Math.random().toString(36).substring(7);
        const toast: Toast = { id, message, variant, duration };

        setToasts((prev) => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {mounted && typeof window !== "undefined" && document.body &&
                createPortal(
                    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
                        {toasts.map((toast) => (
                            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                        ))}
                    </div>,
                    document.body
                )}
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const variants = {
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
        info: "bg-blue-500 text-white",
        warning: "bg-yellow-500 text-white",
    };

    const icons = {
        success: "check_circle",
        error: "error",
        info: "info",
        warning: "warning",
    };

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto",
                "animate-in slide-in-from-right duration-300",
                variants[toast.variant]
            )}
        >
            <span className="material-icons text-xl">{icons[toast.variant]}</span>
            <p className="flex-1 font-medium">{toast.message}</p>
            <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Close toast"
            >
                <span className="material-icons text-sm">close</span>
            </button>
        </div>
    );
}
