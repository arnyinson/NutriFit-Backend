const pool = require('./src/config/database');
require('dotenv').config();

pool.query(`
  SELECT mp.id, mp.meal_type, mp.plan_date, mp.taken, m.name
  FROM meal_plans mp
  JOIN meals m ON mp.meal_id = m.id
  JOIN users u ON mp.user_id = u.id
  WHERE u.username = 'arnyinson'
    AND mp.plan_date = '2026-09-19'
  ORDER BY mp.meal_type
`)
  .then(r => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });