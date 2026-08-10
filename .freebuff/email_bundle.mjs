// supabase/functions/notifications-drain/email.ts
var STATUS_NOTES = {
  ready_for_pickup: "Your order has been packed and is awaiting pickup by our delivery partner.",
  picked_up: "Your order has been picked up from the vendor and is on its way.",
  shipped: "Your order has shipped and is now in transit.",
  in_transit: "Your order is in transit to its destination.",
  out_for_delivery: "Your order is out for delivery \u2014 it should arrive very soon.",
  delivered: "Your order has been delivered. We hope you love it!"
};
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : "";
}
function humanStatus(status) {
  if (!status) return "Updated";
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function formatAmount(amount, currency) {
  const n = typeof amount === "number" ? amount : typeof amount === "string" ? parseFloat(amount) : NaN;
  if (Number.isNaN(n)) return "";
  const c = (currency || "USD").toUpperCase();
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === "NGN") return `\u20A6${s}`;
  if (c === "USD") return `$${s}`;
  return `${s} ${c}`;
}
function para(text) {
  return `<p style="margin:0 0 14px; font-size:14px; line-height:1.7; color:#333333;">${text}</p>`;
}
function note(text) {
  return `<p style="margin:16px 0 0; padding:13px 16px; background-color:#F5EFDC; border-left:3px solid #D4AF37; border-radius:8px; font-size:13px; line-height:1.6; color:#5C4A00;">\u2726&nbsp; ${text}</p>`;
}
function summaryRow(label, value, gold = false) {
  return `<tr>
    <td style="padding:5px 0; font-size:13px; color:#6B6B6B;">${esc(label)}</td>
    <td align="right" style="padding:5px 0; font-size:13px; font-weight:600; color:${gold ? "#B8860B" : "#1A1A1A"};">${value}</td>
  </tr>`;
}
function itemsTable(items, fmt) {
  if (items.length === 0) return "";
  const rows = items.map((it) => {
    const thumb = it.image_url ? `<img src="${esc(it.image_url)}" width="56" height="56" alt="" style="display:block; width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid #E9DFC0;" />` : `<div style="width:56px; height:56px; border-radius:8px; background-color:#F5EFDC; border:1px solid #E9DFC0;">&nbsp;</div>`;
    return `<tr>
        <td style="padding:10px 0; border-bottom:1px solid #F0E8D0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="64" style="vertical-align:middle;">${thumb}</td>
              <td style="padding-left:14px; vertical-align:middle;">
                <div style="font-size:13px; font-weight:600; color:#1A1A1A; line-height:1.35;">${esc(it.name || "Product")}</div>
                <div style="font-size:12px; color:#8A8A8A; margin-top:2px;">Qty&nbsp;${it.quantity}</div>
              </td>
              <td align="right" style="vertical-align:middle; white-space:nowrap; padding-left:12px;">
                <div style="font-size:13px; font-weight:700; color:#1A1A1A;">${fmt(it.unit_price * it.quantity)}</div>
                <div style="font-size:11px; color:#8A8A8A;">${fmt(it.unit_price)} each</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border:1px solid #E9DFC0; border-left:3px solid #D4AF37; border-radius:10px; margin:22px 0 6px;">
    <tr>
      <td style="padding:18px 20px 6px;">
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#B8860B; font-weight:700; margin-bottom:6px;">Items In This Order</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td>
    </tr>
  </table>`;
}
function summaryBox(rows) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; border:1px solid #E9DFC0; border-left:3px solid #D4AF37; border-radius:10px; margin:22px 0 6px;">
    <tr>
      <td style="padding:18px 20px 14px;">
        <div style="font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#B8860B; font-weight:700; margin-bottom:6px;">Order Summary</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td>
    </tr>
  </table>`;
}
function emailShell(opts) {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const host = opts.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<title>${esc(opts.preheader)}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style type="text/css">
  .btn-gold:hover { filter: brightness(1.08); }
  .btn-gold:active { filter: brightness(0.94); }
  .pill-gold:hover { filter: brightness(1.06); }
</style>
</head>
<body style="margin:0; padding:0; background-color:#0A0A0A; font-family:'Inter',Arial,Helvetica,sans-serif; -webkit-font-smoothing:antialiased;">
  <div style="display:none; font-size:1px; color:#0A0A0A; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#0F0F0F; padding:30px 24px 24px; border-radius:14px 14px 0 0;">
              <div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif; font-size:26px; font-weight:600; letter-spacing:7px; color:#D4AF37; text-transform:uppercase;">MySuperStore</div>
              <div style="font-size:10px; letter-spacing:4px; color:#777777; text-transform:uppercase; margin-top:7px;">Luxury&nbsp;&nbsp;&bull;&nbsp;&nbsp;Delivered</div>
            </td>
          </tr>

          <!-- Gold rule -->
          <tr><td style="height:3px; background-color:#B8860B; background-image:linear-gradient(90deg,#B8860B 0%,#F5E0A3 50%,#B8860B 100%); font-size:0; line-height:0;">&nbsp;</td></tr>

          <!-- Hero -->
          <tr>
            <td align="center" style="background-color:#0F0F0F; padding:34px 24px 32px;">
              <span class="pill-gold" style="display:inline-block; background-color:#D4AF37; background-image:linear-gradient(135deg,#FFE55C 0%,#FFF8DC 15%,#D4AF37 40%,#B8941F 60%,#8B7620 85%,#5D4E37 100%); color:#050505; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:9px 20px; border-radius:999px; border:2px solid rgba(255,229,92,0.55); box-shadow:0 6px 20px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.5);">${esc(opts.pill)}</span>
              <h1 style="margin:18px 0 0; font-family:'Oswald','Arial Narrow',Arial,sans-serif; font-size:27px; font-weight:500; letter-spacing:2px; text-transform:uppercase; color:#FFFFFF; line-height:1.25;">${esc(opts.title)}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color:#FAFAFA; padding:34px 30px 8px;">
              ${opts.content}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="background-color:#FAFAFA; padding:26px 30px 38px;">
              <a class="btn-gold" href="${esc(opts.ctaUrl)}" style="display:inline-block; background-color:#D4AF37; background-image:linear-gradient(90deg, rgba(255,229,92,0) 0%, rgba(255,248,220,0.7) 25%, rgba(255,229,92,0) 50%, rgba(255,248,220,0.7) 75%, rgba(255,229,92,0) 100%), linear-gradient(135deg,#FFE55C 0%,#FFF8DC 15%,#D4AF37 40%,#B8941F 60%,#8B7620 85%,#5D4E37 100%); color:#050505; font-size:13px; font-weight:700; letter-spacing:2px; text-transform:uppercase; text-decoration:none; padding:16px 40px; border-radius:12px; border:2px solid rgba(255,229,92,0.55); box-shadow:0 10px 30px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.4);">${esc(opts.ctaText)}&nbsp;&rarr;</a>
              <div style="margin-top:16px; font-size:12px;">
                <a href="${esc(opts.ctaUrl)}" style="color:#B8860B; text-decoration:underline;">${esc(opts.secondaryText)}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#0A0A0A; padding:26px 24px 30px; border-radius:0 0 14px 14px;">
              <div style="font-family:'Oswald','Arial Narrow',Arial,sans-serif; font-size:13px; letter-spacing:4px; color:#D4AF37; text-transform:uppercase;">MySuperStore</div>
              <div style="font-size:11px; color:#8A8A8A; margin-top:10px; letter-spacing:0.5px;">
                <a href="${esc(opts.siteUrl)}/shop" style="color:#8A8A8A; text-decoration:none;">Shop</a>
                &nbsp;&nbsp;&bull;&nbsp;&nbsp;
                <a href="${esc(opts.siteUrl)}/account" style="color:#8A8A8A; text-decoration:none;">My Account</a>
                &nbsp;&nbsp;&bull;&nbsp;&nbsp;
                <a href="${esc(opts.siteUrl)}/about" style="color:#8A8A8A; text-decoration:none;">About</a>
              </div>
              <div style="font-size:11px; color:#555555; margin-top:12px;">&copy; ${year} Monarch Group &middot; All rights reserved</div>
              <div style="font-size:10px; color:#444444; margin-top:6px;">You received this email because of activity on your ${esc(host)} account.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
function buildEmail(row, order, audience, siteUrl, items = [], payment = null) {
  const orderId = shortId(row.order_id);
  const rawOrderId = row.order_id ?? "";
  const payload = row.payload ?? {};
  const newStatus = typeof payload.new_status === "string" ? payload.new_status : null;
  const oldStatus = typeof payload.old_status === "string" ? payload.old_status : null;
  const statusText = humanStatus(newStatus);
  const oldStatusText = humanStatus(oldStatus);
  const placed = formatDate(order?.placed_at ?? null);
  const isCustomer = audience === "customer";
  const paidRate = isCustomer && payment && order?.total_amount && order.total_amount > 0 ? Number(payment.amount) / Number(order.total_amount) : null;
  const displayCurrency = isCustomer && payment ? payment.currency : "USD";
  const fmt = (usdAmount) => paidRate ? formatAmount(usdAmount * paidRate, displayCurrency) : formatAmount(usdAmount, "USD");
  const totalLabel = isCustomer && payment ? formatAmount(payment.amount, payment.currency) : formatAmount(order?.total_amount ?? 0, "USD");
  const trackUrl = `${siteUrl}/track/${encodeURIComponent(rawOrderId)}`;
  const vendorUrl = `${siteUrl}/vendor/orders`;
  const partnerUrl = `${siteUrl}/delivery/orders`;
  const baseSummaryRows = summaryRow("Order", orderId, true) + (placed ? summaryRow("Placed", placed) : "") + summaryRow("Total", totalLabel, true);
  switch (row.event_type) {
    case "vendor_order_paid": {
      const business = typeof payload.business_name === "string" ? payload.business_name : "your store";
      return {
        subject: `New paid order ${orderId} is waiting for you`,
        html: emailShell({
          preheader: `New paid order ${orderId} is waiting for you in your vendor dashboard`,
          pill: "New Paid Order",
          title: "A New Order Is Waiting",
          content: para(`Hello ${esc(business)},`) + para(
            `A new order ${orderId} has just been placed and <strong>paid for</strong> in your store. Please review the items and prepare the package.`
          ) + para(
            `Once everything is packed, mark the order as <strong>ready for pickup</strong> so our delivery partners can collect it and begin delivery.`
          ) + itemsTable(items, fmt) + summaryBox(baseSummaryRows),
          ctaText: "Review & Mark Ready",
          ctaUrl: vendorUrl,
          secondaryText: "Open Vendor Dashboard",
          siteUrl
        })
      };
    }
    case "order_ready_for_delivery": {
      return {
        subject: `Order ${orderId} is ready for pickup \u2014 accept the delivery`,
        html: emailShell({
          preheader: `Order ${orderId} is ready for pickup \u2014 accept it to begin delivery`,
          pill: "Ready For Pickup",
          title: "A Delivery Awaits Your Acceptance",
          content: para("Hello delivery partner,") + para(
            `Order ${orderId} has been <strong>packed by the vendor</strong> and marked ready for pickup.`
          ) + para(
            `Accept the delivery in your dashboard to begin the delivery process and keep the customer updated along the way.`
          ) + itemsTable(items, fmt) + summaryBox(
            baseSummaryRows + summaryRow("Status", "Ready For Pickup", true)
          ),
          ctaText: "Accept Delivery",
          ctaUrl: partnerUrl,
          secondaryText: "Open Delivery Dashboard",
          siteUrl
        })
      };
    }
    case "order_paid": {
      return {
        subject: `Payment confirmed for order ${orderId}`,
        html: emailShell({
          preheader: `Your payment for order ${orderId} was confirmed \u2014 track it live`,
          pill: "Payment Confirmed",
          title: "Thank You For Your Order",
          content: para("Hello,") + para(
            `Thank you for shopping with MySuperStore! Your <strong>payment for order ${orderId}</strong> has been confirmed and your order is now being processed.`
          ) + para(
            `We'll keep you updated at every step \u2014 from packing, to pickup, to delivery at your door.`
          ) + itemsTable(items, fmt) + summaryBox(baseSummaryRows),
          ctaText: "Track Your Order",
          ctaUrl: trackUrl,
          secondaryText: "View My Account",
          siteUrl
        })
      };
    }
    case "order_status_updated":
    default: {
      const transition = oldStatus && newStatus ? `${oldStatusText} &rarr; ${statusText}` : statusText;
      const customerNote = audience === "customer" && newStatus ? STATUS_NOTES[newStatus] : null;
      let content;
      let ctaText;
      let ctaUrl;
      let secondaryText;
      if (audience === "vendor") {
        content = para("Hello,") + para(
          `Order ${orderId} from your store has been <strong>updated</strong> to: <strong>${statusText}</strong>.`
        );
        ctaText = "View Orders";
        ctaUrl = vendorUrl;
        secondaryText = "Open Vendor Dashboard";
      } else if (audience === "partner") {
        content = para("Hello delivery partner,") + para(
          `Order ${orderId} has been <strong>updated</strong> to: <strong>${statusText}</strong>.`
        );
        ctaText = "View Deliveries";
        ctaUrl = partnerUrl;
        secondaryText = "Open Delivery Dashboard";
      } else {
        content = para("Hello,") + para(
          `Your order ${orderId} has a new status: <strong>${statusText}</strong>.`
        ) + (customerNote ? note(customerNote) : "");
        ctaText = "Track Your Order";
        ctaUrl = trackUrl;
        secondaryText = "View My Account";
      }
      return {
        subject: `Order ${orderId} is now ${statusText}`,
        html: emailShell({
          preheader: `Order ${orderId} is now ${statusText}`,
          pill: statusText,
          title: audience === "customer" ? `Your Order Is Now ${statusText}` : `Order ${orderId} Updated`,
          content: content + itemsTable(items, fmt) + summaryBox(baseSummaryRows + summaryRow("Status", transition, true)),
          ctaText,
          ctaUrl,
          secondaryText,
          siteUrl
        })
      };
    }
  }
}
export {
  buildEmail,
  humanStatus,
  shortId
};
