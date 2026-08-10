const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  console.log('CONNECTED\n');

  const q = async (label, sql) => {
    const { rows } = await client.query(sql);
    console.log('===== ' + label + ' (' + rows.length + ') =====');
    return rows;
  };

  const triggers = await q('TRIGGERS', `
    SELECT event_object_table AS tbl, trigger_name, action_timing AS timing, event_manipulation AS evt
    FROM information_schema.triggers
    WHERE trigger_schema='public' ORDER BY event_object_table, trigger_name`);
  triggers.forEach(r => console.log(`  ${r.tbl} | ${r.timing} ${r.evt} | ${r.trigger_name}`));

  const fnNames = await q('FUNCTION NAMES', `
    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname`);
  fnNames.forEach(r => console.log('  ' + r.proname));

  const outboxFn = await q('enqueue_notification_outbox DEFINITION', `
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='enqueue_notification_outbox'`);
  outboxFn.forEach(r => console.log(r.def));

  const triggerBodies = await q('TRIGGER FUNCTION BODIES', `
    SELECT t.tgname AS trig, t.tgrelid::regclass::text AS tbl, pg_get_functiondef(p.oid) AS def
    FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE NOT t.tgisinternal AND p.pronamespace='public'::regnamespace
    ORDER BY tbl, trig`);
  triggerBodies.forEach(r => {
    console.log(`\n--- ${r.trig} on ${r.tbl} ---\n${r.def}`);
  });

  const policies = await q('RLS POLICIES (key tables)', `
    SELECT tablename, policyname, cmd, roles::text AS roles, left(qual, 140) AS qual
    FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('notification_outbox','order_status_history','orders','order_fulfillments','order_tracking_events','vendor_order_fulfillments','delivery_partners','user_profiles','vendors')
    ORDER BY tablename, policyname`);
  policies.forEach(r => console.log(`  ${r.tablename} | ${r.cmd} | ${r.policyname} | roles=${r.roles} | ${r.qual || ''}`));

  const outboxGrants = await q('notification_outbox GRANTS', `
    SELECT grantee, privilege_type FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name='notification_outbox' ORDER BY grantee, privilege_type`);
  outboxGrants.forEach(r => console.log(`  ${r.grantee}: ${r.privilege_type}`));

  await client.end();
  console.log('\nDONE');
}

main().catch(e => { console.error('ERR', e.message); process.exit(1); });
