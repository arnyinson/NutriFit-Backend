require('dotenv').config();

let pool;
for (const p of ['./config/database', './config/db', './database', './db']) {
  try { pool = require(p); break; } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

const table = (rows) => console.table(rows.map((r) => ({ ...r })));

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');

    console.log('=== MEALS: total active ===');
    table((await pool.query('SELECT COUNT(*)::int AS total FROM meals WHERE is_active = true')).rows);

    console.log('=== MEALS per meal_type ===');
    table((await pool.query(`SELECT meal_type, COUNT(*)::int AS count,
      MIN(calories)::int AS min_kcal, ROUND(AVG(calories))::int AS avg_kcal, MAX(calories)::int AS max_kcal
      FROM meals WHERE is_active = true GROUP BY meal_type ORDER BY meal_type`)).rows);

    console.log('=== MEALS per category x meal_type ===');
    table((await pool.query(`SELECT COALESCE(category,'(none)') AS category, meal_type, COUNT(*)::int AS count
      FROM meals WHERE is_active = true GROUP BY category, meal_type ORDER BY category, meal_type`)).rows);

    console.log('=== MEALS with missing data ===');
    table((await pool.query(`SELECT
      COUNT(*) FILTER (WHERE ingredients IS NULL OR array_length(ingredients,1) IS NULL)::int AS no_ingredients,
      COUNT(*) FILTER (WHERE instructions IS NULL OR instructions = '')::int AS no_instructions,
      COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '')::int AS no_image
      FROM meals WHERE is_active = true`)).rows);

    console.log('=== EXERCISES: total active ===');
    table((await pool.query('SELECT COUNT(*)::int AS total FROM exercises WHERE is_active = true')).rows);

    console.log('=== EXERCISES per equipment ===');
    table((await pool.query(`SELECT equipment, COUNT(*)::int AS count FROM exercises
      WHERE is_active = true GROUP BY equipment ORDER BY count DESC`)).rows);

    console.log('=== EXERCISES per muscle_group x equipment ===');
    table((await pool.query(`SELECT muscle_group, equipment, COUNT(*)::int AS count FROM exercises
      WHERE is_active = true GROUP BY muscle_group, equipment ORDER BY muscle_group, equipment`)).rows);

    console.log('=== EXERCISES per difficulty ===');
    table((await pool.query(`SELECT difficulty, COUNT(*)::int AS count FROM exercises
      WHERE is_active = true GROUP BY difficulty ORDER BY difficulty`)).rows);

    console.log('=== EXERCISES with missing data ===');
    table((await pool.query(`SELECT
      COUNT(*) FILTER (WHERE instructions IS NULL OR instructions = '')::int AS no_instructions,
      COUNT(*) FILTER (WHERE video_url IS NULL OR video_url = '')::int AS no_video
      FROM exercises WHERE is_active = true`)).rows);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
  }
})();