const pool = require('./src/config/database');
require('dotenv').config();

const cleanup = async () => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const currentWeekStart = monday.toISOString().split('T')[0];

    const result = await pool.query(
      `DELETE FROM workout_plans WHERE week_start < $1 RETURNING id`,
      [currentWeekStart]
    );
    console.log(`✅ Deleted ${result.rowCount} old workout_plans rows from previous weeks`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err.message);
    process.exit(1);
  }
};

cleanup();