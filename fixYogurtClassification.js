const pool = require('./src/config/database');
require('dotenv').config();

const fix = async () => {
  try {
    const result = await pool.query(
      `SELECT id, main_ingredients, sub_ingredients FROM meals WHERE name = 'Greek Yogurt with Fruits'`
    );

    if (result.rows.length === 0) {
      console.log('Meal not found.');
      return process.exit(0);
    }

    const meal = result.rows[0];
    const subIngredients = meal.sub_ingredients || [];

    // Hanapin at alisin ang "greek yogurt" mula sa sub_ingredients
    const yogurtEntry = subIngredients.find((i) => i.name.toLowerCase() === 'greek yogurt');
    const remainingSubs = subIngredients.filter((i) => i.name.toLowerCase() !== 'greek yogurt');

    if (!yogurtEntry) {
      console.log('Greek yogurt not found in sub_ingredients — baka na-fix na dati.');
      return process.exit(0);
    }

    // Ilagay ito sa main_ingredients (walang substitute_override field dito)
    const newMainIngredients = [
      ...(meal.main_ingredients || []),
      { name: yogurtEntry.name, allergens: yogurtEntry.allergens },
    ];

    await pool.query(
      `UPDATE meals SET main_ingredients = $1, sub_ingredients = $2 WHERE id = $3`,
      [JSON.stringify(newMainIngredients), JSON.stringify(remainingSubs), meal.id]
    );

    console.log('✅ Na-reclassify na ang "greek yogurt" mula sub papuntang main ingredient.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

fix();