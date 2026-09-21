const pool = require('./src/config/database');
require('dotenv').config();

const fix = async () => {
  try {
    // 1. Ayusin ang Beef Kare-Kare gamit ang makatotohanang values
    const updateResult = await pool.query(
      `UPDATE meals SET calories = $1, protein = $2, carbs = $3, fats = $4
       WHERE name = 'Beef Kare-Kare'
       RETURNING name, calories, protein, carbs, fats`,
      [342, 27, 9, 22]
    );
    console.log('✅ Fixed Beef Kare-Kare:', updateResult.rows[0]);

    // 2. Tanggalin ang duplicate na "Caldereta" (panatilihin ang "Beef Caldereta")
    const deleteResult = await pool.query(
      `DELETE FROM meals WHERE name = 'Caldereta' RETURNING name`
    );
    console.log('✅ Deleted duplicate:', deleteResult.rows[0]?.name || '(wala nang nahanap, baka na-delete na dati)');

    process.exit(0);
  } catch (err) {
    console.error('Fix error:', err.message);
    process.exit(1);
  }
};

fix();