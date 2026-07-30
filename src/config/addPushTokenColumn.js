const pool = require('./database');
require('dotenv').config();

const addPushTokenColumn = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token STRING');
    console.log('✅ Added push_token column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addPushTokenColumn();