import { config } from "dotenv";
import { resolve } from "path";

// Load env from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { seedDashboardData } from "../src/lib/db/seed-dashboard";

async function main() {
    try {
        console.log("Running one-time dashboard seed...");
        const results = await seedDashboardData();
        console.log("Success!", results);
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

main();
