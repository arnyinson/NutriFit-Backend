require('dotenv').config();

// Use the app's own pool if it can be found, otherwise connect with DATABASE_URL.
let pool;
for (const p of ['./config/database', './config/db', './database', './db']) {
  try { pool = require(p); break; } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to CockroachDB!');
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ticket_id INT8');
    console.log('✅ Added ticket_id column to notifications');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
})();