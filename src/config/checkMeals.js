const pool = require('./database');
require('dotenv').config();

const checkMeals = async () => {
  try {
    const total = await pool.query(`SELECT COUNT(*) FROM meals`);
    const breakfast = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Breakfast'`);
    const lunch = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Lunch'`);
    const dinner = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Dinner'`);
    const list = await pool.query(`SELECT name, meal_type, calories FROM meals ORDER BY meal_type, name`);

    console.log('\n📊 MEALS IN DATABASE:');
    console.log(`Total: ${total.rows[0].count}`);
    console.log(`Breakfast: ${breakfast.rows[0].count}`);
    console.log(`Lunch: ${lunch.rows[0].count}`);
    console.log(`Dinner: ${dinner.rows[0].count}`);
    console.log('\n📋 MEAL LIST:');
    list.rows.forEach(m => {
      console.log(`  [${m.meal_type}] ${m.name} — ${m.calories} kcal`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

checkMeals();