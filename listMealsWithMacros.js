const pool = require('./src/config/database');
require('dotenv').config();

pool.query('SELECT name, category, meal_type, calories, protein, carbs, fats FROM meals ORDER BY name')
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });