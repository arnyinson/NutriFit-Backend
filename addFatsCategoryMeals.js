const pool = require('./src/config/database');
require('dotenv').config();

const meals = [
  {
    name: 'Avocado Toast',
    category: 'Fats',
    meal_type: 'Breakfast',
    calories: 321,
    protein: 10,
    carbs: 36,
    fats: 17,
    main_ingredients: [
      { name: 'avocado', allergens: [] },
    ],
    sub_ingredients: [
      { name: 'whole wheat bread', allergens: ['Gluten'], substitute_override: null },
      { name: 'salt', allergens: [], substitute_override: null },
      { name: 'black pepper', allergens: [], substitute_override: null },
    ],
    instructions: '1. Toast 2 slices of whole wheat bread until golden. 2. Mash half an avocado in a bowl. 3. Spread mashed avocado evenly on toast. 4. Season with salt and black pepper to taste.',
  },
  {
    name: 'Peanut Trail Mix',
    category: 'Fats',
    meal_type: 'Lunch',
    calories: 300,
    protein: 12,
    carbs: 22,
    fats: 21,
    main_ingredients: [
      { name: 'roasted peanuts', allergens: ['Peanuts'] },
    ],
    sub_ingredients: [
      { name: 'raisins', allergens: [], substitute_override: null },
    ],
    instructions: '1. Combine 40g roasted peanuts with 20g raisins in a small container. 2. Mix well and serve as a snack or light meal.',
  },
  {
    name: 'Ginataang Kalabasa at Sitaw',
    category: 'Fats',
    meal_type: 'Lunch',
    calories: 240,
    protein: 4,
    carbs: 13,
    fats: 22,
    main_ingredients: [
      { name: 'coconut milk', allergens: [] },
    ],
    sub_ingredients: [
      { name: 'kalabasa (squash)', allergens: [], substitute_override: null },
      { name: 'sitaw (string beans)', allergens: [], substitute_override: null },
      { name: 'garlic', allergens: [], substitute_override: null },
      { name: 'onion', allergens: [], substitute_override: null },
      { name: 'bagoong alamang', allergens: ['Shellfish'], substitute_override: 'Fish sauce (patis)' },
    ],
    instructions: '1. Sauté garlic and onion. 2. Add coconut milk and bring to a simmer. 3. Add squash, cook until slightly tender. 4. Add string beans, cook until all vegetables are tender. 5. Season with bagoong alamang or patis.',
  },
  {
    name: 'Laing',
    category: 'Fats',
    meal_type: 'Dinner',
    calories: 337,
    protein: 8,
    carbs: 11,
    fats: 33,
    main_ingredients: [
      { name: 'coconut milk', allergens: [] },
      { name: 'taro leaves (gabi)', allergens: [] },
    ],
    sub_ingredients: [
      { name: 'garlic', allergens: [], substitute_override: null },
      { name: 'onion', allergens: [], substitute_override: null },
      { name: 'ginger', allergens: [], substitute_override: null },
      { name: 'chili', allergens: [], substitute_override: null },
      { name: 'bagoong alamang', allergens: ['Shellfish'], substitute_override: 'Fish sauce (patis)' },
    ],
    instructions: '1. Simmer coconut milk with garlic, onion, and ginger. 2. Add dried taro leaves, do not stir immediately to avoid itchiness. 3. Simmer until coconut milk reduces and oil separates. 4. Add chili and bagoong alamang. 5. Gently mix and simmer a few more minutes before serving.',
  },
  {
    name: 'Cashew and Raisin Snack Mix',
    category: 'Fats',
    meal_type: 'Lunch',
    calories: 226,
    protein: 6,
    carbs: 25,
    fats: 13,
    main_ingredients: [
      { name: 'cashew nuts', allergens: ['Tree Nuts'] },
    ],
    sub_ingredients: [
      { name: 'raisins', allergens: [], substitute_override: null },
    ],
    instructions: '1. Combine 30g raw cashew nuts with 20g raisins. 2. Mix well and store in an airtight container.',
  },
];

const insertMeals = async () => {
  try {
    for (const meal of meals) {
      // Kunin ang lahat ng allergens mula sa main + sub ingredients
      const allAllergens = new Set();
      meal.main_ingredients.forEach((i) => i.allergens.forEach((a) => allAllergens.add(a)));
      meal.sub_ingredients.forEach((i) => i.allergens.forEach((a) => allAllergens.add(a)));

      await pool.query(
        `INSERT INTO meals (
          name, category, meal_type, calories, protein, carbs, fats,
          allergens, ingredients, instructions, main_ingredients, sub_ingredients
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          meal.name, meal.category, meal.meal_type, meal.calories,
          meal.protein, meal.carbs, meal.fats,
          [...allAllergens], [], meal.instructions,
          JSON.stringify(meal.main_ingredients), JSON.stringify(meal.sub_ingredients),
        ]
      );
      console.log(`✅ Added: ${meal.name}`);
    }
    console.log('🎉 All Fats category meals added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Insert error:', err.message);
    process.exit(1);
  }
};

insertMeals();