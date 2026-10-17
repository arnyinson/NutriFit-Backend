// cleanupDuplicateFoodLogs.js
// Finds food logs that were saved many times by mistake (same user, same food, same kcal,
// same day) and keeps only the FIRST one of each group.
//
//   node cleanupDuplicateFoodLogs.js                      -> DRY RUN, all users (nothing is changed)
//   node cleanupDuplicateFoodLogs.js --email=you@x.com    -> DRY RUN, one user
//   node cleanupDuplicateFoodLogs.js --email=you@x.com --apply   -> delete the extra copies
//
// --apply needs --email on purpose, so it can never touch other users' logs by accident.
require('dotenv').config();
const APPLY = process.argv.includes('--apply');
const emailArg = (process.argv.find(a => a.startsWith('--email=')) || '').slice(8).trim();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }

(async () => {
  try {
    if (APPLY && !emailArg) {
      console.log('Add --email=<account email> together with --apply.');
      return;
    }
    console.log(APPLY ? '*** APPLY MODE ***' : '*** DRY RUN (nothing is changed) ***');

    const params = [];
    let where = '';
    if (emailArg) { params.push(emailArg); where = 'WHERE lower(u.email) = lower($1)'; }

    const groups = await pool.query(
      `SELECT u.email, fl.user_id, fl.food_name, fl.calories, DATE(fl.logged_at) AS day,
              count(*) AS copies,
              array_agg(fl.id::text ORDER BY fl.logged_at, fl.id::text) AS ids
       FROM food_logs fl
       JOIN users u ON u.id = fl.user_id
       ${where}
       GROUP BY u.email, fl.user_id, fl.food_name, fl.calories, DATE(fl.logged_at)
       HAVING count(*) > 1
       ORDER BY count(*) DESC`,
      params
    );

    if (groups.rows.length === 0) { console.log('No duplicate food logs found.'); return; }

    let extra = 0, extraKcal = 0;
    for (const g of groups.rows) {
      const n = Number(g.copies) - 1;
      extra += n;
      extraKcal += n * Number(g.calories);
      console.log(`${g.email} | ${String(g.day).slice(0, 10)} | ${g.food_name} | ${g.calories} kcal | ${g.copies} copies -> remove ${n}`);
    }
    console.log(`\nGroups: ${groups.rows.length} | extra copies to remove: ${extra} | kcal that would be removed: ${extraKcal}`);

    if (!APPLY) {
      console.log('\nCheck the list. If it is right, run again with --apply (and --email).');
      return;
    }

    let removed = 0;
    for (const g of groups.rows) {
      const toDelete = g.ids.slice(1); // keep the first
      const r = await pool.query('DELETE FROM food_logs WHERE id::text = ANY($1::text[])', [toDelete]);
      removed += r.rowCount || toDelete.length;
    }
    console.log(`\nRemoved ${removed} duplicate food log(s).`);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end?.();
  }
})();