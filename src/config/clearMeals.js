const pool = require('./database');
require('dotenv').config();

const clearMeals = async () => {
  try {
    const result = await pool.query(`DELETE FROM meals`);
    console.log(`✅ Cleared all meals — ${result.rowCount} rows deleted`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

clearMeals();