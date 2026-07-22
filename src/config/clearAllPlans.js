const pool = require('./database');
require('dotenv').config();

const clearAllPlans = async () => {
  try {
    const meals = await pool.query('DELETE FROM meal_plans');
    console.log(`Cleared ${meals.rowCount} meal_plans rows`);

    const workouts = await pool.query('DELETE FROM workout_plans');
    console.log(`Cleared ${workouts.rowCount} workout_plans rows`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

clearAllPlans();