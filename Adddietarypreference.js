// addDietaryPreference.js
// 1) users.dietary_preference TEXT DEFAULT 'None'   (None | Pescatarian | Vegetarian | Vegan)
// 2) meals.diet_type TEXT  = the strictest diet a meal fits (Vegan | Vegetarian | Pescatarian | Omnivore)
// DEFAULT = DRY RUN (prints classification, changes nothing). Use --apply to write.
require('dotenv').config();
const APPLY = process.argv.includes('--apply');
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }

// remove plant-based look-alikes before keyword tests
const SAFE = /(peanut butter|cocoa butter|coconut milk|gata|almond milk|soy milk|soya milk|oat milk|coconut cream|eggplant|talong|buttercup|butternut|nutmeg)/g;
const MEAT = /\b(chicken|manok|pork|baboy|beef|baka|liempo|giniling|sisig|ham|bacon|sausage|longganisa|tocino|tapa|turkey|lechon|lamb|kambing|meat|meatball|bola-bola|chorizo|hotdog|spam|corned|bulalo|kaldereta|menudo|pochero|nilaga|adobo|tinola|papaya)\b/;
const FISH = /\b(fish|isda|bangus|milkfish|tilapia|tuna|sardine|sardinas|galunggong|salmon|dilis|anchov|tuyo|daing|shrimp|hipon|squid|pusit|crab|alimango|alimasag|mussel|tahong|oyster|talaba|clam|shellfish|prawn|bagoong|patis|fish sauce|shrimp paste|alamang|lapu|maya-maya|dalagang|tinapa)\b/;
const ANIMAL = /\b(egg|eggs|itlog|milk|gatas|cheese|keso|yogurt|yoghurt|butter|mantikilya|cottage|cream|whey|honey|pulot|dairy|gelatin|lard|mayonnaise|mayo)\b/;
// words that look like meat but are not (tinola/nilaga/adobo/pochero/papaya are dishes: need a real meat word)
const DISH_ONLY = new Set(['pochero','nilaga','adobo','tinola','papaya','menudo','kaldereta','bulalo']);

function classify(meal){
  const text = [meal.name, ...(meal.ingredients||[]), ...(meal.allergens||[])].join(' | ').toLowerCase().replace(SAFE,' ');
  const m = text.match(MEAT);
  // dish names alone (e.g. "adobo") don't prove meat; require a real meat ingredient/word for those
  if (m && !DISH_ONLY.has(m[1])) return 'Omnivore';
  if (m && DISH_ONLY.has(m[1])) { if (/\b(chicken|manok|pork|baboy|beef|baka|meat|liempo)\b/.test(text)) return 'Omnivore'; }
  if (FISH.test(text) || (meal.allergens||[]).some(a=>/^(fish|shellfish)$/i.test(a))) return 'Pescatarian';
  if (ANIMAL.test(text) || (meal.allergens||[]).some(a=>/^(eggs?|dairy)$/i.test(a))) return 'Vegetarian';
  return 'Vegan';
}

(async()=>{
  try{
    console.log(APPLY?'*** APPLY MODE ***':'*** DRY RUN (no changes) - add --apply to write ***');
    if(APPLY){
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS dietary_preference TEXT DEFAULT 'None'");
      await pool.query("ALTER TABLE meals ADD COLUMN IF NOT EXISTS diet_type TEXT");
      console.log('Columns ready.');
    }
    const r = await pool.query('SELECT id,name,category,meal_type,ingredients,allergens FROM meals WHERE is_active=true ORDER BY category,meal_type,name');
    const rows = r.rows.map(m=>({...m, diet_type: classify(m)}));
    const tally = {};
    for(const m of rows){ const k=`${m.diet_type}|${m.category}|${m.meal_type}`; tally[k]=(tally[k]||0)+1; }
    console.log('\n=== COUNT per diet_type x category x meal_type ===');
    console.table(Object.entries(tally).sort().map(([k,c])=>{const [d,cat,t]=k.split('|');return {diet_type:d,category:cat,meal_type:t,count:c};}));
    console.log('\n=== EVERY MEAL AND ITS CLASSIFICATION (please review) ===');
    console.table(rows.map(m=>({name:m.name,category:m.category,meal_type:m.meal_type,diet_type:m.diet_type})));
    if(APPLY){
      for(const m of rows) await pool.query('UPDATE meals SET diet_type=$2 WHERE id=$1',[m.id,m.diet_type]);
      console.log('meals.diet_type updated for',rows.length,'meals.');
    }else console.log('\nDry run finished. Nothing changed.');
  }catch(e){console.error(e)}finally{await pool.end().catch(()=>{})}
})();