const pool = require('./database');
require('dotenv').config();

const addColumn = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notified_achievements STRING[] DEFAULT ARRAY[]::STRING[]');
    console.log('✅ Added notified_achievements column');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addColumn();