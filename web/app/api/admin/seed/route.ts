import { NextResponse } from "next/server";
import { seedDashboardData } from "@/src/lib/db/seed-dashboard";
import { withAuth } from "@/src/lib/auth/withAuth";

/**
 * POST /api/admin/seed
 * Super admin only (matches the "Developer Tools" menu in the dashboard).
 * Was an unauthenticated GET; GET is no longer exported (Next answers 405).
 */
export const POST = withAuth(["superAdmin"], async (_req, auth) => {
    try {
        console.log(`[Admin API] Dashboard seed started by ${auth.uid}`);
        const results = await seedDashboardData();
        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("[Admin API] Seeding failed:", error);
        return NextResponse.json({ success: false, message: "Seeding failed" }, { status: 500 });
    }
});
