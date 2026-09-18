const pool = require('./src/config/database');
require('dotenv').config();

const username = 'arune';

pool.query(`
  SELECT m.name, m.allergens
  FROM meal_plans mp
  JOIN meals m ON mp.meal_id = m.id
  JOIN users u ON mp.user_id = u.id
  WHERE u.username = $1
`, [username])
  .then(r => {
    console.log('Meals sa bagong plan:');
    r.rows.forEach(row => console.log(`- ${row.name} (allergens: ${row.allergens})`));

    const hasFish = r.rows.some(row => row.allergens && row.allergens.includes('Fish'));
    console.log(hasFish ? '❌ MAY FISH PA RIN — MAY BUG' : '✅ WALANG FISH, TAMA ANG FILTERING');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });