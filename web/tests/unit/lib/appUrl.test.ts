import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_URL, getAppUrl, getAppHost } from "@/src/lib/config/appUrl";
import { generateElegantReceiptEmail } from "@/src/lib/email/templates/receiptTemplate";
import { buildReminderEmail } from "@/src/lib/notifications/emailTemplates";

afterEach(() => vi.unstubAllEnvs());

describe("getAppUrl", () => {
    it("defaults to the production site when nothing is configured", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        expect(getAppUrl()).toBe("https://misericordiahairdesign.com");
        expect(DEFAULT_APP_URL).toBe("https://misericordiahairdesign.com");
    });

    it("uses NEXT_PUBLIC_APP_URL when it is a web address", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
        expect(getAppUrl()).toBe("https://staging.example.com");
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
        expect(getAppUrl()).toBe("http://localhost:3000");
    });

    it.each([
        ["https://staging.example.com/", "https://staging.example.com"],
        ["https://staging.example.com///", "https://staging.example.com"],
        ["  https://staging.example.com  ", "https://staging.example.com"],
        ["https://example.com/app/", "https://example.com/app"],
    ])("tidies %j to %j so links built with `${base}/path` stay correct", (value, expected) => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
        expect(getAppUrl()).toBe(expected);
    });

    it.each(["   ", "not a url", "javascript:alert(1)", "ftp://example.com", "//example.com", "example.com"])(
        "ignores %j and falls back to the default (never builds a link from it)",
        (value) => {
            vi.stubEnv("NEXT_PUBLIC_APP_URL", value);
            expect(getAppUrl()).toBe(DEFAULT_APP_URL);
        }
    );

    it("gives the host for display", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        expect(getAppHost()).toBe("misericordiahairdesign.com");
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com:8443/app");
        expect(getAppHost()).toBe("staging.example.com:8443");
    });
});

describe("email links use the configured app URL", () => {
    const draft = { clientName: "Ada", date: "November 25, 2026", time: "10:00 AM", styleName: "Box Braids" } as Parameters<typeof generateElegantReceiptEmail>[0];

    it("receipt: contact link for clients and dashboard link for the owner", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
        const client = generateElegantReceiptEmail(draft, "b1", "client", "$50.00");
        expect(client).toContain('href="https://staging.example.com/contact"');
        expect(client).not.toContain("misericordiahairdesign.com/contact");

        const owner = generateElegantReceiptEmail(draft, "b1", "owner", "$50.00");
        expect(owner).toContain('href="https://staging.example.com/owner/dashboard"');
    });

    it("receipt: unchanged production links when no URL is configured", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        expect(generateElegantReceiptEmail(draft, "b1", "client", "$50.00")).toContain('href="https://misericordiahairdesign.com/contact"');
        expect(generateElegantReceiptEmail(draft, "b1", "owner", "$50.00")).toContain('href="https://misericordiahairdesign.com/owner/dashboard"');
    });

    it("reminder: the policies link follows the configured URL", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
        const email = buildReminderEmail({ date: "November 25, 2026", time: "10:00 AM", clientName: "Ada", styleName: "Box Braids" });
        expect(email.html).toContain('href="https://staging.example.com/policies"');

        vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
        expect(buildReminderEmail({ date: "d", time: "t" }).html).toContain('href="https://misericordiahairdesign.com/policies"');
    });
});
