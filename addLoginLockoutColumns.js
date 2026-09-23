const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP DEFAULT NULL
    `);
    console.log('✅ Added failed_login_attempts and lockout_until columns to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();