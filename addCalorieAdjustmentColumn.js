const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS calorie_adjustment INT DEFAULT 0
    `);
    console.log('✅ Added calorie_adjustment column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();