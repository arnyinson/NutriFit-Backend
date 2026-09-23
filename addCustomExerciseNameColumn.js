const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    // Gawing optional ang exercise_id sa parehong tables, magdagdag ng
    // custom_exercise_name para sa mga manual na naitype na exercise names
    await pool.query(`ALTER TABLE workout_plans ALTER COLUMN exercise_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS custom_exercise_name STRING DEFAULT NULL`);

    await pool.query(`ALTER TABLE workout_logs ALTER COLUMN exercise_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS custom_exercise_name STRING DEFAULT NULL`);

    console.log('✅ Made exercise_id optional, added custom_exercise_name columns');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();