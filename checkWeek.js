const pool = require('./src/config/database');
require('dotenv').config();

pool.query("SELECT DISTINCT week_start, mode FROM meal_plans ORDER BY week_start DESC")
  .then(r => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });