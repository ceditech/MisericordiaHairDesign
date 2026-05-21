"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/src/components/owner/stitch/DashboardShell";
import StitchInventory from "@/src/components/owner/stitch/StitchInventory";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

export default function OwnerInventoryPage() {
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
                <StitchInventory />
            </DashboardShell>
        );
    }

    // In legacy mode, there is no inventory separate page (it was in the main dashboard tab) so redirect to owner root
    redirect("/owner");
}
