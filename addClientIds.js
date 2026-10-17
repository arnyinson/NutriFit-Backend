// addClientIds.js
// Adds a client_id column (+ unique index per user) so the server can ignore the same
// log when the phone sends it twice (weak connection / offline queue retry).
// Tables: food_logs, workout_logs, workout_plans.   Safe to run more than once.
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }

const TABLES = ['food_logs', 'workout_logs', 'workout_plans'];

(async () => {
  try {
    for (const t of TABLES) {
      await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS client_id TEXT`);
      console.log(`${t}: client_id column ready`);
    }
    // separate step: indexes after the columns exist. NULL client_ids (old rows) never conflict.
    for (const t of TABLES) {
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${t}_user_client_uniq ON ${t} (user_id, client_id)`);
      console.log(`${t}: unique index ready`);
    }
    console.log('Done.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end?.();
  }
})();