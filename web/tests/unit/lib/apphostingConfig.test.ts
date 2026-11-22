import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_APP_URL } from "@/src/lib/config/appUrl";

// Guards the production deploy config. The Gmail sign-in redirect must point at the production domain and the callback
// route the app serves, and it must also be registered on the Google OAuth client (Google Cloud Console), or
// "Connect Gmail" on the owner dashboard stops working.

const yaml = readFileSync(resolve(__dirname, "../../../apphosting.yaml"), "utf8").replace(/\r\n/g, "\n");
const valueOf = (variable: string) => yaml.match(new RegExp(`- variable: ${variable}\\n\\s+value: "([^"]*)"`))?.[1];

describe("apphosting.yaml", () => {
    it("sends the Gmail sign-in redirect to the production domain's callback route", () => {
        expect(valueOf("GOOGLE_REDIRECT_URI")).toBe(`${DEFAULT_APP_URL}/api/admin/email/callback`);
    });

    it("the callback route exists in the app", () => {
        const route = resolve(__dirname, "../../../app/api/admin/email/callback/route.ts");
        expect(readFileSync(route, "utf8")).toContain("export async function GET");
    });

    it("keeps secrets out of plain values", () => {
        for (const secretName of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PAYPAL_CLIENT_SECRET", "FIREBASE_SERVICE_ACCOUNT_KEY", "GOOGLE_CLIENT_SECRET"]) {
            expect(valueOf(secretName), secretName).toBeUndefined();
            expect(yaml).toMatch(new RegExp(`- variable: ${secretName}\\n\\s+secret: `));
        }
    });
});
