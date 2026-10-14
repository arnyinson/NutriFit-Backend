require('dotenv').config();
const APPLY = process.argv.includes('--apply');

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

const TAG = /^(shellfish|shrimp)$/i;
const SHRIMP_NAME = /shrimp|hipon|bagoong|alamang/i;

function parse(v) {
  if (v == null) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return v; } }
  return v;
}

// returns cleaned copy; counts changes in stats
function clean(node, stats) {
  if (Array.isArray(node)) {
    const out = [];
    for (const item of node) {
      if (typeof item === 'string') {
        if (TAG.test(item)) { stats.tags++; continue; }
        out.push(item);
      } else if (item && typeof item === 'object' && !Array.isArray(item)
                 && typeof item.name === 'string' && SHRIMP_NAME.test(item.name)) {
        stats.entries.push(item.name);
        continue;
      } else {
        out.push(clean(item, stats));
      }
    }
    return out;
  }
  if (node && typeof node === 'object') {
    const o = {};
    for (const k of Object.keys(node)) o[k] = clean(node[k], stats);
    return o;
  }
  return node;
}

(async () => {
  console.log(APPLY ? '*** APPLY MODE ***' : '*** DRY RUN (no changes) - add --apply to write ***');
  try {
    const { rows } = await pool.query(
      `SELECT id, name, allergens, diet_type, main_ingredients, sub_ingredients
       FROM meals
       WHERE name ILIKE '%laing%' OR name ILIKE '%kalabasa%'
       ORDER BY name`
    );
    if (rows.length !== 2) {
      console.log('Babala: ' + rows.length + ' meal ang nahanap (inaasahan 2). Walang gagalawin.');
      rows.forEach(r => console.log(' -', r.name));
      return;
    }
    for (const r of rows) {
      const stats = { tags: 0, entries: [] };
      const main = clean(parse(r.main_ingredients), stats);
      const sub = clean(parse(r.sub_ingredients), stats);
      const allergens = (r.allergens || []).filter(a => !TAG.test(a));

      console.log('\n=== ' + r.name + ' ===');
      console.log('tags na tatanggalin       :', stats.tags);
      console.log('entries na tatanggalin    :', stats.entries.join(', ') || '-');
      console.log('allergens                 :', (r.allergens || []).join(',') || '-', '->', allergens.join(',') || '-');
      console.log('diet_type                 :', r.diet_type, '-> Vegan');

      if (APPLY) {
        await pool.query(
          `UPDATE meals
           SET main_ingredients = $1::jsonb,
               sub_ingredients  = $2::jsonb,
               allergens        = $3,
               diet_type        = 'Vegan'
           WHERE id = $4`,
          [JSON.stringify(main), JSON.stringify(sub), allergens, r.id]
        );
        console.log('SAVED');
      }
    }
    console.log(APPLY ? '\nDone. Patakbuhin ulit ang checkShellfishMeals.js para i-verify.'
                      : '\nDry run finished. Nothing changed.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end().catch(() => {});
  }
})();