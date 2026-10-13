const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ
    `);
    await pool.query(`
      UPDATE tickets
      SET responded_at = updated_at
      WHERE admin_response IS NOT NULL AND admin_response <> '' AND responded_at IS NULL
    `);
    console.log('✅ Added responded_at column to tickets table (and backfilled old replies)');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();