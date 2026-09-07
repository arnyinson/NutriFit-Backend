const pool = require('./src/config/database');
require('dotenv').config();

const emailToDelete = 'herreraryedzel@gmail.com';

pool.query('DELETE FROM users WHERE email = $1 RETURNING username, email', [emailToDelete])
  .then(r => {
    console.log('Deleted:', r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });