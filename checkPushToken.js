const pool = require('./src/config/database');
require('dotenv').config();

pool.query("SELECT username, push_token FROM users")
  .then(r => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });