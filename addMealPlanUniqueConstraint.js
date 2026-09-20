const pool = require('./src/config/database');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      ALTER TABLE meal_plans
      ADD CONSTRAINT unique_meal_plan_slot UNIQUE (user_id, mode, plan_date, meal_type)
    `);
    console.log('✅ Added unique constraint to meal_plans table');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
};

migrate();