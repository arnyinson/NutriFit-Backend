const pool = require('./database');
require('dotenv').config();

const updateTables = async () => {
  try {
    await pool.query(`
      ALTER TABLE meal_plans 
      ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'weekly'
    `);
    console.log('✅ Added mode column to meal_plans');

    await pool.query(`
      ALTER TABLE meal_plans 
      ADD COLUMN IF NOT EXISTS plan_date DATE
    `);
    console.log('✅ Added plan_date column to meal_plans');

    console.log('\n🎉 Tables updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

updateTables();
