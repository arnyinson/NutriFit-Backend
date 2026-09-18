const pool = require('./src/config/database');
require('dotenv').config();

const username = 'Bnk';

pool.query(`
  SELECT m.name, m.allergens, m.main_ingredients, m.sub_ingredients
  FROM meal_plans mp
  JOIN meals m ON mp.meal_id = m.id
  JOIN users u ON mp.user_id = u.id
  WHERE u.username = $1
`, [username])
  .then(r => {
    const uniqueMeals = [...new Map(r.rows.map(m => [m.name, m])).values()];
    console.log('Unique meals sa plan:');
    uniqueMeals.forEach(row => console.log(`- ${row.name} (allergens: ${row.allergens})`));

    const adobongManok = uniqueMeals.find(m => m.name === 'Adobong Manok sa Gata');
    const tofu = uniqueMeals.find(m => m.name === 'Tofu with Mixed Vegetables');

    console.log('\n--- Test Results ---');
    console.log('Adobong Manok sa Gata (dapat NANANATILI, soy sauce lang ang may Soy, substitutable):',
      adobongManok ? '✅ NANDITO (tama)' : '❌ WALA (mali, dapat nandito ito)');
    console.log('Tofu with Mixed Vegetables (dapat WALA, tofu mismo ang main ingredient may Soy):',
      tofu ? '❌ NANDITO (mali, dapat wala ito)' : '✅ WALA (tama)');

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });