"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/src/components/owner/stitch/DashboardShell";
import StitchStyles from "@/src/components/owner/stitch/StitchStyles";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

export default function OwnerStylesPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                <Loader2 size={48} className="animate-spin text-[#6b38d4]" />
            </div>
        );
    }

    const isStitch = process.env.NEXT_PUBLIC_OWNER_DASH_UI === "stitch";

    if (isStitch) {
        return (
            <DashboardShell>
                <StitchStyles />
            </DashboardShell>
        );
    }

    // In legacy mode, there is no styles page so redirect to owner root
    redirect("/owner");
}
