const pool = require('./src/config/database');
require('dotenv').config();

const username = 'Bnk';

pool.query(
  `DELETE FROM meal_plans WHERE user_id = (SELECT id FROM users WHERE username = $1) RETURNING *`,
  [username]
)
  .then(r => {
    console.log(`Deleted ${r.rows.length} meal plan entries`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });