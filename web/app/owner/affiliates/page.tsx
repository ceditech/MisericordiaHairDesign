"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/src/components/owner/stitch/DashboardShell";
import StitchAffiliates from "@/src/components/owner/stitch/StitchAffiliates";
import { Loader2 } from "lucide-react";

export default function OwnerAffiliatesPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const isStitch = process.env.NEXT_PUBLIC_OWNER_DASH_UI === "stitch";
        if (!isStitch) {
            router.replace("/owner");
        }
    }, [router]);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 size={48} className="animate-spin text-[#6b38d4]" />
            </div>
        );
    }

    return (
        <DashboardShell>
            <StitchAffiliates />
        </DashboardShell>
    );
}
