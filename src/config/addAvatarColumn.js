const pool = require('./database');
require('dotenv').config();

const addAvatarColumn = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url STRING');
    console.log('✅ Added avatar_url column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addAvatarColumn();