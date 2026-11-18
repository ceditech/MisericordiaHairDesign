import { describe, expect, it } from "vitest";
import { allowedOriginsFor, buildCreateOrderBody, findApprovalLink, isAllowedReturnUrl } from "@/src/lib/payments/paypalOrderBody";

interface Body {
    intent: string;
    purchase_units: Array<{ amount: unknown }>;
    payment_source?: { paypal: { experience_context: Record<string, unknown> } };
}

describe("buildCreateOrderBody", () => {
    it("formats the amount in dollars and has no payment_source without return urls", () => {
        const body = buildCreateOrderBody(5000, "USD", "Deposit") as unknown as Body;
        expect(body.intent).toBe("CAPTURE");
        expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "50.00" });
        expect(body.payment_source).toBeUndefined();
    });

    it("sends the buyer back to our return and cancel urls and asks PayPal for Pay Now", () => {
        const body = buildCreateOrderBody(1234, "USD", "x", { returnUrl: "https://a.test/ok", cancelUrl: "https://a.test/no" }) as unknown as Body;
        expect((body.purchase_units[0].amount as { value: string }).value).toBe("12.34");
        expect(body.payment_source?.paypal.experience_context).toMatchObject({
            return_url: "https://a.test/ok",
            cancel_url: "https://a.test/no",
            user_action: "PAY_NOW",
        });
    });
});

describe("findApprovalLink", () => {
    it("prefers approve, falls back to payer-action, else undefined", () => {
        expect(findApprovalLink([{ rel: "self", href: "s" }, { rel: "approve", href: "a" }, { rel: "payer-action", href: "p" }])).toBe("a");
        expect(findApprovalLink([{ rel: "payer-action", href: "p" }])).toBe("p");
        expect(findApprovalLink([{ rel: "self", href: "s" }])).toBeUndefined();
        expect(findApprovalLink(undefined)).toBeUndefined();
    });
});

describe("isAllowedReturnUrl", () => {
    const allowed = ["https://site.test"];
    it("accepts urls on an allowed origin", () => {
        expect(isAllowedReturnUrl("https://site.test/booking/success?draftId=1", allowed)).toBe(true);
    });
    it("rejects other origins, bad schemes, non-strings and garbage", () => {
        expect(isAllowedReturnUrl("https://evil.test/x", allowed)).toBe(false);
        expect(isAllowedReturnUrl("https://site.test.evil.test/x", allowed)).toBe(false);
        expect(isAllowedReturnUrl("javascript:alert(1)", allowed)).toBe(false);
        expect(isAllowedReturnUrl(undefined, allowed)).toBe(false);
        expect(isAllowedReturnUrl("not a url", allowed)).toBe(false);
    });
});

describe("allowedOriginsFor", () => {
    it("includes the request origin and the forwarded host", () => {
        const headers = new Headers({ "x-forwarded-host": "shop.test", "x-forwarded-proto": "https" });
        const origins = allowedOriginsFor({ url: "http://localhost:3000/api/x", headers });
        expect(origins).toContain("http://localhost:3000");
        expect(origins).toContain("https://shop.test");
    });
});
