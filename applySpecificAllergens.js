require('dotenv').config();
const APPLY = process.argv.includes('--apply');
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }

const RENAME = { Gluten:'Wheat', egg:'Eggs', Egg:'Eggs' };
const rn = (a) => RENAME[a] || a;


const CATEGORY_RULES = [
  [/\b(egg|eggs|itlog)\b/i, ['Eggs']],
  [/(cheese|keso|kesong|cottage|yogurt|yoghurt|\bmilk\b|gatas|butter\b|cream\b)/i, ['Dairy']],
  [/(tuna|tilapia|bangus|milkfish|salmon|sardin|galunggong|dilis|\bfish\b|bagoong|patis)/i, ['Fish']],
  [/(shrimp|hipon|squid|pusit|crab|alimango|alimasag|mussel|tahong|oyster|talaba|prawn|alamang)/i, ['Shellfish']],
  [/(peanut|\bmani\b)/i, ['Peanuts']],
  [/(cashew|walnut|almond|pistachio|hazelnut|\bpili\b)/i, ['Tree Nuts']],
  [/soy sauce|toyo/i, ['Soy','Wheat']],
  [/(soybean|tofu|tokwa|\bsoy\b)/i, ['Soy']],
  [/(bread|toast|pandesal|pasta|macaroni|spaghetti|wheat)/i, ['Wheat']],
];

const SPECIFIC = {
  Fish: [[/bangus|milkfish/i,'Bangus'],[/tilapia/i,'Tilapia'],[/tuna/i,'Tuna'],[/salmon/i,'Salmon'],[/galunggong/i,'Galunggong'],[/sardin/i,'Sardines']],
  Shellfish: [[/shrimp|hipon|prawn|alamang/i,'Shrimp'],[/crab|alimango|alimasag/i,'Crab'],[/squid|pusit/i,'Squid'],[/mussel|tahong/i,'Mussel'],[/oyster|talaba/i,'Oyster']],
  Dairy: [[/cheese|keso|kesong|cottage/i,'Cheese'],[/yogurt|yoghurt/i,'Yogurt'],[/\bmilk\b|gatas|butter\b|cream\b/i,'Milk']],
  'Tree Nuts': [[/cashew/i,'Cashew'],[/almond/i,'Almond'],[/walnut/i,'Walnut'],[/\bpili\b/i,'Pili']],
};
const SPECIFIC_TAGS = new Set(Object.values(SPECIFIC).flat().map(x=>x[1]));
const clean = (name) => String(name).replace(/coconut (milk|cream)|gata|peanut butter/ig,' ');

const categoriesOf = (name) => { const s=new Set(); for(const [re,al] of CATEGORY_RULES) if(re.test(clean(name))) al.forEach(a=>s.add(a)); return [...s]; };
const addSpecifics = (name, allergens) => {
  const out = new Set((allergens||[]).map(rn));
  for(const cat of Object.keys(SPECIFIC)) if(out.has(cat)) for(const [re,tag] of SPECIFIC[cat]) if(re.test(clean(name))) out.add(tag);
  return [...out];
};
const parse = (s) => { const m=String(s).match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*g$/i); return m?{name:m[1].trim().toLowerCase(),grams:parseFloat(m[2])}:{name:String(s).trim().toLowerCase(),grams:0}; };

function buildTiers(meal){
  const items=(meal.ingredients||[]).map(parse).map(i=>({...i,allergens:categoriesOf(i.name)}));
  if(!items.length) return null;
  const top=items.reduce((a,b)=>b.grams>a.grams?b:a,items[0]);
  const main=[],sub=[];
  for(const it of items){
    if(it===top || (it.allergens.length && it.grams>=30)) main.push({name:it.name,allergens:it.allergens});
    else sub.push({name:it.name,allergens:it.allergens,substitute_override:null});
  }
  return {main,sub};
}

(async()=>{
  try{
    console.log(APPLY?'*** APPLY MODE ***':'*** DRY RUN (no changes) - add --apply to write ***');
    const types=await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='meals' AND column_name IN ('main_ingredients','sub_ingredients')");
    const T=Object.fromEntries(types.rows.map(r=>[r.column_name,String(r.data_type).toLowerCase()==='jsonb'?'jsonb':'json']));
    const r=await pool.query('SELECT id,name,ingredients,allergens,main_ingredients,sub_ingredients FROM meals WHERE is_active=true ORDER BY name');
    const report=[]; let flagged=0;
    for(const m of r.rows){
      const hadTiers = Array.isArray(m.main_ingredients) && m.main_ingredients.length>0;
      let main = hadTiers ? m.main_ingredients : null, sub = hadTiers ? (m.sub_ingredients||[]) : null;
      let note = hadTiers ? 'existing tiers' : 'tiers built';
      if(!hadTiers){ const b=buildTiers(m); if(b){main=b.main;sub=b.sub;} else {main=[];sub=[];note='NO INGREDIENTS (skipped tiers)';} }
      // rename + specific tags on every ingredient
      main = main.map(i=>({...i, allergens:addSpecifics(i.name,i.allergens)}));
      sub  = sub.map(i=>({...i, allergens:addSpecifics(i.name,i.allergens)}));
      // meal-level allergens: renamed originals + specific tags found in ingredients
      const before=(m.allergens||[]).slice();
      const base=new Set(before.map(rn));
      const specifics=[...main,...sub].flatMap(i=>i.allergens).filter(a=>SPECIFIC_TAGS.has(a));
      specifics.forEach(a=>base.add(a));
      // keep listed allergens consistent with ingredient JSON (otherwise the 3-tier filter would miss them)
      const covered=new Set([...main,...sub].flatMap(i=>i.allergens));
      for(const a of [...base].filter(x=>!SPECIFIC_TAGS.has(x))){
        if(!covered.has(a)){ main.push({name:`(contains ${a.toLowerCase()})`,allergens:addSpecifics('',[a])}); flagged++; note+=` | FLAG: ${a} not in any ingredient`; }
      }
      const after=[...base];
      const changed = JSON.stringify(before.slice().sort())!==JSON.stringify(after.slice().sort()) || !hadTiers || note.includes('FLAG');
      if(changed) report.push({meal:m.name, before:before.join(',')||'-', after:after.join(',')||'-', note});
      if(APPLY && changed){
        await pool.query(`UPDATE meals SET allergens=$2, main_ingredients=$3::${T.main_ingredients||'json'}, sub_ingredients=$4::${T.sub_ingredients||'json'} WHERE id=$1`,[m.id,after,JSON.stringify(main),JSON.stringify(sub)]);
      }
    }
    try{
      const c=await pool.query("SELECT COUNT(*)::int n FROM allergen_substitutes WHERE allergen='Gluten'");
      console.log(`allergen_substitutes rows tagged Gluten: ${c.rows[0].n}`);
      if(APPLY&&c.rows[0].n) await pool.query("UPDATE allergen_substitutes SET allergen='Wheat' WHERE allergen='Gluten'");
    }catch(e){console.log('(allergen_substitutes not checked:',e.message,')');}
    console.log(`${report.length} of ${r.rows.length} meals would change/changed.`);
    console.table(report);
    if(flagged) console.log(`FLAGS: ${flagged} meal(s) list an allergen that no ingredient explains (e.g. Laing, Ginataang Kalabasa at Sitaw). They stay hidden for users with that allergy.`);
    console.log(APPLY?'Done.':'Dry run finished. Nothing changed.');
  }catch(e){console.error(e)}finally{await pool.end().catch(()=>{})}
})();