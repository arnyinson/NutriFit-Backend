// fixMealIngredients.js - fills missing ingredients/instructions for 6 older meals. Only touches rows where they are empty.
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
const n=(a)=>a.map((s,i)=>`${i+1}. ${s}`).join('\n');
const FIX=[
 {name:'Avocado Toast',ingredients:['Brown bread','Ripe avocado','Calamansi juice','Salt','Pepper']},
 {name:'Laing',ingredients:['Dried taro leaves','Coconut milk','Garlic','Onion','Ginger','Chili','Salt']},
 {name:'Cashew and Raisin Snack Mix',ingredients:['Roasted cashew nuts','Raisins']},
 {name:'Ginataang Kalabasa at Sitaw',ingredients:['Kalabasa (squash)','Sitaw (yard long beans)','Coconut milk','Garlic','Onion','Ginger','Salt']},
 {name:'Peanut Trail Mix',ingredients:['Roasted peanuts','Raisins','Dried banana chips']},
 {name:'Ginisang Ampalaya with Egg',ingredients:['Ampalaya (bitter melon)','Egg','Tomato','Onion','Garlic','Cooking oil','Salt'],
  steps:['Slice the ampalaya, salt it lightly, and rinse to reduce the bitterness.','Saute garlic, onion and tomato in oil.','Add the ampalaya and cook for 4-5 minutes.','Pour in the beaten egg and stir gently until set.','Season with salt and serve.']},
];
(async()=>{
  try{
    for(const f of FIX){
      const r=await pool.query("UPDATE meals SET ingredients=$2 WHERE lower(name)=lower($1) AND (ingredients IS NULL OR cardinality(ingredients)=0)",[f.name,f.ingredients]);
      let s=0;
      if(f.steps){const q=await pool.query("UPDATE meals SET instructions=$2 WHERE lower(name)=lower($1) AND (instructions IS NULL OR TRIM(instructions)='')",[f.name,n(f.steps)]);s=q.rowCount;}
      console.log(f.name,'-> ingredients updated:',r.rowCount,f.steps?('instructions updated: '+s):'');
    }
  }catch(e){console.error(e)}finally{await pool.end().catch(()=>{})}
})();