import { EmailManager } from "@/src/lib/email/EmailManager";
import { generateShopReceiptEmail, oneLine, shopOrderRef, type ShopReceiptOrder } from "@/src/lib/email/templates/shopReceiptTemplate";

import { getOwnerNotificationEmail } from "@/src/lib/config/adminEmails";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ShopEmailDeps {
    sendEmail: (m: { to: string; subject: string; bodyHtml: string }) => Promise<void>;
    ownerEmail?: string;
}

export interface ShopEmailResult {
    customerSent: boolean;
    ownerSent: boolean;
}

/**
 * Sends the customer receipt and the owner notification for a PAID shop order.
 * Best effort: a failed email is logged and reported, never thrown, so it can never
 * undo or block the payment. Call it only on the step that marks the order paid.
 */
export async function sendShopOrderEmails(
    order: ShopReceiptOrder,
    orderId: string,
    deps: ShopEmailDeps = { sendEmail: (m) => EmailManager.sendEmail(m) },
): Promise<ShopEmailResult> {
    const ref = shopOrderRef(orderId);
    const ownerEmail = deps.ownerEmail ?? getOwnerNotificationEmail();
    const result: ShopEmailResult = { customerSent: false, ownerSent: false };

    const customerEmail = typeof order.customerEmail === "string" ? order.customerEmail.trim() : "";
    if (EMAIL_PATTERN.test(customerEmail)) {
        try {
            await deps.sendEmail({
                to: customerEmail,
                subject: `Order Confirmed - Misericordia Hair Design #${ref}`,
                bodyHtml: generateShopReceiptEmail(order, orderId, "client"),
            });
            result.customerSent = true;
        } catch (error) {
            console.error("[Shop Email] Failed to send customer receipt:", orderId, error);
        }
    }

    try {
        await deps.sendEmail({
            to: ownerEmail,
            subject: oneLine(`New Shop Order #${ref} - ${order.customerName ?? "Customer"}`),
            bodyHtml: generateShopReceiptEmail(order, orderId, "owner"),
        });
        result.ownerSent = true;
    } catch (error) {
        console.error("[Shop Email] Failed to send owner notification:", orderId, error);
    }

    return result;
}

/** Fields written to the order so a missing email is visible later. */
export function emailStatusFields(result: ShopEmailResult, serverTimestamp: unknown) {
    return {
        "emails.customerSent": result.customerSent,
        "emails.ownerSent": result.ownerSent,
        "emails.updatedAt": serverTimestamp,
    };
}
