import { NextResponse } from "next/server";
import { seedDashboardData } from "@/src/lib/db/seed-dashboard";

export async function GET() {
    try {
        console.log("[Admin API] Starting dashboard data seed...");
        const results = await seedDashboardData();
        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("[Admin API] Seeding failed:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Seeding failed", 
            error: error.message 
        }, { status: 500 });
    }
}
