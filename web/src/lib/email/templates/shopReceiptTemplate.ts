import { escapeHtml } from "@/src/lib/html";

/** The parts of a paid shop order used by the receipt emails. */
export interface ShopReceiptOrder {
    customerName?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    fulfillmentType?: string | null;
    shipping?: { address?: string; city?: string; state?: string; zipCode?: string } | null;
    promoCode?: string | null;
    items?: Array<{ name?: string; quantity?: number; priceCents?: number; selectedOptions?: Record<string, string> | null }>;
    totals?: { subtotalCents?: number; discountCents?: number; taxCents?: number; shippingCents?: number; totalCents?: number };
}

const money = (cents: unknown) => `$${((typeof cents === "number" ? cents : 0) / 100).toFixed(2)}`;
const text = (v: unknown) => escapeHtml(typeof v === "string" ? v : "");

/** A short, safe order reference shown to people (the order id is an unguessable uuid). */
export function shopOrderRef(orderId: string): string {
    return orderId.replace(/^shop_/, "").slice(0, 8).toUpperCase();
}

/** Email subjects must be a single line; customer-entered text is flattened. */
export function oneLine(value: string): string {
    return value.replace(/[\r\n]+/g, " ").trim();
}

function row(label: string, value: string, strong = false) {
    return `<tr><td style="padding:6px 0;color:#64748b;">${label}</td><td style="padding:6px 0;text-align:right;${strong ? "font-weight:800;color:#0f172a;" : "color:#0f172a;"}">${value}</td></tr>`;
}

export function generateShopReceiptEmail(order: ShopReceiptOrder, orderId: string, role: "client" | "owner"): string {
    const isOwner = role === "owner";
    const t = order.totals ?? {};
    const ref = shopOrderRef(orderId);
    const title = isOwner ? "New Shop Order Received" : "Thank you for your order!";
    const pickup = order.fulfillmentType === "pickup";

    const items = (order.items ?? [])
        .map((i) => {
            const opts = i.selectedOptions && Object.keys(i.selectedOptions).length
                ? `<div style="color:#64748b;font-size:12px;">${Object.entries(i.selectedOptions).map(([k, v]) => `${text(k)}: ${text(v)}`).join(", ")}</div>`
                : "";
            const qty = typeof i.quantity === "number" ? i.quantity : 0;
            const unit = typeof i.priceCents === "number" ? i.priceCents : 0;
            return `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${text(i.name)}${opts}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;">×${qty}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${money(unit * qty)}</td></tr>`;
        })
        .join("");

    const s = order.shipping;
    const fulfillment = pickup
        ? "Pickup (we will contact you when your order is ready)"
        : s
            ? `Ship to: ${text(s.address)}, ${text(s.city)}, ${text(s.state)} ${text(s.zipCode)}`
            : "Shipping";

    const customerBlock = isOwner
        ? `<p style="margin:0 0 16px;color:#334155;"><strong>${text(order.customerName)}</strong><br>${text(order.customerEmail)}<br>${text(order.customerPhone)}</p>`
        : `<p style="margin:0 0 16px;color:#475569;">Hi ${text((order.customerName ?? "").split(" ")[0])}, we received your payment. Here is your receipt.</p>`;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:#1e293b;color:#fff;padding:32px 30px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:26px;color:#fff;">Misericordia Hair Design</h1>
    <p style="margin:0;color:#94a3b8;font-size:14px;">Order ${ref}</p>
  </div>
  <div style="padding:32px 30px;color:#334155;">
    <h2 style="margin:0 0 16px;color:#0f172a;">${title}</h2>
    ${customerBlock}
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:16px;">${items}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${row("Subtotal", money(t.subtotalCents))}
      ${t.discountCents ? row(`Discount${order.promoCode ? ` (${text(order.promoCode)})` : ""}`, `-${money(t.discountCents)}`) : ""}
      ${row("Tax", money(t.taxCents))}
      ${row(pickup ? "Pickup" : "Shipping", pickup ? "Free" : money(t.shippingCents))}
      ${row("Total paid", money(t.totalCents), true)}
    </table>
    <p style="margin:20px 0 0;font-size:14px;color:#475569;">${fulfillment}</p>
  </div>
  <div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9;">Misericordia Hair Design · Manor, TX</div>
</div>
</body></html>`;
}
