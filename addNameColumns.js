require('dotenv').config();

let pool;
for (const p of ['./config/database', './config/db', './database', './db']) {
  try { pool = require(p); break; } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to CockroachDB!');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name STRING');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name STRING');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name STRING');
    console.log('✅ Added first_name, middle_name, last_name columns to users');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
})();