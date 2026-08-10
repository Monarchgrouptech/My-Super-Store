const { Client } = require('pg');
const fs = require('fs');

const URL = fs.readFileSync('.env', 'utf8').match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const ANON = fs.readFileSync('.env', 'utf8').match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();

const PROBE_USER_ID = '3eecb570-c8e0-4733-82d3-d06d8706d002'; // codebuff-probe-1786206872@probe.test
const PROBE_EMAIL = 'codebuff-probe-1786206872@probe.test';
const PROBE_PASSWORD = 'ProbePass123!';
const TEST_ORDER_ID = '11111111-1111-4111-8111-111111111111';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const db = new Client({
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await db.connect();

  // 0) Clean any leftovers from a previous run of this script
  await db.query(`DELETE FROM public.notification_outbox WHERE recipient_email = $1`, [PROBE_EMAIL]);
  await db.query(`DELETE FROM public.order_status_history WHERE order_id = $1`, [TEST_ORDER_ID]);
  await db.query(`DELETE FROM public.orders WHERE id = $1`, [TEST_ORDER_ID]);

  // 1) Confirm the probe user's email (bypasses the confirmation email)
  const conf = await db.query(
    `UPDATE auth.users SET email_confirmed_at = now(), confirmed_at = DEFAULT, updated_at = now()
     WHERE id = $1 RETURNING id, email`,
    [PROBE_USER_ID],
  );
  console.log('probe user confirmed:', conf.rows.length === 1);

  // 2) Sign in and get a session token
  const signIn = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PROBE_EMAIL, password: PROBE_PASSWORD }),
  }).then((r) => r.json());
  const token = signIn.access_token;
  console.log('sign-in ok:', !!token, token ? '' : JSON.stringify(signIn).slice(0, 200));
  if (!token) throw new Error('Could not sign in probe user');

  // 3) Create a throwaway order + history row -> fires trg_enqueue_order_status_notifications
  await db.query(
    `INSERT INTO public.orders (id, user_id, status, total_amount, currency, placed_at, updated_at)
     VALUES ($1, $2, 'paid', 100, 'USD', now(), now())`,
    [TEST_ORDER_ID, PROBE_USER_ID],
  );
  await db.query(
    `INSERT INTO public.order_status_history (id, order_id, status_type, old_value, new_value, created_at)
     VALUES (gen_random_uuid(), $1, 'shipped', 'picked_up', 'shipped', now())`,
    [TEST_ORDER_ID],
  );
  await sleep(500);

  // 4) Verify the customer notification was enqueued by the trigger
  const outbox = await db.query(
    `SELECT event_type, recipient_email, payload, idempotency_key, sent_at
     FROM public.notification_outbox WHERE recipient_email = $1`,
    [PROBE_EMAIL],
  );
  console.log('outbox rows for probe user:', outbox.rows.length);
  console.log('  ', JSON.stringify(outbox.rows[0] ?? null));

  const enqueued = outbox.rows.length > 0 && outbox.rows[0].event_type === 'order_status_updated';
  console.log('customer enqueue trigger: ', enqueued ? 'PASS' : 'FAIL');

  // 5) Dry-run drain (must NOT mark sent)
  const dryRun = await fetch(`${URL}/functions/v1/notifications-drain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun: true }),
  }).then((r) => r.json());
  console.log('dryRun result:', JSON.stringify({ ok: dryRun.ok, dryRun: dryRun.dryRun, sent: dryRun.sent, failed: dryRun.failed, error: dryRun.error }));
  const afterDry = await db.query(`SELECT sent_at FROM public.notification_outbox WHERE recipient_email = $1`, [PROBE_EMAIL]);
  console.log('dryRun left sent_at null:', afterDry.rows.every((r) => r.sent_at === null) ? 'PASS' : 'FAIL');

  // 6) Real drain -> sends via Brevo + marks sent_at
  const real = await fetch(`${URL}/functions/v1/notifications-drain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).then((r) => r.json());
  console.log('real drain result:', JSON.stringify({ ok: real.ok, sent: real.sent, failed: real.failed, failures: real.failures, error: real.error }));
  const afterReal = await db.query(`SELECT sent_at FROM public.notification_outbox WHERE recipient_email = $1`, [PROBE_EMAIL]);
  console.log('sent_at marked:', afterReal.rows.every((r) => r.sent_at !== null) ? 'PASS' : 'FAIL');

  // 7) Anon key must be rejected
  const anonCall = await fetch(`${URL}/functions/v1/notifications-drain`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log('anon rejected (401):', anonCall.status === 401 ? 'PASS' : `FAIL (${anonCall.status})`);

  // 8) Clean up all test data
  await db.query(`DELETE FROM public.notification_outbox WHERE recipient_email = $1`, [PROBE_EMAIL]);
  await db.query(`DELETE FROM public.order_status_history WHERE order_id = $1`, [TEST_ORDER_ID]);
  await db.query(`DELETE FROM public.orders WHERE id = $1`, [TEST_ORDER_ID]);
  console.log('cleanup: test order, history, and outbox rows removed');

  await db.end();
}

main().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
