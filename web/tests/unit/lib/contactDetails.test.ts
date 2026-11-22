import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/src/content/legal";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";

// The customer-facing phone number and email live in src/content/legal.ts only. Other files import them, so a
// change there reaches every page and email. This test fails if someone pastes a copy back into the code.

const root = resolve(__dirname, "../../..");
const SOURCE_DIRS = ["app", "src", "components"];
// adminEmails.ts names the owner's account as super admin and notification recipient. That is a separate setting from the
// public contact email, so the two should not change together by accident.
const EXCLUDED = new Set([join("src", "content", "legal.ts"), join("src", "lib", "config", "adminEmails.ts")]);

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) return name === "node_modules" || name === ".next" ? [] : sourceFiles(full);
        return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
}

const PHONE = /\(?945\)?[\s.-]*275[\s.-]*4778|\+?1?9452754778/;
const EMAIL = /mariefleurekpe@gmail\.com|info@misericordiahairdesign\.com/i;

describe("customer contact details", () => {
    it("have one source of truth", () => {
        expect(CONTACT_EMAIL).toBe("mariefleurekpe@gmail.com");
        expect(CONTACT_PHONE).toBe("(945) 275-4778");
        expect(CONTACT_PHONE_TEL).toBe("tel:+19452754778");
    });

    it("are not copied into pages, components or emails", () => {
        const offenders: string[] = [];
        for (const dir of SOURCE_DIRS) {
            for (const file of sourceFiles(join(root, dir))) {
                const rel = relative(root, file);
                if (EXCLUDED.has(rel)) continue;
                const text = readFileSync(file, "utf8");
                if (PHONE.test(text)) offenders.push(`${rel}: phone number`);
                if (EMAIL.test(text)) offenders.push(`${rel}: email address`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it("show up in the receipt email footer", () => {
        const html = generateElegantReceiptEmail({ clientName: "Ada", date: "d", time: "t", styleName: "s" } as Parameters<typeof generateElegantReceiptEmail>[0], "b1", "client", "$50.00");
        expect(html).toContain(CONTACT_PHONE);
        expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
    });
});
