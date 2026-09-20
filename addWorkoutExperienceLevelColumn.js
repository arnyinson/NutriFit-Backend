const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS workout_experience_level STRING DEFAULT 'Beginner'
    `);
    console.log('✅ Added workout_experience_level column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();