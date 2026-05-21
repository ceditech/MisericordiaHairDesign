"use client";

import { useState, useEffect } from "react";
import { useRequireOwner } from "@/src/hooks/useRequireOwner";
import { Loader2 } from "lucide-react";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    const isOwner = useRequireOwner();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isOwner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="animate-spin text-[#a319c5]" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
                        Verifying Authorization...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
