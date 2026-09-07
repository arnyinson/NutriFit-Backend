const pool = require('./database');
require('dotenv').config();

const addArchiveColumns = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS archived BOOL DEFAULT false');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP DEFAULT now()');
    console.log('✅ Added archived and last_login columns to users table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addArchiveColumns();