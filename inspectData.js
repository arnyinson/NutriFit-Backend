// inspectData.js - READ ONLY (SELECT only). Prints: all exercises, and meals missing ingredients/instructions.
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
(async()=>{
  try{
    const ex=await pool.query('SELECT name,muscle_group,equipment,difficulty FROM exercises ORDER BY muscle_group,equipment,name');
    console.log('=== EXERCISES ('+ex.rows.length+') ===');
    console.table(ex.rows);
    const m=await pool.query(`SELECT name,category,meal_type,
      (ingredients IS NULL OR cardinality(ingredients)=0) AS no_ingredients,
      (instructions IS NULL OR TRIM(instructions)='') AS no_instructions
      FROM meals WHERE is_active=true AND ((ingredients IS NULL OR cardinality(ingredients)=0) OR (instructions IS NULL OR TRIM(instructions)=''))
      ORDER BY category,meal_type,name`);
    console.log('=== MEALS WITH MISSING DATA ('+m.rows.length+') ===');
    console.table(m.rows);
  }catch(e){console.error(e)}finally{await pool.end().catch(()=>{})}
})();