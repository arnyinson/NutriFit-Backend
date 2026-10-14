require('dotenv').config();

let pool;
for (const p of ['./config/database', './config/db', './database', './db']) {
  try {
    const m = require(p);
    pool = m.pool || m.default || m;
    if (pool && pool.query) break;
    pool = null;
  } catch (e) { /* try next */ }
}
if (!pool) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

const hasTag = (json) => /shellfish|shrimp/i.test(JSON.stringify(json || ''));

(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT name, allergens, diet_type, main_ingredients, sub_ingredients, ingredients
       FROM meals
       WHERE name ILIKE '%laing%' OR name ILIKE '%kalabasa%'
       ORDER BY name`
    );
    if (!rows.length) console.log('Walang nahanap na meal.');
    for (const r of rows) {
      const inAllergens = /shellfish|shrimp/i.test((r.allergens || []).join(','));
      const inMain = hasTag(r.main_ingredients);
      const inSub = hasTag(r.sub_ingredients);
      const clean = !inAllergens && !inMain && !inSub;
      console.log('\n=== ' + r.name + ' ===');
      console.log('allergens        :', (r.allergens || []).join(', ') || '-');
      console.log('diet_type        :', r.diet_type);
      console.log('Shellfish/Shrimp sa allergens :', inAllergens ? 'MERON PA' : 'wala na');
      console.log('Shellfish/Shrimp sa main_ingr :', inMain ? 'MERON PA' : 'wala na');
      console.log('Shellfish/Shrimp sa sub_ingr  :', inSub ? 'MERON PA' : 'wala na');
      console.log('ingredients      :', (r.ingredients || []).join(' | '));
      console.log('RESULTA          :', clean ? 'OK, malinis na' : 'MAY NATIRA, kailangan pang ayusin');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end().catch(() => {});
  }
})();