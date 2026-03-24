#!/usr/bin/env node
/**
 * Run this script to migrate the `role` column from ENUM to TEXT.
 *
 * Usage:
 *   node scripts/migrate-role-to-text.js
 *
 * Requires: pg module (npm install pg)
 */

const { Client } = require('pg');

const c = new Client({
  host: 'db.ewlxqiowzdebksykxvuv.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Narashi23&&',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await c.connect();
  console.log('Connected to database.');

  // Check current column type
  const res = await c.query(`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  `);
  console.log('Current column type:', res.rows[0]?.data_type, '/', res.rows[0]?.udt_name);

  if (res.rows[0]?.data_type === 'text') {
    console.log('Column is already TEXT. Nothing to do.');
    await c.end();
    return;
  }

  await c.query('ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::TEXT');
  console.log('Changed role column to TEXT.');

  await c.query('DROP TYPE IF EXISTS user_role');
  console.log('Dropped old user_role enum type.');

  // Verify
  const res2 = await c.query(`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  `);
  console.log('Verified column type:', res2.rows[0]?.data_type);

  await c.end();
  console.log('Done.');
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
