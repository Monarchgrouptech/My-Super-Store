const { Client } = require('pg');
async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  const q = async (label, sql) => {
    const { rows } = await client.query(sql);
    console.log('\n===== ' + label + ' =====');
    rows.forEach(r => console.log(JSON.stringify(r)));
  };

  await q('notification_outbox indexes/constraints', `
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename='notification_outbox'`);

  await q('notification_outbox constraints', `
    SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint
    WHERE conrelid='public.notification_outbox'::regclass`);

  await q('full outbox rows', `
    SELECT event_type, order_id, vendor_id, delivery_partner_id, recipient_email, recipient_phone, payload, idempotency_key, sent_at, created_at
    FROM notification_outbox ORDER BY created_at DESC LIMIT 20`);

  await q('orders with user emails (sample)', `
    SELECT o.id, o.status, o.user_id, up.email AS customer_email
    FROM orders o LEFT JOIN user_profiles up ON up.user_id = o.user_id
    ORDER BY o.placed_at DESC LIMIT 8`);

  await q('delivery_partners (active)', `
    SELECT id, user_id, company_name, email, phone, is_active FROM delivery_partners WHERE is_active = true`);

  await q('user_profiles count + sample', `
    SELECT user_id, email, display_name FROM user_profiles ORDER BY created_at DESC LIMIT 6`);

  await client.end();
  console.log('\nDONE');
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
