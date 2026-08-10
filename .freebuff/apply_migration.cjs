const { Client } = require('pg');
const fs = require('fs');

const MIGRATION = 'supabase/migrations/20260808180000_notification_outbox_complete.sql';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const sql = fs.readFileSync(MIGRATION, 'utf8');

  try {
    // Multi-statement simple query = one implicit transaction: all or nothing.
    await client.query(sql);
    console.log('MIGRATION APPLIED OK');
  } catch (err) {
    console.log('MIGRATION FAILED (all changes rolled back):', err.message);
    process.exitCode = 1;
    await client.end();
    return;
  }

  // Verify
  const col = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_outbox' AND column_name='read_at'`);
  console.log('read_at column:', col.rows.length ? 'PRESENT' : 'MISSING');

  const pol = await client.query(`
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_outbox' ORDER BY policyname`);
  console.log('policies:', pol.rows.map((r) => r.policyname).join(', '));

  const fn = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='trg_enqueue_order_status_notifications'`);
  const def = fn.rows[0]?.def || '';
  console.log('status-trigger has customer enqueue:', def.includes(':customer:') ? 'YES' : 'NO');

  const paid = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='trg_enqueue_paid_notifications'`);
  const paidDef = paid.rows[0]?.def || '';
  console.log('paid-trigger has customer enqueue:', paidDef.includes('order_paid:customer') ? 'YES' : 'NO');

  await client.end();
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
