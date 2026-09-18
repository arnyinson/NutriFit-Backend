const pool = require('./src/config/database');
require('dotenv').config();

pool.query('SELECT username, allergens FROM users ORDER BY created_at DESC LIMIT 5')
  .then(r => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });