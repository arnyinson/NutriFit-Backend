const pool = require('./src/config/database');
require('dotenv').config();

const cleanup = async () => {
  try {
    // Tanggalin ang mga duplicate, panatilihin lang ang pinakabago (pinakamataas na id) sa bawat grupo
    const result = await pool.query(`
      DELETE FROM meal_plans
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, mode, plan_date, meal_type) id
        FROM meal_plans
        ORDER BY user_id, mode, plan_date, meal_type, taken DESC, id
      )
    `);
    console.log(`✅ Deleted ${result.rowCount} duplicate meal_plans rows`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err.message);
    process.exit(1);
  }
};

cleanup();