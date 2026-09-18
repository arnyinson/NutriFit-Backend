const pool = require('./src/config/database');
require('dotenv').config();

// Maps a keyword found in an ingredient name to the allergen it represents.
// Used to tag SPECIFIC ingredients with allergens, based only on allergens
// the meal ALREADY declares (we never invent new restrictions).
const ALLERGEN_KEYWORDS = {
  'soy': 'Soy',
  'egg': 'Eggs',
  'milk': 'Dairy',
  'butter': 'Dairy',
  'cheese': 'Dairy',
  'yogurt': 'Dairy',
  'bagoong': 'Shellfish',
  'shrimp': 'Shellfish',
  'oyster': 'Shellfish',
  'fish sauce': 'Fish', // rarely flagged, only tagged if meal already declares Fish
  'tilapia': 'Fish',
  'bangus': 'Fish',
  'salmon': 'Fish',
  'tuna': 'Fish',
  'fish fillet': 'Fish',
  'peanut': 'Peanuts',
  'flour': 'Gluten',
  'bread': 'Gluten',
  'pandesal': 'Gluten',
  'wrapper': 'Gluten',
  'sesame': 'Sesame',
  'tofu': 'Soy',
};

// Ingredient words that define the IDENTITY of a dish — if any of these
// contain an allergen, the whole meal is excluded (no substitute possible).
// Everything else in the ingredients list becomes a substitutable sub-ingredient.
const MAIN_INGREDIENT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'tofu', 'lechon', 'turkey',
  'salmon', 'tuna', 'tilapia', 'bangus', 'fish fillet', 'fish',
  'egg', // only counts as "main" when it's the star of the dish (see MAIN_DISH_IS_EGG below)
  'bread', 'pandesal', 'pancake', 'flour', // toast/pancake base
  'rice', 'oats', 'quinoa', // when the meal is a rice/oats/quinoa-based dish
];

// Dishes where eggs/bread/rice ARE the defining main ingredient
// (as opposed to appearing only as a minor binder/garnish)
const EGG_IS_MAIN_DISH = new Set([
  'Boiled Egg', 'Scrambled Eggs', 'Fried Egg with Sinangag',
  'Tortang Talong', 'Whole Wheat Toast with Egg', 'Pandesal with Egg',
  'Banana Pancakes', 'French Toast',
]);

const tagAllergensForIngredient = (ingredientName, mealDeclaredAllergens) => {
  const lower = ingredientName.toLowerCase();
  const tags = [];
  for (const [keyword, allergen] of Object.entries(ALLERGEN_KEYWORDS)) {
    if (lower.includes(keyword) && mealDeclaredAllergens.includes(allergen)) {
      tags.push(allergen);
    }
  }
  return [...new Set(tags)];
};

const isMainIngredient = (ingredientName, mealName) => {
  const lower = ingredientName.toLowerCase();

  // Egg is only "main" for dishes where egg IS the dish
  if (lower.includes('egg')) {
    return EGG_IS_MAIN_DISH.has(mealName);
  }
  // Bread/flour is only "main" for toast/pancake-type dishes
  if (lower.includes('bread') || lower.includes('pandesal') || lower === 'flour') {
    return EGG_IS_MAIN_DISH.has(mealName) || mealName.toLowerCase().includes('toast');
  }
  // Rice is main only when it's clearly the entree base (congee/porridge dishes),
  // not when it's a side like "leftover rice" in a fried egg dish
  if (lower === 'rice' || lower === 'brown rice' || lower === 'leftover rice') {
    return false; // treat rice as a side/sub in this dataset, always substitutable/removable
  }

  return MAIN_INGREDIENT_KEYWORDS.some((kw) => lower.includes(kw) && kw !== 'egg' && kw !== 'bread' && kw !== 'rice');
};

const seedAllergenData = async () => {
  try {
    // Step 1: Seed default substitutes
    const substitutes = [
      { ingredient_name: 'soy sauce', allergen: 'Soy', substitute_name: 'Coconut Aminos', notes: 'Similar salty flavor, naturally soy-free' },
      { ingredient_name: 'peanut butter', allergen: 'Peanuts', substitute_name: 'Sunflower Seed Butter', notes: 'Similar texture and richness, nut-free' },
      { ingredient_name: 'milk', allergen: 'Dairy', substitute_name: 'Oat Milk', substitute_name2: null, notes: 'Dairy-free, neutral flavor' },
      { ingredient_name: 'butter', allergen: 'Dairy', substitute_name: 'Plant-Based Margarine', notes: 'Dairy-free, similar cooking properties' },
      { ingredient_name: 'cheese', allergen: 'Dairy', substitute_name: 'Dairy-Free Cheese', notes: 'Plant-based alternative' },
      { ingredient_name: 'greek yogurt', allergen: 'Dairy', substitute_name: 'Coconut Yogurt', notes: 'Dairy-free, similar texture' },
      { ingredient_name: 'bagoong', allergen: 'Shellfish', substitute_name: 'Extra Fish Sauce (Patis)', notes: 'Adds umami without shellfish' },
      { ingredient_name: 'bagoong alamang', allergen: 'Shellfish', substitute_name: 'Extra Fish Sauce (Patis)', notes: 'Adds umami without shellfish' },
    ];

    for (const sub of substitutes) {
      await pool.query(
        `INSERT INTO allergen_substitutes (ingredient_name, allergen, substitute_name, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ingredient_name, allergen) DO UPDATE SET
           substitute_name = EXCLUDED.substitute_name, notes = EXCLUDED.notes`,
        [sub.ingredient_name, sub.allergen, sub.substitute_name, sub.notes]
      );
    }
    console.log(`✅ Seeded ${substitutes.length} default allergen substitutes`);

    // Step 2: Split every existing meal's ingredients into main_ingredients / sub_ingredients
    const meals = await pool.query('SELECT id, name, allergens, ingredients FROM meals');

    for (const meal of meals.rows) {
      const declaredAllergens = meal.allergens || [];
      const ingredients = meal.ingredients || [];

      const mainIngredients = [];
      const subIngredients = [];

      for (const ingName of ingredients) {
        const tags = tagAllergensForIngredient(ingName, declaredAllergens);
        const entry = { name: ingName, allergens: tags };

        if (isMainIngredient(ingName, meal.name)) {
          mainIngredients.push(entry);
        } else {
          subIngredients.push({ ...entry, substitute_override: null });
        }
      }

      await pool.query(
        'UPDATE meals SET main_ingredients = $1, sub_ingredients = $2 WHERE id = $3',
        [JSON.stringify(mainIngredients), JSON.stringify(subIngredients), meal.id]
      );
    }

    console.log(`✅ Split ${meals.rows.length} meals into main_ingredients / sub_ingredients`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seedAllergenData();