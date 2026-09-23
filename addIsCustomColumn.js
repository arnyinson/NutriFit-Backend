const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false
    `);
    console.log('✅ Added is_custom column to workout_plans table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();