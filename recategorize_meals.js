// One-time script: removes the "Vegetable" category by moving those meals to
// Protein / Carbs / Fats.
//
//   node recategorize_meals.js
//       PREVIEW only (changes nothing). Shows every Vegetable meal with its
//       macros and ingredients, and where it WOULD go (Carbs by default).
//
//   node recategorize_meals.js --protein="Name 1,Name 2" --fats="Name 3"
//       Same preview, but the meals named here go to Protein / Fats instead.
//       Names must match exactly (not case sensitive). Everything else -> Carbs.
//
//   node recategorize_meals.js --protein="Name 1,Name 2" --apply
//       Saves the changes to the database.
//
// Put this file in the nutrifit-backend folder (the one with the .env file) and run it from there.
// It only ever touches meals whose category is exactly 'Vegetable'.
require('dotenv').config();
const pool = require('./src/config/database');

const APPLY = process.argv.includes('--apply');

const listArg = (flag) => {
  const a = process.argv.find((x) => x.startsWith(`--${flag}=`));
  if (!a) return [];
  return a.slice(flag.length + 3).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
};
const PROTEIN = listArg('protein');
const FATS = listArg('fats');

// main_ingredients / sub_ingredients are stored as JSON: [{ name, allergens, ... }]
const names = (v) => {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v;
    if (!Array.isArray(arr) || arr.length === 0) return '(none)';
    return arr.map((x) => (typeof x === 'string' ? x : x && x.name ? x.name : '?')).join(', ');
  } catch (e) {
    return '(unreadable)';
  }
};

const targetFor = (name) => {
  const n = String(name).toLowerCase();
  if (PROTEIN.includes(n)) return 'Protein';
  if (FATS.includes(n)) return 'Fats';
  return 'Carbs';
};

const counts = async () => {
  const r = await pool.query('SELECT category, COUNT(*) AS n FROM meals GROUP BY category ORDER BY category');
  return r.rows.map((x) => `${x.category}: ${x.n}`).join(' | ');
};

(async () => {
  try {
    console.log('Before ->', await counts());

    const res = await pool.query(
      `SELECT id, name, COALESCE(protein, 0) AS protein, COALESCE(carbs, 0) AS carbs, COALESCE(fats, 0) AS fats,
              main_ingredients, sub_ingredients
       FROM meals WHERE category = 'Vegetable' ORDER BY name`
    );
    console.log(`\nVegetable meals found: ${res.rows.length}\n`);

    // Warn about names typed in --protein / --fats that do not exist
    const known = res.rows.map((m) => String(m.name).toLowerCase());
    [...PROTEIN, ...FATS].forEach((n) => {
      if (!known.includes(n)) console.log(`WARNING: "${n}" is not a Vegetable meal name (check spelling)`);
    });

    res.rows.forEach((m, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${m.name} | P ${Number(m.protein)} | C ${Number(m.carbs)} | F ${Number(m.fats)}  ->  ${targetFor(m.name)}`);
      console.log(`      main: ${names(m.main_ingredients)}`);
      console.log(`      sub : ${names(m.sub_ingredients)}`);
    });

    const plan = { Protein: 0, Carbs: 0, Fats: 0 };
    res.rows.forEach((m) => { plan[targetFor(m.name)] += 1; });
    console.log(`\nPlan: Protein ${plan.Protein} | Carbs ${plan.Carbs} | Fats ${plan.Fats}`);

    if (!APPLY) {
      console.log('\nPREVIEW ONLY. Nothing was changed. Add --apply to save these changes.');
      return;
    }

    let changed = 0;
    for (const m of res.rows) {
      const r = await pool.query(`UPDATE meals SET category = $1 WHERE id = $2 AND category = 'Vegetable'`, [targetFor(m.name), m.id]);
      changed += r.rowCount;
    }
    console.log(`\nAPPLIED. Meals updated: ${changed}`);
    console.log('After  ->', await counts());
  } catch (err) {
    console.error('Script error:', err.message);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
})();