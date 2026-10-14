// seedMeals.js - 36 meals; macros computed per serving from PhilFCT (FNRI-DOST) per-100 g values.
// Run: node seedMeals.js   (safe to re-run: skips existing names)
require('dotenv').config();
let pool;
for (const p of ['./config/database','./config/db','./database','./db']) { try { const r=require(p); pool=r.pool||r.default||r; if(pool&&pool.query)break; pool=null; } catch(e){} }
if(!pool){ const {Pool}=require('pg'); pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); }
const MEALS = [
  {
    "name": "Steamed White Rice",
    "category": "Carbs",
    "meal_type": "Lunch",
    "calories": 206,
    "protein": 3.4,
    "carbs": 47.5,
    "fats": 0.3,
    "allergens": [],
    "ingredients": [
      "Rice 160 g",
      "water"
    ],
    "instructions": "1. Rinse 1/2 cup of uncooked rice 2-3 times until the water is clearer.\n2. Add rice and 1 cup of water to a pot or rice cooker.\n3. Cook until the water is absorbed (about 15-20 minutes).\n4. Rest covered for 5 minutes, fluff with a fork, and serve about 1 cup."
  },
  {
    "name": "Boiled Corn (Nilagang Mais)",
    "category": "Carbs",
    "meal_type": "Lunch",
    "calories": 200,
    "protein": 4,
    "carbs": 42.8,
    "fats": 1.4,
    "allergens": [],
    "ingredients": [
      "Corn on cob 120 g",
      "water",
      "salt"
    ],
    "instructions": "1. Remove the husk and silk from the corn.\n2. Boil water with a pinch of salt.\n3. Add the corn and cook for 10-15 minutes until tender.\n4. Drain and let cool slightly before eating."
  },
  {
    "name": "Pancit Bihon",
    "category": "Carbs",
    "meal_type": "Lunch",
    "calories": 222,
    "protein": 2.6,
    "carbs": 41.6,
    "fats": 5,
    "allergens": [
      "Soy",
      "Gluten"
    ],
    "ingredients": [
      "Noodles 120 g",
      "Soy sauce 10 g",
      "Carrot 30 g",
      "Cabbage 30 g",
      "String/Yard long bean pod 20 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 4 g",
      "calamansi"
    ],
    "instructions": "1. Soak the bihon noodles in water for 10 minutes, then drain.\n2. Saute garlic and onion in oil until fragrant.\n3. Add carrots, green beans and cabbage. Cook for 3 minutes.\n4. Add soy sauce and a little water, then the noodles. Toss until the liquid is absorbed.\n5. Serve with calamansi."
  },
  {
    "name": "Nilagang Saging na Saba",
    "category": "Carbs",
    "meal_type": "Lunch",
    "calories": 239,
    "protein": 1.8,
    "carbs": 57.9,
    "fats": 0,
    "allergens": [],
    "ingredients": [
      "Banana 150 g",
      "water"
    ],
    "instructions": "1. Wash the saba bananas and cut off both ends.\n2. Boil in water with the skin on for 20-25 minutes.\n3. Drain, let cool, then peel before eating."
  },
  {
    "name": "Plain Steamed Rice",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 206,
    "protein": 3.4,
    "carbs": 47.5,
    "fats": 0.3,
    "allergens": [],
    "ingredients": [
      "Rice 160 g",
      "water"
    ],
    "instructions": "1. Rinse 1/2 cup of uncooked rice until the water is clearer.\n2. Cook with 1 cup of water in a pot or rice cooker.\n3. Rest covered for 5 minutes, fluff, and serve about 1 cup."
  },
  {
    "name": "Steamed Brown Rice",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 210,
    "protein": 4.6,
    "carbs": 44.2,
    "fats": 1.6,
    "allergens": [],
    "ingredients": [
      "Rice 160 g",
      "water"
    ],
    "instructions": "1. Rinse 1/2 cup of brown rice.\n2. Add 1 and 1/4 cups of water and bring to a boil.\n3. Lower the heat, cover, and simmer for 35-40 minutes until tender.\n4. Rest for 5 minutes, fluff, and serve."
  },
  {
    "name": "Steamed Sweet Potato (Kamote)",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 163,
    "protein": 0.5,
    "carbs": 38.1,
    "fats": 1,
    "allergens": [],
    "ingredients": [
      "Sweet potato 130 g",
      "water"
    ],
    "instructions": "1. Wash the sweet potato and cut into large chunks.\n2. Steam for 15-20 minutes until a fork goes in easily.\n3. Serve warm with the skin on for more fiber."
  },
  {
    "name": "Boiled Potatoes with Garlic",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 123,
    "protein": 2.7,
    "carbs": 21,
    "fats": 3.1,
    "allergens": [],
    "ingredients": [
      "Potato 150 g",
      "Oil 3 g",
      "Garlic bulb 2 g",
      "parsley",
      "salt",
      "pepper"
    ],
    "instructions": "1. Wash and cut the potatoes into bite-size pieces.\n2. Boil in salted water for 12-15 minutes until tender, then drain.\n3. Saute minced garlic in a little oil, then toss with the potatoes, parsley and pepper.\n4. Serve warm."
  },
  {
    "name": "Sotanghon with Vegetables",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 210,
    "protein": 1.3,
    "carbs": 41.6,
    "fats": 4.3,
    "allergens": [
      "Soy",
      "Gluten"
    ],
    "ingredients": [
      "Noodles 40 g",
      "Carrot 30 g",
      "Cabbage 30 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Soy sauce 8 g",
      "Oil 4 g"
    ],
    "instructions": "1. Soak the sotanghon in warm water for 10 minutes, then drain and cut into shorter lengths.\n2. Saute garlic and onion in oil.\n3. Add carrots and cabbage and cook for 3 minutes.\n4. Add the sotanghon, soy sauce and a little water. Toss until the noodles are soft and the liquid is absorbed.\n5. Serve warm."
  },
  {
    "name": "Nilagang Kamoteng Kahoy",
    "category": "Carbs",
    "meal_type": "Dinner",
    "calories": 144,
    "protein": 0.5,
    "carbs": 35.2,
    "fats": 0.1,
    "allergens": [],
    "ingredients": [
      "Cassava 130 g",
      "water",
      "salt"
    ],
    "instructions": "1. Peel the cassava, remove the tough center core, and cut into chunks.\n2. Boil in salted water for 20-25 minutes until soft.\n3. Drain and serve warm."
  },
  {
    "name": "Toast with Crushed Peanuts",
    "category": "Fats",
    "meal_type": "Breakfast",
    "calories": 232,
    "protein": 9.8,
    "carbs": 30,
    "fats": 8.1,
    "allergens": [
      "Gluten",
      "Peanuts"
    ],
    "ingredients": [
      "Bread 40 g",
      "Peanut w/o skin 15 g",
      "Honey 5 g"
    ],
    "instructions": "1. Toast 1 slice of brown bread until golden.\n2. Crush the roasted peanuts.\n3. Top the toast with the crushed peanuts and drizzle with a little honey.\n4. Serve right away."
  },
  {
    "name": "Banana with Roasted Peanuts",
    "category": "Fats",
    "meal_type": "Breakfast",
    "calories": 230,
    "protein": 7.5,
    "carbs": 24.6,
    "fats": 11.3,
    "allergens": [
      "Peanuts"
    ],
    "ingredients": [
      "Banana 100 g",
      "Peanut w/o skin 20 g"
    ],
    "instructions": "1. Slice 1 ripe banana into a bowl.\n2. Top with about 20 g of roasted peanuts.\n3. Serve as is or lightly mashed."
  },
  {
    "name": "Cashew and Banana Bowl",
    "category": "Fats",
    "meal_type": "Breakfast",
    "calories": 225,
    "protein": 4.7,
    "carbs": 28.1,
    "fats": 10.4,
    "allergens": [
      "Tree Nuts"
    ],
    "ingredients": [
      "Banana 100 g",
      "Cashew nut 20 g"
    ],
    "instructions": "1. Slice 1 ripe banana into a bowl.\n2. Top with about 20 g of roasted cashew nuts.\n3. Serve as is."
  },
  {
    "name": "Avocado Salad",
    "category": "Fats",
    "meal_type": "Lunch",
    "calories": 169,
    "protein": 1.6,
    "carbs": 15.2,
    "fats": 11.3,
    "allergens": [],
    "ingredients": [
      "Avocado 100 g",
      "Tomato 50 g",
      "Onion 15 g",
      "Oil 5 g",
      "calamansi",
      "salt"
    ],
    "instructions": "1. Cube the avocado and tomato, and slice the onion thinly.\n2. Combine in a bowl.\n3. Drizzle with a little oil and calamansi juice, then season with salt.\n4. Toss gently and serve right away."
  },
  {
    "name": "Ginataang Ampalaya",
    "category": "Fats",
    "meal_type": "Lunch",
    "calories": 235,
    "protein": 4.1,
    "carbs": 7.1,
    "fats": 21.1,
    "allergens": [],
    "ingredients": [
      "Bitter melon/gourd fruit 100 g",
      "Coconut milk 60 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "ginger",
      "salt"
    ],
    "instructions": "1. Slice the ampalaya, salt it lightly, and rinse to reduce the bitterness.\n2. Saute garlic, onion and ginger in a pot.\n3. Add the ampalaya and the coconut milk. Simmer on low heat for 10-12 minutes until tender.\n4. Season with salt and serve."
  },
  {
    "name": "Garlic Mushrooms",
    "category": "Fats",
    "meal_type": "Dinner",
    "calories": 142,
    "protein": 4,
    "carbs": 7.6,
    "fats": 10.6,
    "allergens": [],
    "ingredients": [
      "Mushroom 100 g",
      "Oil 10 g",
      "Garlic bulb 3 g",
      "parsley",
      "salt",
      "pepper"
    ],
    "instructions": "1. Wipe and slice the mushrooms.\n2. Heat the oil and saute the garlic for 30 seconds.\n3. Add the mushrooms and cook for 5-7 minutes until golden.\n4. Season with salt, pepper and parsley, then serve."
  },
  {
    "name": "Cashew and Cucumber Salad",
    "category": "Fats",
    "meal_type": "Dinner",
    "calories": 145,
    "protein": 4.6,
    "carbs": 10.1,
    "fats": 9.6,
    "allergens": [
      "Tree Nuts"
    ],
    "ingredients": [
      "Cashew nut 20 g",
      "Cucumber 80 g",
      "Tomato 50 g",
      "vinegar",
      "salt"
    ],
    "instructions": "1. Slice the cucumber and tomato.\n2. Toss with a splash of vinegar and a pinch of salt.\n3. Top with the roasted cashew nuts and serve."
  },
  {
    "name": "Ginataang Labong",
    "category": "Fats",
    "meal_type": "Dinner",
    "calories": 242,
    "protein": 4.9,
    "carbs": 7.8,
    "fats": 21.2,
    "allergens": [],
    "ingredients": [
      "Bamboo shoot 100 g",
      "Coconut milk 60 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "ginger",
      "chili",
      "salt"
    ],
    "instructions": "1. Boil the sliced bamboo shoots for 5 minutes and drain to remove bitterness.\n2. Saute garlic, onion and ginger.\n3. Add the bamboo shoots and coconut milk. Simmer for 15 minutes.\n4. Season with salt and chili, then serve."
  },
  {
    "name": "Ensaladang Kamatis at Sibuyas",
    "category": "Vegetable",
    "meal_type": "Breakfast",
    "calories": 43,
    "protein": 1.3,
    "carbs": 9.1,
    "fats": 0.2,
    "allergens": [],
    "ingredients": [
      "Tomato 120 g",
      "Onion 20 g",
      "vinegar",
      "salt"
    ],
    "instructions": "1. Slice the tomatoes and onion.\n2. Toss with a splash of vinegar and a pinch of salt.\n3. Let sit for 5 minutes, then serve."
  },
  {
    "name": "Ginisang Alugbati",
    "category": "Vegetable",
    "meal_type": "Breakfast",
    "calories": 88,
    "protein": 2.8,
    "carbs": 7.1,
    "fats": 5.4,
    "allergens": [],
    "ingredients": [
      "Malabar nightshade leaves 100 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Heat the oil and saute garlic and onion until fragrant.\n2. Add the alugbati leaves and stir for 2-3 minutes until just wilted.\n3. Season with salt and serve right away."
  },
  {
    "name": "Cucumber and Tomato Salad",
    "category": "Vegetable",
    "meal_type": "Breakfast",
    "calories": 63,
    "protein": 1.1,
    "carbs": 7.4,
    "fats": 3.2,
    "allergens": [],
    "ingredients": [
      "Cucumber 100 g",
      "Tomato 80 g",
      "Oil 3 g",
      "vinegar",
      "salt",
      "pepper"
    ],
    "instructions": "1. Slice the cucumber and tomato.\n2. Whisk the oil, vinegar, salt and pepper.\n3. Toss the vegetables in the dressing and serve cold."
  },
  {
    "name": "Ginisang Repolyo",
    "category": "Vegetable",
    "meal_type": "Lunch",
    "calories": 96,
    "protein": 1.4,
    "carbs": 10.7,
    "fats": 5.3,
    "allergens": [],
    "ingredients": [
      "Cabbage 120 g",
      "Carrot 30 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Saute garlic and onion in oil.\n2. Add the carrot and cook for 2 minutes.\n3. Add the sliced cabbage and cook for 4-5 minutes until tender-crisp.\n4. Season with salt and serve."
  },
  {
    "name": "Ensaladang Talong",
    "category": "Vegetable",
    "meal_type": "Lunch",
    "calories": 79,
    "protein": 1.9,
    "carbs": 10.6,
    "fats": 3.2,
    "allergens": [],
    "ingredients": [
      "Eggplant 120 g",
      "Tomato 50 g",
      "Onion 15 g",
      "Oil 3 g",
      "vinegar",
      "salt"
    ],
    "instructions": "1. Grill or roast the eggplant until the skin is charred and the flesh is soft.\n2. Peel off the skin and slice the flesh.\n3. Top with chopped tomato and onion.\n4. Dress with vinegar, a little oil and salt, then serve."
  },
  {
    "name": "Ginisang Pechay",
    "category": "Vegetable",
    "meal_type": "Lunch",
    "calories": 66,
    "protein": 1.4,
    "carbs": 3.6,
    "fats": 5.1,
    "allergens": [],
    "ingredients": [
      "Chinese cabbage 120 g",
      "Garlic bulb 3 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Wash and cut the pechay into 2-inch pieces, separating stems from leaves.\n2. Saute garlic in oil, then add the stems for 2 minutes.\n3. Add the leaves and cook for 1-2 minutes until wilted.\n4. Season with salt and serve."
  },
  {
    "name": "Ginisang Sayote",
    "category": "Vegetable",
    "meal_type": "Dinner",
    "calories": 82,
    "protein": 1,
    "carbs": 7.9,
    "fats": 5.2,
    "allergens": [],
    "ingredients": [
      "Chayote fruit 120 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Tomato 30 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Peel and slice the sayote into thin strips.\n2. Saute garlic, onion and tomato in oil.\n3. Add the sayote and a splash of water. Cover and cook for 6-8 minutes until tender.\n4. Season with salt and serve."
  },
  {
    "name": "Ginisang Upo",
    "category": "Vegetable",
    "meal_type": "Dinner",
    "calories": 83,
    "protein": 0.9,
    "carbs": 8.3,
    "fats": 5.1,
    "allergens": [],
    "ingredients": [
      "Bottle gourd fruit 120 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Tomato 30 g",
      "Oil 5 g",
      "salt"
    ],
    "instructions": "1. Peel the upo and slice into half-moons.\n2. Saute garlic, onion and tomato in oil.\n3. Add the upo and a little water. Cover and cook for 7-10 minutes until soft.\n4. Season with salt and serve."
  },
  {
    "name": "Steamed Cauliflower and Carrots",
    "category": "Vegetable",
    "meal_type": "Dinner",
    "calories": 48,
    "protein": 2,
    "carbs": 9.1,
    "fats": 0.4,
    "allergens": [],
    "ingredients": [
      "Cauliflower 100 g",
      "Carrot 50 g",
      "water",
      "salt"
    ],
    "instructions": "1. Cut the cauliflower into florets and slice the carrots.\n2. Steam for 5-6 minutes until tender-crisp.\n3. Sprinkle with a pinch of salt and serve."
  },
  {
    "name": "Garlic Green Beans (Sitaw)",
    "category": "Vegetable",
    "meal_type": "Dinner",
    "calories": 113,
    "protein": 5.1,
    "carbs": 10.5,
    "fats": 5.6,
    "allergens": [],
    "ingredients": [
      "String/Yard long bean pod 120 g",
      "Garlic bulb 4 g",
      "Oil 5 g",
      "salt",
      "pepper"
    ],
    "instructions": "1. Cut the sitaw into 2-inch pieces.\n2. Heat oil and saute minced garlic until golden.\n3. Add the sitaw and stir-fry for 5-6 minutes until tender-crisp.\n4. Season with salt and pepper, then serve."
  },
  {
    "name": "Tuna and Egg Scramble",
    "category": "Protein",
    "meal_type": "Breakfast",
    "calories": 171,
    "protein": 14.9,
    "carbs": 3.8,
    "fats": 10.7,
    "allergens": [
      "Eggs",
      "Fish"
    ],
    "ingredients": [
      "Egg 60 g",
      "Tuna flakes 40 g",
      "Tomato 30 g",
      "Onion 10 g",
      "Oil 4 g",
      "salt"
    ],
    "instructions": "1. Saute onion and tomato in oil for 2 minutes.\n2. Add the drained tuna flakes and cook for 1 minute.\n3. Pour in the beaten egg and stir gently until set.\n4. Season with salt and serve."
  },
  {
    "name": "Cottage Cheese with Banana",
    "category": "Protein",
    "meal_type": "Breakfast",
    "calories": 190,
    "protein": 13.9,
    "carbs": 25.3,
    "fats": 3.7,
    "allergens": [
      "Dairy"
    ],
    "ingredients": [
      "Cheese 100 g",
      "Banana 80 g",
      "Honey 5 g"
    ],
    "instructions": "1. Scoop about 1/2 cup of cottage cheese into a bowl.\n2. Top with sliced banana.\n3. Drizzle with a little honey and serve."
  },
  {
    "name": "Sinigang na Hipon",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 153,
    "protein": 26.2,
    "carbs": 9,
    "fats": 1.4,
    "allergens": [
      "Shellfish"
    ],
    "ingredients": [
      "Shrimp 120 g",
      "Tomato 40 g",
      "Onion 15 g",
      "String/Yard long bean pod 30 g",
      "Chinese cabbage 40 g",
      "sinigang mix",
      "salt"
    ],
    "instructions": "1. Boil water with onion and tomato.\n2. Add the sinigang mix. Simmer for 5 minutes.\n3. Add the sitaw, then the shrimp. Cook for 3-4 minutes until the shrimp turn pink.\n4. Add the pechay last, season with salt, and serve."
  },
  {
    "name": "Inihaw na Pusit",
    "category": "Protein",
    "meal_type": "Lunch",
    "calories": 114,
    "protein": 21.5,
    "carbs": 3.7,
    "fats": 1.5,
    "allergens": [
      "Shellfish"
    ],
    "ingredients": [
      "Squid 120 g",
      "Tomato 30 g",
      "Onion 10 g",
      "Garlic bulb 3 g",
      "calamansi",
      "salt"
    ],
    "instructions": "1. Clean the squid and keep the body whole.\n2. Stuff with chopped tomato, onion and garlic and season with salt.\n3. Grill for 3-4 minutes per side until opaque. Do not overcook.\n4. Serve with calamansi."
  },
  {
    "name": "Sweet and Sour Fish",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 256,
    "protein": 22.9,
    "carbs": 16.6,
    "fats": 10.9,
    "allergens": [
      "Fish"
    ],
    "ingredients": [
      "Tilapia 120 g",
      "Pepper 30 g",
      "Carrot 30 g",
      "Tomato sauce 30 g",
      "Sugar 8 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 6 g",
      "vinegar",
      "salt"
    ],
    "instructions": "1. Season the fish with salt.\n2. Pan-fry in oil until golden on both sides, then set aside.\n3. Saute garlic and onion, then add carrot and bell pepper.\n4. Add tomato sauce, vinegar and sugar. Simmer until slightly thick.\n5. Pour the sauce over the fish and serve."
  },
  {
    "name": "Pork Giniling",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 300,
    "protein": 15.9,
    "carbs": 14.8,
    "fats": 19.7,
    "allergens": [
      "Soy",
      "Gluten"
    ],
    "ingredients": [
      "Pork 100 g",
      "Potato 50 g",
      "Carrot 30 g",
      "Tomato sauce 20 g",
      "Soy sauce 8 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "Oil 3 g"
    ],
    "instructions": "1. Saute garlic and onion in oil.\n2. Add the ground pork and cook until browned.\n3. Add soy sauce and tomato sauce, then the diced potato and carrot.\n4. Cover and simmer for 12-15 minutes until the vegetables are tender.\n5. Serve warm."
  },
  {
    "name": "Chicken Pochero",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 334,
    "protein": 29.5,
    "carbs": 39.1,
    "fats": 6.6,
    "allergens": [],
    "ingredients": [
      "Chicken breast 120 g",
      "Banana 40 g",
      "Potato 60 g",
      "Cabbage 50 g",
      "Chickpea 20 g",
      "Tomato sauce 30 g",
      "Garlic bulb 3 g",
      "Onion 10 g",
      "salt"
    ],
    "instructions": "1. Saute garlic and onion, then brown the chicken pieces.\n2. Add tomato sauce and enough water to cover. Simmer for 20 minutes.\n3. Add the potato, saba and chickpeas. Cook for 10 minutes.\n4. Add the cabbage, cook for 3 minutes, and season with salt.\n5. Serve warm."
  },
  {
    "name": "Daing na Bangus",
    "category": "Protein",
    "meal_type": "Dinner",
    "calories": 223,
    "protein": 24,
    "carbs": 1,
    "fats": 13.7,
    "allergens": [
      "Fish"
    ],
    "ingredients": [
      "Milkfish 120 g",
      "Oil 6 g",
      "Garlic bulb 4 g",
      "vinegar",
      "black pepper",
      "salt"
    ],
    "instructions": "1. Marinate the butterflied bangus in vinegar, crushed garlic, salt and pepper for at least 1 hour.\n2. Pat dry.\n3. Pan-fry in a little oil for 4-5 minutes per side until golden and cooked through.\n4. Serve with a vinegar dip."
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