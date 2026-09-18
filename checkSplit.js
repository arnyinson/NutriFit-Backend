const pool = require('./src/config/database');
require('dotenv').config();

pool.query(`SELECT name, allergens, main_ingredients, sub_ingredients FROM meals WHERE name IN ('Tofu with Mixed Vegetables', 'Beef Kare-Kare', 'Adobong Manok sa Gata')`)
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });