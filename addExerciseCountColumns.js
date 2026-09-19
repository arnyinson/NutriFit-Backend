const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE progress
      ADD COLUMN IF NOT EXISTS total_exercises INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS exercises_completed INT DEFAULT 0
    `);
    console.log('✅ Added total_exercises and exercises_completed columns to progress table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();