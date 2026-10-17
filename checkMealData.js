// checkMealData.js - READ ONLY (SELECT lang). Walang binabago sa database.
// Run: node checkMealData.js
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }

const MEAT = ['pork','baboy','liempo','chicken','manok','beef','baka','lechon','sausage','longganisa','tocino','bacon','ham','spam','corned','meat'];
const FISH = ['fish','isda','tilapia','bangus','galunggong','tuna','salmon','sardines','tuyo','dilis','shrimp','hipon','squid','pusit','crab','alimango','mussel','tahong','clam','kuhol','bagoong','patis','fish sauce','oyster'];
const ANIMAL = ['egg','itlog','milk','gatas','cheese','keso','butter','honey','pulot','yogurt','gelatin'];
const hit = (text, words) => words.filter(w => text.includes(w));
const flat = (m) => (((m.ingredients||[]).join(' ')) + ' ' + (m.main_ingredients ? JSON.stringify(m.main_ingredients) : '') + ' ' + (m.sub_ingredients ? JSON.stringify(m.sub_ingredients) : '') + ' ' + m.name).toLowerCase();

(async () => {
  try {
    const { rows } = await pool.query(`SELECT id,name,category,meal_type,calories,protein,carbs,fats,diet_type,
      ingredients,main_ingredients,sub_ingredients FROM meals WHERE is_active=true ORDER BY name`);
    console.log('Active meals:', rows.length);

    console.log('\n=== 1) diet_type count ===');
    const counts = {}; rows.forEach(m => { const k = m.diet_type || '(null)'; counts[k] = (counts[k]||0)+1; });
    console.table(counts);

    console.log('\n=== 2) Tatlong meal na tinitingnan mo ===');
    for (const key of ['pinakbet','tortang talong','sweet and sour fish']) {
      rows.filter(m => m.name.toLowerCase().includes(key)).forEach(m => {
        console.log('\n--', m.name, '| diet_type:', m.diet_type, '| kcal:', m.calories, 'P/C/F:', m.protein, m.carbs, m.fats);
        console.log('ingredients:', (m.ingredients||[]).join('; '));
        console.log('main:', JSON.stringify(m.main_ingredients));
        console.log('sub:', JSON.stringify(m.sub_ingredients));
      });
    }

    console.log('\n=== 3) Vegan na may animal product (dapat walang laman) ===');
    console.table(rows.filter(m => m.diet_type==='Vegan').map(m => ({name:m.name, found:[...hit(flat(m),MEAT),...hit(flat(m),FISH),...hit(flat(m),ANIMAL)].join(',')})).filter(x=>x.found));

    console.log('\n=== 4) Vegetarian na may karne/isda (dapat walang laman) ===');
    console.table(rows.filter(m => m.diet_type==='Vegetarian').map(m => ({name:m.name, found:[...hit(flat(m),MEAT),...hit(flat(m),FISH)].join(',')})).filter(x=>x.found));

    console.log('\n=== 5) Pescatarian na may karne (dapat walang laman) ===');
    console.table(rows.filter(m => m.diet_type==='Pescatarian').map(m => ({name:m.name, found:hit(flat(m),MEAT).join(',')})).filter(x=>x.found));

    console.log('\n=== 6) Omnivore/null na walang karne o isda (baka puwedeng Vegetarian/Pescatarian) ===');
    console.table(rows.filter(m => (!m.diet_type||m.diet_type==='Omnivore') && hit(flat(m),MEAT).length===0 && hit(flat(m),FISH).length===0).map(m => ({name:m.name, diet_type:m.diet_type})));

    console.log('\n=== 7) Calories na hindi tugma sa 4P+4C+9F (lampas 10%) ===');
    console.table(rows.map(m => {
      const calc = Math.round(4*Number(m.protein||0)+4*Number(m.carbs||0)+9*Number(m.fats||0));
      const diff = Number(m.calories) ? Math.round(100*(calc-Number(m.calories))/Number(m.calories)) : null;
      return { name:m.name, stored:m.calories, computed:calc, diff_pct:diff };
    }).filter(x => x.diff_pct===null || Math.abs(x.diff_pct) > 10));
  } catch (e) { console.error(e); } finally { await pool.end().catch(()=>{}); }
})();