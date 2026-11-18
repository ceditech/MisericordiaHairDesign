import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/email/EmailManager", () => ({ EmailManager: { sendEmail: async () => {} } }));

import { generateShopReceiptEmail, oneLine, shopOrderRef, type ShopReceiptOrder } from "@/src/lib/email/templates/shopReceiptTemplate";
import { emailStatusFields, sendShopOrderEmails } from "@/src/lib/shop/shopOrderEmails";

const ID = "shop_123e4567-e89b-42d3-a456-426614174000";
const order = (over: Partial<ShopReceiptOrder> = {}): ShopReceiptOrder => ({
    customerName: "Ann Lee",
    customerEmail: "ann@example.com",
    customerPhone: "555-1234",
    fulfillmentType: "shipping",
    shipping: { address: "1 Main St", city: "Manor", state: "TX", zipCode: "78653" },
    promoCode: "DB-AFF-ABC123",
    items: [
        { name: "Edge Control", quantity: 2, priceCents: 1000, selectedOptions: { Size: "4oz" } },
        { name: "Gel", quantity: 1, priceCents: 500, selectedOptions: null },
    ],
    totals: { subtotalCents: 2500, discountCents: 250, taxCents: 186, shippingCents: 1500, totalCents: 3936 },
    ...over,
});

describe("shop receipt template", () => {
    it("shows items, options, each total line and the shipping address to the customer", () => {
        const html = generateShopReceiptEmail(order(), ID, "client");
        expect(html).toContain("Edge Control");
        expect(html).toContain("Size: 4oz");
        expect(html).toContain("$20.00"); // 2 x $10
        expect(html).toContain("$25.00"); // subtotal
        expect(html).toContain("-$2.50");
        expect(html).toContain("DB-AFF-ABC123");
        expect(html).toContain("$1.86");
        expect(html).toContain("$15.00");
        expect(html).toContain("$39.36");
        expect(html).toContain("1 Main St, Manor, TX 78653");
        expect(html).toContain("Hi Ann");
        expect(html).not.toContain("555-1234"); // contact details are for the owner copy
    });

    it("gives the owner the customer's contact details", () => {
        const html = generateShopReceiptEmail(order(), ID, "owner");
        expect(html).toContain("ann@example.com");
        expect(html).toContain("555-1234");
        expect(html).toContain("New Shop Order Received");
    });

    it("shows pickup (no shipping charge) and omits the discount row when there is none", () => {
        const html = generateShopReceiptEmail(order({ fulfillmentType: "pickup", shipping: null, promoCode: null, totals: { subtotalCents: 2500, discountCents: 0, taxCents: 206, shippingCents: 0, totalCents: 2706 } }), ID, "client");
        expect(html).toContain("Pickup");
        expect(html).toContain("Free");
        expect(html).not.toContain("Discount");
    });

    it("escapes customer-entered text so it cannot inject HTML", () => {
        const html = generateShopReceiptEmail(
            order({ customerName: "<script>alert(1)</script>", shipping: { address: "<img src=x onerror=y>", city: "a", state: "b", zipCode: "c" }, items: [{ name: "<b>x</b>", quantity: 1, priceCents: 100, selectedOptions: { "<k>": "<v>" } }] }),
            ID,
            "owner",
        );
        expect(html).not.toContain("<script>");
        expect(html).not.toContain("<img src=x");
        expect(html).not.toContain("<b>x</b>");
        expect(html).toContain("&lt;script&gt;");
    });

    it("builds a short reference and one-line subjects", () => {
        expect(shopOrderRef(ID)).toBe("123E4567");
        expect(oneLine("Ann\r\nBcc: evil@x.com")).toBe("Ann Bcc: evil@x.com");
    });
});

describe("sendShopOrderEmails", () => {
    it("sends the customer receipt and the owner notification", async () => {
        const sent: Array<{ to: string; subject: string }> = [];
        const r = await sendShopOrderEmails(order(), ID, { sendEmail: async (m) => void sent.push(m), ownerEmail: "owner@example.com" });
        expect(r).toEqual({ customerSent: true, ownerSent: true });
        expect(sent.map((m) => m.to)).toEqual(["ann@example.com", "owner@example.com"]);
        expect(sent[0].subject).toContain("#123E4567");
    });

    it("keeps a header-injection attempt in the customer name out of the subject line", async () => {
        const sent: Array<{ subject: string }> = [];
        await sendShopOrderEmails(order({ customerName: "Ann\r\nBcc: evil@x.com" }), ID, { sendEmail: async (m) => void sent.push(m), ownerEmail: "o@x.co" });
        expect(sent.every((m) => !/[\r\n]/.test(m.subject))).toBe(true);
    });

    it("still notifies the owner when the customer email is missing or invalid", async () => {
        const sent: string[] = [];
        const r = await sendShopOrderEmails(order({ customerEmail: "not-an-email" }), ID, { sendEmail: async (m) => void sent.push(m.to), ownerEmail: "o@x.co" });
        expect(r).toEqual({ customerSent: false, ownerSent: true });
        expect(sent).toEqual(["o@x.co"]);
    });

    it("never throws when sending fails, and reports what was not sent", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const r = await sendShopOrderEmails(order(), ID, {
            sendEmail: async (m) => {
                if (m.to === "ann@example.com") throw new Error("smtp down");
            },
            ownerEmail: "o@x.co",
        });
        expect(r).toEqual({ customerSent: false, ownerSent: true });
        const none = await sendShopOrderEmails(order(), ID, { sendEmail: async () => { throw new Error("down"); }, ownerEmail: "o@x.co" });
        expect(none).toEqual({ customerSent: false, ownerSent: false });
    });

    it("falls back to the default owner address", async () => {
        delete process.env.OWNER_NOTIFICATION_EMAIL;
        const sent: string[] = [];
        await sendShopOrderEmails(order({ customerEmail: null }), ID, { sendEmail: async (m) => void sent.push(m.to) });
        expect(sent).toEqual(["sales@edxstore.com"]);
    });

    it("builds the status fields stored on the order", () => {
        expect(emailStatusFields({ customerSent: true, ownerSent: false }, "TS")).toEqual({
            "emails.customerSent": true,
            "emails.ownerSent": false,
            "emails.updatedAt": "TS",
        });
    });
});
