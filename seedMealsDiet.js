// seedMealsDiet.js - 17 extra meals for Vegan/Vegetarian users; macros computed from PhilFCT (FNRI-DOST).
// Run: node seedMealsDiet.js   (safe to re-run: skips existing names)
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
const MEALS = [
  {
    "name": "Boiled Sweet Potato and Saba",
    "category": "Carbs",
    "meal_type": "Breakfast",
    "calories": 254,
    "protein": 1.4,
    "carbs": 60.2,
    "fats": 0.8,
    "allergens": [],
    "ingredients": [
      "Sweet potato 100 g",
      "Banana 80 g",
      "water"
    ],
    "instructions": "1. Wash the sweet potato and saba bananas.\n2. Boil together in water for 20-25 minutes until tender.\n3. Peel the bananas, slice the sweet potato, and serve warm."
  },
  {
    "name": "Boiled Corn and Banana",
    "category": "Carbs",
    "meal_type": "Breakfast",
    "calories": 250,
    "protein": 4,
    "carbs": 54.2,
    "fats": 1.9,
    "allergens": [],
    "ingredients": [
      "Corn on cob 100 g",
      "Banana 80 g",
      "water",
      "salt"
    ],
    "instructions": "1. Boil the corn in lightly salted water for 10-15 minutes.\n2. Slice the ripe banana.\n3. Serve the corn with the banana on the side."
  },
  {
    "name": "Nilagang Mais at Kamote",
    "category": "Carbs",
    "meal_type": "Breakfast",
    "calories": 260,
    "protein": 3,
    "carbs": 57.9,
    "fats": 1.8,
    "allergens": [],
    "ingredients": [
      "Corn on cob 80 g",
      "Sweet potato 100 g",
      "water",
      "salt"
    ],
    "instructions": "1. Cut the sweet potato into chunks.\n2. Boil the corn and sweet potato in lightly salted water for 20 minutes.\n3. Drain and serve warm."
  },
  {
    "name": "Ginataang Munggo",
    "category": "Protein",
    "meal_type": "Breakfast",
    "calories": 363,
    "protein": 15.4,
    "carbs": 43.1,
    "fats": 14.3,
    "allergens": [],
    "ingredients": [
      "Mung bean seed 120 g",
      "Coconut milk 40 g",
      "Sugar 10 g",
      "water"
    ],
    "instructions": "1. Boil the cooked mung beans in a little water.\n2. Add the coconut milk and brown sugar.\n3. Simmer for 5 minutes, stirring, until slightly thick.\n4. Serve warm."
  },
  {
    "name": "Boiled Soybeans with Tomato",
    "category": "Protein",
    "meal_type": "Breakfast",
    "calories": 289,
    "protein": 13.1,
    "carbs": 43.4,
    "fats": 7,
    "allergens": [
      "Soy"
    ],
    "ingredients": [
      "Soybean seed 100 g",
      "Tomato 60 g",
      "Onion 10 g",
      "calamansi",
      "salt"
    ],
    "instructions": "1. Slice the tomato and onion.\n2. Toss with the boiled soybeans.\n3. Season with calamansi juice and a pinch of salt. Serve."
  },
  {
    "name": "Munggo with Alugbati",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 265,
    "protein": 15,
    "carbs": 38.7,
    "fats": 5.6,
    "allergens": [],
    "ingredients": [
      "Mung bean seed 120 g",
      "Malabar nightshade leaves 50 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Tomato 30 g",
      "Oil 5 g",
      "salt",
      "water"
    ],
    "instructions": "1. Saute garlic, onion and tomato in oil.\n2. Add the boiled mung beans and a cup of water. Simmer for 10 minutes.\n3. Add the alugbati and cook for 2 minutes.\n4. Season with salt and serve."
  },
  {
    "name": "Red Kidney Bean Stew",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 249,
    "protein": 10.7,
    "carbs": 37.4,
    "fats": 6.3,
    "allergens": [],
    "ingredients": [
      "Kidney bean seed 120 g",
      "Tomato 60 g",
      "Onion 10 g",
      "Garlic bulb 3 g",
      "Carrot 30 g",
      "Oil 5 g",
      "salt",
      "pepper",
      "water"
    ],
    "instructions": "1. Saute garlic and onion in oil.\n2. Add the tomato and carrot and cook for 3 minutes.\n3. Add the boiled kidney beans and a little water. Simmer for 10 minutes.\n4. Season with salt and pepper, then serve."
  },
  {
    "name": "Chickpea Adobo",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 298,
    "protein": 7.6,
    "carbs": 50.3,
    "fats": 7.4,
    "allergens": [
      "Soy",
      "Gluten"
    ],
    "ingredients": [
      "Chickpea 120 g",
      "Soy sauce 15 g",
      "Garlic bulb 4 g",
      "Oil 5 g",
      "vinegar",
      "bay leaf",
      "pepper"
    ],
    "instructions": "1. Saute garlic in oil.\n2. Add the boiled chickpeas, soy sauce, vinegar, bay leaf and pepper.\n3. Simmer for 10 minutes until the sauce thickens.\n4. Serve warm."
  },
  {
    "name": "Kadyos with Vegetables",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 177,
    "protein": 7.6,
    "carbs": 34.6,
    "fats": 0.9,
    "allergens": [],
    "ingredients": [
      "Pigeon pea seed 120 g",
      "Chayote fruit 50 g",
      "Tomato 30 g",
      "Onion 10 g",
      "Garlic bulb 3 g",
      "salt",
      "water"
    ],
    "instructions": "1. Saute garlic, onion and tomato.\n2. Add the boiled pigeon peas and sayote with water.\n3. Simmer for 10-12 minutes until the sayote is tender.\n4. Season with salt and serve."
  },
  {
    "name": "Soybean and Vegetable Stir-Fry",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 349,
    "protein": 13.6,
    "carbs": 46.4,
    "fats": 12.1,
    "allergens": [
      "Soy",
      "Gluten"
    ],
    "ingredients": [
      "Soybean seed 100 g",
      "Cabbage 60 g",
      "Carrot 30 g",
      "Garlic bulb 3 g",
      "Soy sauce 8 g",
      "Oil 5 g"
    ],
    "instructions": "1. Saute garlic in oil.\n2. Add the carrot and cabbage and stir-fry for 3 minutes.\n3. Add the boiled soybeans and soy sauce.\n4. Toss for 2 minutes and serve."
  },
  {
    "name": "Ginataang Chickpea at Mushroom",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 374,
    "protein": 10.6,
    "carbs": 46.2,
    "fats": 16.3,
    "allergens": [],
    "ingredients": [
      "Chickpea 100 g",
      "Mushroom 60 g",
      "Coconut milk 40 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "ginger",
      "salt"
    ],
    "instructions": "1. Saute garlic, onion and ginger.\n2. Add the mushrooms and cook for 3 minutes.\n3. Add the boiled chickpeas and coconut milk. Simmer for 8-10 minutes.\n4. Season with salt and serve."
  },
  {
    "name": "Egg and Tomato Stir-Fry",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 214,
    "protein": 13.2,
    "carbs": 7.7,
    "fats": 14.5,
    "allergens": [
      "Eggs"
    ],
    "ingredients": [
      "Egg 100 g",
      "Tomato 80 g",
      "Onion 15 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Beat the eggs with a pinch of salt.\n2. Saute onion and tomato in oil until soft.\n3. Pour in the eggs and stir gently until set.\n4. Serve warm."
  },
  {
    "name": "Cheese and Egg Omelette",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 271,
    "protein": 16.4,
    "carbs": 4.4,
    "fats": 20.9,
    "allergens": [
      "Eggs",
      "Dairy"
    ],
    "ingredients": [
      "Egg 100 g",
      "Cheese 30 g",
      "Onion 10 g",
      "Oil 4 g",
      "salt"
    ],
    "instructions": "1. Beat the eggs and mix in crumbled kesong puti, chopped onion and salt.\n2. Heat the oil in a pan.\n3. Pour in the mixture and cook on low heat until set, then fold.\n4. Serve warm."
  },
  {
    "name": "Ginisang Sitaw with Egg",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 177,
    "protein": 10.5,
    "carbs": 10.7,
    "fats": 10.2,
    "allergens": [
      "Eggs"
    ],
    "ingredients": [
      "String/Yard long bean pod 100 g",
      "Egg 50 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Saute garlic and onion in oil.\n2. Add the sitaw cut into 2-inch pieces and cook for 5 minutes.\n3. Push to the side, add the beaten egg, and scramble.\n4. Mix together, season with salt, and serve."
  },
  {
    "name": "Egg Drop Vegetable Soup",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 171,
    "protein": 13.6,
    "carbs": 7.6,
    "fats": 9.6,
    "allergens": [
      "Eggs"
    ],
    "ingredients": [
      "Egg 100 g",
      "Chinese cabbage 60 g",
      "Carrot 30 g",
      "Onion 10 g",
      "Garlic bulb 3 g",
      "salt",
      "pepper",
      "water"
    ],
    "instructions": "1. Boil water with garlic, onion and carrot for 5 minutes.\n2. Add the pechay and season with salt and pepper.\n3. Slowly pour in the beaten egg while stirring gently.\n4. Cook for 1 minute and serve hot."
  },
  {
    "name": "Vegetarian Tortang Talong",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 175,
    "protein": 8.9,
    "carbs": 8.2,
    "fats": 11.8,
    "allergens": [
      "Eggs"
    ],
    "ingredients": [
      "Eggplant 150 g",
      "Egg 60 g",
      "Oil 6 g",
      "salt"
    ],
    "instructions": "1. Grill or roast the eggplant until soft, then peel and flatten with a fork.\n2. Dip in beaten egg seasoned with salt.\n3. Pan-fry in oil until golden on both sides.\n4. Serve warm."
  },
  {
    "name": "Cottage Cheese and Vegetable Salad",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 150,
    "protein": 14.1,
    "carbs": 9.7,
    "fats": 6.1,
    "allergens": [
      "Dairy"
    ],
    "ingredients": [
      "Cheese 100 g",
      "Tomato 80 g",
      "Cucumber 60 g",
      "Oil 3 g",
      "vinegar",
      "salt",
      "pepper"
    ],
    "instructions": "1. Slice the tomato and cucumber.\n2. Toss with the oil, vinegar, salt and pepper.\n3. Top with the cottage cheese and serve."
  }
];
(async()=>{
  try{
    await pool.query("UPDATE meals SET allergens=array_replace(allergens,'egg','Eggs') WHERE 'egg'=ANY(allergens)");
    let added=0,skipped=0;
    for(const m of MEALS){
      const ex=await pool.query('SELECT 1 FROM meals WHERE LOWER(name)=LOWER($1) LIMIT 1',[m.name]);
      if(ex.rows.length){skipped++;continue;}
      await pool.query('INSERT INTO meals (name,category,meal_type,calories,protein,carbs,fats,allergens,ingredients,instructions,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)',
        [m.name,m.category,m.meal_type,m.calories,m.protein,m.carbs,m.fats,m.allergens,m.ingredients,m.instructions]);
      added++;
    }
    console.log('Added:',added,'Skipped (already exist):',skipped);
  }catch(e){console.error(e);process.exitCode=1}finally{await pool.end().catch(()=>{});}
})();