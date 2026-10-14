require('dotenv').config();

let pool;
for (const p of ['./config/database', './config/db', './database', './db']) {
  try { pool = require(p); break; } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

(async () => {
  try {
    console.log('=== 3 SAMPLE MEALS (full rows) ===');
    const meals = await pool.query(`SELECT * FROM meals WHERE is_active = true
      AND ingredients IS NOT NULL AND array_length(ingredients,1) > 0 ORDER BY id LIMIT 3`);
    console.log(JSON.stringify(meals.rows, null, 2));

    console.log('\n=== 2 SAMPLE EXERCISES (full rows) ===');
    const ex = await pool.query('SELECT * FROM exercises WHERE is_active = true ORDER BY id LIMIT 2');
    console.log(JSON.stringify(ex.rows, null, 2));

    console.log('\n=== DISTINCT ALLERGENS used in meals ===');
    const al = await pool.query(`SELECT DISTINCT unnest(allergens) AS allergen FROM meals ORDER BY 1`);
    console.log(al.rows.map((r) => r.allergen).join(', ') || '(none)');

    console.log('\n=== ALL MEAL NAMES (category | type | name) ===');
    const names = await pool.query(`SELECT category, meal_type, name FROM meals WHERE is_active = true ORDER BY category, meal_type, name`);
    names.rows.forEach((r) => console.log(`${r.category} | ${r.meal_type} | ${r.name}`));

    console.log('\n=== ALL EXERCISE NAMES (muscle | equipment | difficulty | name) ===');
    const en = await pool.query(`SELECT muscle_group, equipment, difficulty, name FROM exercises WHERE is_active = true ORDER BY muscle_group, equipment, name`);
    en.rows.forEach((r) => console.log(`${r.muscle_group} | ${r.equipment} | ${r.difficulty} | ${r.name}`));
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
  }
})();