import { writeFileSync } from 'node:fs';
import { buildEmail } from './email_bundle.mjs';

const SITE = 'https://mysuperstore.co';
const ORDER_ID = 'bac71431-e6d3-4531-bd9e-3c40869b8c91';
const order = {
  id: ORDER_ID,
  total_amount: 53.07,
  currency: 'NGN',
  placed_at: '2026-08-10T11:56:20.210936+00:00',
};
const items = [
  { product_id: 'p1', name: 'Flower Perfume', image_url: 'https://i.ibb.co/Q78yLFV6/fresh-scent-purple-flower-glass-bottle-generative-ai.jpg', quantity: 2, unit_price: 3.07 },
  { product_id: 'p2', name: 'Luxury Leather Handbag', image_url: 'https://i.ibb.co/Q78yLFV6/fresh-scent-purple-flower-glass-bottle-generative-ai.jpg', quantity: 1, unit_price: 50 },
];
const payment = { amount: 72548.07, currency: 'NGN' };

const row = (event_type, payload, recipient_email = 'demo@mysuperstore.co') => ({
  id: `test-${event_type}`,
  event_type,
  order_id: ORDER_ID,
  vendor_id: null,
  delivery_partner_id: null,
  recipient_email,
  recipient_phone: null,
  payload,
  sent_at: null,
  created_at: '2026-08-10T11:56:20Z',
});

const samples = [
  ['vendor_order_paid', buildEmail(row('vendor_order_paid', { event: 'paid', order_id: ORDER_ID, vendor_id: 'v1', business_name: 'Aka Works' }), order, 'vendor', SITE, items, payment)],
  ['order_ready_for_delivery', buildEmail(row('order_ready_for_delivery', { event: 'ready_for_delivery', order_id: ORDER_ID, new_status: 'ready_for_pickup' }), order, 'partner', SITE, items, payment)],
  ['order_paid', buildEmail(row('order_paid', { event: 'paid', order_id: ORDER_ID }), order, 'customer', SITE, items, payment)],
  ['order_status_updated_customer', buildEmail(row('order_status_updated', { event: 'order_status_updated', order_id: ORDER_ID, old_status: 'in_transit', new_status: 'out_for_delivery' }), order, 'customer', SITE, items, payment)],
  ['order_status_updated_vendor', buildEmail(row('order_status_updated', { event: 'order_status_updated', order_id: ORDER_ID, old_status: null, new_status: 'ready_for_pickup' }), order, 'vendor', SITE, items, payment)],
];

const files = [];
for (const [name, email] of samples) {
  const f = `.freebuff/email_preview_${name}.html`;
  writeFileSync(f, email.html);
  files.push({ name, file: f, subject: email.subject });
  console.log(`WROTE ${f}  (${email.html.length} bytes)  subject: ${email.subject}`);
}

const cards = files
  .map(
    (s) => `<div style="margin:18px auto; max-width:640px;">
      <h2 style="font-family:Arial;color:#D4AF37;margin:6px 0;">${s.name}</h2>
      <p style="font-family:Arial;color:#aaa;margin:0 0 8px;font-size:12px;">Subject: ${s.subject}</p>
      <iframe src="./${s.file.replace('.freebuff/', '')}" style="width:100%;height:760px;border:1px solid #333;border-radius:10px;background:#0A0A0A;"></iframe>
    </div>`,
  )
  .join('\n');

writeFileSync(
  '.freebuff/email_preview_index.html',
  `<!doctype html><html><head><meta charset="utf-8"><title>Email previews</title>
   <style>body{margin:0;padding:24px;background:#111;}</style></head>
   <body>${cards}</body></html>`,
);
console.log('WROTE .freebuff/email_preview_index.html');
