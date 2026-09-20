const pool = require('./src/config/database');
require('dotenv').config();

const username = 'arnyinson';

pool.query(`
  SELECT p.date, p.meals_taken, p.total_meals
  FROM progress p
  JOIN users u ON p.user_id = u.id
  WHERE u.username = $1
  ORDER BY p.date DESC
  LIMIT 7
`, [username])
  .then(r => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });