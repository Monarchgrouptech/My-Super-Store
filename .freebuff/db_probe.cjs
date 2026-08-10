const { Client } = require('pg');

const candidates = [
  {
    name: 'direct',
    connectionString: 'postgresql://postgres:Lagos2019@db.hoieogginmsfmoarubuu.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  },
  {
    name: 'pooler',
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  },
];

async function tryConnect(cfg) {
  const client = new Client({ connectionString: cfg.connectionString, ssl: cfg.ssl, connectionTimeoutMillis: 15000 });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT current_user, current_database(), version()');
    console.log('CONNECTED via', cfg.name, JSON.stringify(rows[0]).slice(0, 200));
    return client;
  } catch (err) {
    console.log('FAILED via', cfg.name, '->', err.message);
    return null;
  }
}

async function run(client) {
  const q = async (label, sql) => {
    try {
      const { rows } = await client.query(sql);
      console.log('\n=== ' + label + ' (' + rows.length + ' rows) ===');
      return rows;
    } catch (err) {
      console.log('\n=== ' + label + ' ERROR: ' + err.message + ' ===');
      return [];
    }
  };

  const triggers = await q('TRIGGERS (public schema)', `
    SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name`);

  const functions = await q('PUBLIC FUNCTIONS + DEFINITIONS', `
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname`);

  const outbox = await q('notification_outbox (all)', 'SELECT * FROM notification_outbox ORDER BY created_at DESC');
  const history = await q('order_status_history (all)', 'SELECT * FROM order_status_history ORDER BY created_at DESC');
  const policies = await q('RLS POLICIES', `
    SELECT tablename, policyname, cmd, roles::text, qual, with_check
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`);

  const grants = await q('TABLE GRANTS (anon/authenticated/service_role)', `
    SELECT table_name, grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee IN ('anon','authenticated','service_role') AND table_schema='public'
    ORDER BY table_name, grantee, privilege_type`);

  const tables = await q('ALL PUBLIC TABLES + RLS', `
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);

  // Triggers with their functions
  const triggerFns = await q('TRIGGER-OWNED FUNCTIONS (bodies)', `
    SELECT t.tgname AS trigger_name, t.tgrelid::regclass AS table_name,
           pg_get_functiondef(p.oid) AS def
    FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
    ORDER BY table_name, trigger_name`);

  console.log('\nDONE');
}

(async () => {
  for (const cfg of candidates) {
    const client = await tryConnect(cfg);
    if (client) {
      await run(client);
      await client.end();
      process.exit(0);
    }
  }
  process.exit(1);
})();
