// notifications-drain
// Sends pending notification_outbox rows for the calling user via Brevo email,
// then marks them sent. Audience (customer / vendor / delivery partner) is
// detected from the authenticated user. Emails are rendered from ./email.ts
// using the site's luxury gold-on-black brand, with per-audience CTA links.
//
// Deployment:
//   supabase functions deploy notifications-drain --no-verify-jwt
//
// Secrets required (already set on the project):
//   BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
// Optional:
//   PUBLIC_SITE_URL (defaults to https://mysuperstore.co)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {
  buildEmail,
  type Audience,
  type EmailMessage,
  type OrderInfo,
  type OrderItemInfo,
  type OutboxRow,
  type PaymentInfo,
} from './email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'no-reply@mysuperstore.co';
const BREVO_SENDER_NAME = Deno.env.get('BREVO_SENDER_NAME') || 'MySuperStore';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '';
const SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') || 'https://mysuperstore.co').replace(/\/+$/, '');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase server environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGIN || origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function json(body: Record<string, unknown>, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function sendEmail(recipient: string, email: EmailMessage): Promise<void> {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      to: [{ email: recipient }],
      subject: email.subject,
      htmlContent: email.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo send failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, origin, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    // Authenticate the caller (same pattern as vendor-readiness-submit)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized', message: 'Missing Authorization header' }, origin, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userRes, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userRes?.user) {
      return json({ error: 'Unauthorized', message: authError?.message || 'Invalid user token' }, origin, 401);
    }

    const userId = userRes.user.id;

    // Detect audience
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: partner } = await supabase
      .from('delivery_partners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();

    const userEmail = profile?.email ?? userRes.user.email ?? null;
    const audience: Audience = vendor ? 'vendor' : partner ? 'partner' : 'customer';

    // Fetch pending notifications for this user's audience
    let query = supabase
      .from('notification_outbox')
      .select('*')
      .is('sent_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (vendor) {
      query = query.eq('vendor_id', vendor.id);
    } else if (partner) {
      query = query.eq('delivery_partner_id', partner.id);
    } else if (userEmail) {
      // Customers: scope by orders they own, falling back to their email
      const { data: ownedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId);
      const orderIds = (ownedOrders ?? []).map((o) => o.id as string);
      query = orderIds.length > 0
        ? supabase
            .from('notification_outbox')
            .select('*')
            .is('sent_at', null)
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
            .limit(50)
        : supabase
            .from('notification_outbox')
            .select('*')
            .is('sent_at', null)
            .eq('recipient_email', userEmail)
            .order('created_at', { ascending: false })
            .limit(50);
    } else {
      return json({ ok: true, sent: 0, notifications: [] }, origin);
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) {
      console.error('Outbox fetch failed:', fetchError);
      return json({ error: 'database_error', message: fetchError.message }, origin, 500);
    }

    const outbox = (rows ?? []) as OutboxRow[];

    // Batch-load order details so emails can show total / currency / placed date
    const orderIds = [...new Set(outbox.map((r) => r.order_id).filter((id): id is string => !!id))];
    const ordersById = new Map<string, OrderInfo>();
    if (orderIds.length > 0) {
      const { data: orders, error: orderErr } = await supabase
        .from('orders')
        .select('id,total_amount,currency,placed_at')
        .in('id', orderIds);
      if (!orderErr) {
        for (const o of orders ?? []) {
          ordersById.set(o.id as string, o as OrderInfo);
        }
      } else {
        console.error('Order detail fetch failed:', orderErr);
      }
    }

    // Order items + product names/images for the email breakdown (vendor USD prices)
    const itemsByOrder = new Map<string, OrderItemInfo[]>();
    if (orderIds.length > 0) {
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, vendor_id, quantity, unit_price')
        .in('order_id', orderIds);
      if (!itemsErr) {
        const productIds = [
          ...new Set((itemsData ?? []).map((it) => it.product_id as string).filter(Boolean)),
        ];
        const productsById = new Map<string, { name: string; image_url: string | null }>();
        if (productIds.length > 0) {
          const { data: products, error: productsErr } = await supabase
            .from('products')
            .select('id, name, product_images(url, position)')
            .in('id', productIds);
          if (!productsErr) {
            for (const p of products ?? []) {
              const images = Array.isArray(p.product_images) ? p.product_images : [];
              const cover =
                images.find((i: { position: number | null }) => i.position === 0) ?? images[0];
              productsById.set(p.id as string, {
                name: (p.name as string) || 'Product',
                image_url: (cover?.url as string) ?? null,
              });
            }
          } else {
            console.error('Product fetch failed for email breakdown:', productsErr);
          }
        }
        for (const it of itemsData ?? []) {
          const prod = productsById.get(it.product_id as string);
          const entry: OrderItemInfo = {
            product_id: (it.product_id as string) ?? null,
            name: prod?.name ?? 'Product',
            image_url: prod?.image_url ?? null,
            quantity: Number(it.quantity ?? 1),
            unit_price: Number(it.unit_price ?? 0),
          };
          const key = it.order_id as string;
          itemsByOrder.set(key, [...(itemsByOrder.get(key) ?? []), entry]);
        }
      } else {
        console.error('Order items fetch failed for email breakdown:', itemsErr);
      }
    }

    // Payments — the exact amount the customer paid, in the paid currency
    const paymentByOrder = new Map<string, PaymentInfo>();
    if (orderIds.length > 0) {
      const { data: pays, error: paysErr } = await supabase
        .from('payments')
        .select('order_id, amount, currency')
        .in('order_id', orderIds);
      if (!paysErr) {
        for (const p of pays ?? []) {
          const key = p.order_id as string;
          if (key && !paymentByOrder.has(key)) {
            paymentByOrder.set(key, {
              amount: Number(p.amount ?? 0),
              currency: (p.currency as string) || 'USD',
            });
          }
        }
      } else {
        console.error('Payment fetch failed for email total:', paysErr);
      }
    }

    let sent = 0;
    const failures: string[] = [];

    for (const row of outbox) {
      if (!row.recipient_email) continue;

      const email = buildEmail(
        row,
        ordersById.get(row.order_id ?? '') ?? null,
        audience,
        SITE_URL,
        itemsByOrder.get(row.order_id ?? '') ?? [],
        paymentByOrder.get(row.order_id ?? '') ?? null,
      );
      if (dryRun) {
        sent += 1; // counted as "would send" but nothing is mutated
        continue;
      }

      try {
        await sendEmail(row.recipient_email, email);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'send failed';
        failures.push(`${row.event_type}:${row.id}: ${msg}`);
        console.error('Send failed for', row.id, msg);
        continue; // do not mark sent; retry next time
      }

      const { error: updateError } = await supabase
        .from('notification_outbox')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) {
        console.error('Mark-sent failed for', row.id, updateError);
        failures.push(`${row.event_type}:${row.id}: mark-sent failed`);
        continue;
      }
      sent += 1;
    }

    return json({
      ok: true,
      dryRun,
      sent,
      failed: failures.length,
      failures: failures.slice(0, 10),
      notifications: outbox.map((row) => ({
        id: row.id,
        event_type: row.event_type,
        order_id: row.order_id,
        payload: row.payload,
        created_at: row.created_at,
        sent_at: row.sent_at,
      })),
    }, origin);
  } catch (err) {
    console.error('Unexpected notifications-drain failure', err);
    return json(
      { error: 'server_error', message: err instanceof Error ? err.message : String(err) },
      origin,
      500,
    );
  }
});
