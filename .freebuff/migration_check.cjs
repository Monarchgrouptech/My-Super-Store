const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.hoieogginmsfmoarubuu:Lagos2019@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  const sql = fs.readFileSync('supabase/migrations/20260808180000_notification_outbox_complete.sql', 'utf8');

  try {
    await client.query('BEGIN');
    await client.query(sql);
    console.log('MIGRATION SQL: OK (all statements parsed and executed inside a transaction)');
    await client.query('ROLLBACK');
    console.log('ROLLED BACK — no changes persisted.');
  } catch (err) {
    console.log('MIGRATION SQL FAILED (rolled back):', err.message);
    try { await client.query('ROLLBACK'); } catch (_) { /* noop */ }
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
