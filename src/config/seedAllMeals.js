const pool = require('./database');
require('dotenv').config();

const meals = [
  // ============================================
  // BREAKFAST — PhilFCT (7 meals)
  // ============================================
  {
    name: 'Arroz Caldo',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 63,
    protein: 2.0,
    carbs: 12.8,
    fats: 0.4,
    allergens: [],
    ingredients: ['rice', 'chicken', 'ginger', 'onion', 'garlic', 'fish sauce'],
    instructions: '1. Sauté ginger, onion, and garlic in oil. 2. Add chicken and cook until light brown. 3. Add rice and water. 4. Simmer until porridge consistency. 5. Season with fish sauce. 6. Top with green onions and fried garlic.',
    source: 'PhilFCT'
  },
  {
    name: 'Champorado',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 97,
    protein: 1.7,
    carbs: 22.0,
    fats: 0.2,
    allergens: ['Dairy'],
    ingredients: ['glutinous rice', 'cocoa powder', 'milk', 'sugar'],
    instructions: '1. Cook glutinous rice in water until soft. 2. Add cocoa powder and stir well. 3. Add sugar to taste. 4. Simmer until thick. 5. Serve with milk drizzled on top.',
    source: 'PhilFCT'
  },
  {
    name: 'Lugaw',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 71,
    protein: 1.4,
    carbs: 13.9,
    fats: 1.1,
    allergens: [],
    ingredients: ['rice', 'ginger', 'onion', 'garlic', 'fish sauce'],
    instructions: '1. Sauté ginger, onion, and garlic in oil. 2. Add rice and water. 3. Simmer on low heat stirring occasionally. 4. Cook until porridge consistency. 5. Season with fish sauce and serve hot.',
    source: 'PhilFCT'
  },
  {
    name: 'Sinangag',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 187,
    protein: 2.6,
    carbs: 35.2,
    fats: 4.0,
    allergens: [],
    ingredients: ['leftover rice', 'garlic', 'cooking oil', 'salt', 'green onions'],
    instructions: '1. Heat oil in pan over medium heat. 2. Sauté garlic until golden brown. 3. Add leftover rice and break up clumps. 4. Stir fry until heated through. 5. Season with salt. 6. Top with green onions and serve.',
    source: 'PhilFCT'
  },
  {
    name: 'Maja Blanca',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 149,
    protein: 1.3,
    carbs: 33.4,
    fats: 1.1,
    allergens: ['Dairy'],
    ingredients: ['coconut milk', 'cornstarch', 'sugar', 'milk', 'corn kernels'],
    instructions: '1. Mix coconut milk, cornstarch, and sugar in pot. 2. Add milk and corn kernels. 3. Cook over medium heat stirring constantly. 4. Cook until mixture thickens. 5. Pour into greased pan. 6. Cool until set. 7. Slice and serve.',
    source: 'PhilFCT'
  },
  {
    name: 'Fried Egg with Sinangag',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 285,
    protein: 10.4,
    carbs: 32.6,
    fats: 12.8,
    allergens: ['Eggs'],
    ingredients: ['eggs', 'leftover rice', 'garlic', 'cooking oil', 'salt'],
    instructions: '1. Fry garlic in oil until golden. 2. Add rice and stir fry until heated. 3. Season rice with salt. 4. In separate pan, fry egg sunny side up. 5. Serve egg on top of sinangag.',
    source: 'PhilFCT'
  },
  {
    name: 'Pandesal with Egg',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 265,
    protein: 11.2,
    carbs: 38.4,
    fats: 7.6,
    allergens: ['Eggs', 'Gluten', 'Dairy'],
    ingredients: ['pandesal', 'eggs', 'butter', 'salt'],
    instructions: '1. Toast pandesal until warm. 2. Fry egg in butter. 3. Season with salt. 4. Serve egg with pandesal on the side.',
    source: 'PhilFCT'
  },

  // ============================================
  // BREAKFAST — USDA (10 meals)
  // ============================================
  {
    name: 'Scrambled Eggs',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 148,
    protein: 10.1,
    carbs: 1.6,
    fats: 11.2,
    allergens: ['Eggs', 'Dairy'],
    ingredients: ['eggs', 'butter', 'milk', 'salt', 'pepper'],
    instructions: '1. Beat eggs with milk, salt and pepper. 2. Heat butter in pan over low heat. 3. Pour in egg mixture. 4. Gently stir until soft curds form. 5. Remove from heat while still slightly wet. 6. Serve immediately.',
    source: 'USDA'
  },
  {
    name: 'Oatmeal with Banana',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 158,
    protein: 5.4,
    carbs: 28.1,
    fats: 3.2,
    allergens: [],
    ingredients: ['rolled oats', 'banana', 'milk', 'honey', 'cinnamon'],
    instructions: '1. Boil water or milk in pot. 2. Add oats and stir. 3. Cook for 5 minutes stirring occasionally. 4. Slice banana on top. 5. Drizzle honey and sprinkle cinnamon. 6. Serve warm.',
    source: 'USDA'
  },
  {
    name: 'Boiled Egg',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 155,
    protein: 12.6,
    carbs: 1.1,
    fats: 10.6,
    allergens: ['Eggs'],
    ingredients: ['eggs', 'water', 'salt'],
    instructions: '1. Place eggs in pot and cover with cold water. 2. Bring to boil over medium heat. 3. For soft boiled: cook 6 minutes. For hard boiled: cook 10 minutes. 4. Transfer to ice water to stop cooking. 5. Peel and serve with salt.',
    source: 'USDA'
  },
  {
    name: 'Banana Pancakes',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 227,
    protein: 6.4,
    carbs: 35.2,
    fats: 7.1,
    allergens: ['Eggs', 'Dairy', 'Gluten'],
    ingredients: ['banana', 'eggs', 'flour', 'milk', 'baking powder', 'butter'],
    instructions: '1. Mash ripe bananas in bowl. 2. Add eggs, milk, and flour. Mix well. 3. Add baking powder and stir. 4. Heat butter in pan over medium heat. 5. Pour 1/4 cup batter per pancake. 6. Cook until bubbles form, flip and cook 1 more minute. 7. Serve with maple syrup.',
    source: 'USDA'
  },
  {
    name: 'Greek Yogurt with Fruits',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 130,
    protein: 11.2,
    carbs: 16.4,
    fats: 1.8,
    allergens: ['Dairy'],
    ingredients: ['greek yogurt', 'mixed berries', 'honey', 'granola'],
    instructions: '1. Scoop greek yogurt into bowl. 2. Top with mixed berries. 3. Drizzle honey on top. 4. Add granola for crunch. 5. Serve immediately.',
    source: 'USDA'
  },
  {
    name: 'Whole Wheat Toast with Egg',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 245,
    protein: 14.2,
    carbs: 24.8,
    fats: 9.6,
    allergens: ['Eggs', 'Gluten'],
    ingredients: ['whole wheat bread', 'eggs', 'butter', 'salt', 'pepper'],
    instructions: '1. Toast whole wheat bread until golden. 2. Fry egg in butter over medium heat. 3. Season with salt and pepper. 4. Place egg on toast. 5. Serve immediately.',
    source: 'USDA'
  },
  {
    name: 'French Toast',
    category: 'Carbs',
    meal_type: 'Breakfast',
    calories: 229,
    protein: 8.4,
    carbs: 27.6,
    fats: 9.8,
    allergens: ['Eggs', 'Dairy', 'Gluten'],
    ingredients: ['bread', 'eggs', 'milk', 'cinnamon', 'vanilla', 'butter', 'maple syrup'],
    instructions: '1. Beat eggs with milk, cinnamon, and vanilla. 2. Dip bread slices in egg mixture. 3. Heat butter in pan over medium heat. 4. Cook bread until golden, about 2-3 minutes per side. 5. Serve with maple syrup and fresh fruits.',
    source: 'USDA'
  },
  {
    name: 'Protein Smoothie',
    category: 'Protein',
    meal_type: 'Breakfast',
    calories: 220,
    protein: 25.4,
    carbs: 22.8,
    fats: 3.2,
    allergens: ['Dairy'],
    ingredients: ['protein powder', 'banana', 'milk', 'peanut butter', 'ice'],
    instructions: '1. Add all ingredients to blender. 2. Blend until smooth. 3. Add more milk if too thick. 4. Pour into glass and serve immediately.',
    source: 'USDA'
  },

  // ============================================
  // LUNCH — PhilFCT (13 meals)
  // ============================================
  {
    name: 'Chicken Adobo',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 189,
    protein: 14.5,
    carbs: 0.0,
    fats: 14.6,
    allergens: ['Soy'],
    ingredients: ['chicken', 'soy sauce', 'vinegar', 'garlic', 'bay leaf', 'black pepper', 'cooking oil'],
    instructions: '1. Heat oil in pan over medium heat. 2. Add garlic and cook until brown. 3. Add chicken and sauté for 5 minutes. 4. Add soy sauce, water, peppercorns and bay leaves. Let boil. 5. Cover and simmer for 30 minutes. 6. Pour in vinegar and let boil before stirring. 7. Cook until sauce reduces. 8. Serve with warm rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Pork Adobo',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 277,
    protein: 10.3,
    carbs: 3.1,
    fats: 24.8,
    allergens: ['Soy'],
    ingredients: ['pork belly', 'soy sauce', 'vinegar', 'garlic', 'bay leaf', 'whole peppercorns', 'cooking oil'],
    instructions: '1. Heat oil in pan over medium heat. 2. Add garlic and cook until brown. 3. Add pork and sauté for 5 minutes. 4. Add soy sauce, water, peppercorns and bay leaves. Let boil. 5. Cover and simmer until pork is tender. 6. Pour in vinegar and let boil before stirring. 7. Cook until sauce reduces. 8. Serve with warm rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Pork Adobo with Egg',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 261,
    protein: 13.4,
    carbs: 6.3,
    fats: 20.2,
    allergens: ['Soy', 'Eggs'],
    ingredients: ['pork belly', 'eggs', 'soy sauce', 'vinegar', 'garlic', 'bay leaf', 'cooking oil'],
    instructions: '1. Hard boil eggs and peel. Set aside. 2. Heat oil and sauté garlic until brown. 3. Add pork and brown on all sides. 4. Add soy sauce, vinegar, bay leaves, and water. Boil. 5. Cover and simmer until pork is tender. 6. Add boiled eggs and simmer for 5 more minutes. 7. Cook until sauce reduces. 8. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Beef Kare-Kare',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 64,
    protein: 9.0,
    carbs: 4.4,
    fats: 1.1,
    allergens: ['Peanuts'],
    ingredients: ['beef', 'peanut butter', 'eggplant', 'banana blossom', 'string beans', 'bagoong', 'annatto seeds'],
    instructions: '1. Boil beef until tender. 2. Add annatto water for color. 3. Add peanut butter and stir until smooth. 4. Add eggplant and banana blossom. Cook for 5 minutes. 5. Add string beans and cook for 3 minutes. 6. Season with salt. 7. Serve with bagoong on the side.',
    source: 'PhilFCT'
  },
  {
    name: 'Lechon Paksiw',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 214,
    protein: 12.8,
    carbs: 6.4,
    fats: 15.2,
    allergens: [],
    ingredients: ['lechon', 'liver sauce', 'vinegar', 'garlic', 'onion', 'bay leaf', 'sugar', 'peppercorns'],
    instructions: '1. Sauté garlic and onion in oil. 2. Add lechon pieces and brown lightly. 3. Add liver sauce and vinegar. Let boil. 4. Add bay leaves, peppercorns, and sugar. 5. Cover and simmer for 20 minutes. 6. Adjust seasoning. 7. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Caldereta',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 284,
    protein: 13.3,
    carbs: 1.6,
    fats: 24.9,
    allergens: ['Dairy'],
    ingredients: ['pork or beef', 'tomato sauce', 'liver spread', 'potatoes', 'carrots', 'bell pepper', 'cheese', 'garlic', 'onion'],
    instructions: '1. Sauté garlic and onion. 2. Add meat and brown on all sides. 3. Add tomato sauce and liver spread. Stir well. 4. Add water and bring to boil. 5. Cover and simmer until meat is tender. 6. Add potatoes and carrots. Cook for 10 minutes. 7. Add bell pepper and cheese. Stir until cheese melts. 8. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Pork Afritada',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 123,
    protein: 6.3,
    carbs: 6.3,
    fats: 8.1,
    allergens: [],
    ingredients: ['pork', 'tomato sauce', 'potatoes', 'carrots', 'bell pepper', 'garlic', 'onion', 'cooking oil'],
    instructions: '1. Sauté garlic and onion in oil. 2. Add pork and brown on all sides. 3. Add tomato sauce and water. Bring to boil. 4. Cover and simmer for 30 minutes. 5. Add potatoes and carrots. Cook for 10 minutes. 6. Add bell pepper and cook for 3 minutes. 7. Season with salt and pepper. 8. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Dinuguan',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 155,
    protein: 14.8,
    carbs: 0.0,
    fats: 10.6,
    allergens: [],
    ingredients: ['pork', 'pork blood', 'vinegar', 'garlic', 'onion', 'green chili', 'cooking oil'],
    instructions: '1. Sauté garlic and onion in oil. 2. Add pork and cook until brown. 3. Pour in pork blood and stir. 4. Add vinegar and bring to boil without stirring. 5. Add green chili. 6. Simmer until sauce thickens. 7. Season with salt. 8. Serve with rice or puto.',
    source: 'PhilFCT'
  },
  {
    name: 'Pork Sinigang',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 120,
    protein: 9.5,
    carbs: 5.2,
    fats: 7.1,
    allergens: [],
    ingredients: ['pork belly', 'kangkong', 'string beans', 'eggplant', 'daikon radish', 'tomatoes', 'onion', 'sampalok mix', 'fish sauce'],
    instructions: '1. Boil pork with onion and tomatoes. Skim scum. 2. Add sampalok mix and fish sauce. 3. Cover and simmer for 1 hour. 4. Add daikon and eggplant. Cook 5 minutes. 5. Add string beans. Cook 3 minutes. 6. Add kangkong last. Season. 7. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Tinolang Manok',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 145,
    protein: 16.8,
    carbs: 8.4,
    fats: 4.2,
    allergens: [],
    ingredients: ['chicken', 'green papaya', 'malunggay', 'ginger', 'onion', 'garlic', 'fish sauce'],
    instructions: '1. Sauté ginger, onion, and garlic in oil. 2. Add chicken pieces and cook until light brown. 3. Add water and bring to boil. 4. Add papaya and cook for 5 minutes. 5. Add malunggay leaves. 6. Season with fish sauce. 7. Serve hot with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Beef Nilaga',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 198,
    protein: 18.4,
    carbs: 12.6,
    fats: 8.2,
    allergens: [],
    ingredients: ['beef', 'potatoes', 'cabbage', 'pechay', 'onion', 'peppercorns', 'fish sauce'],
    instructions: '1. Boil beef with onion and peppercorns until tender. 2. Add potatoes and cook for 10 minutes. 3. Add cabbage and pechay. 4. Season with fish sauce and salt. 5. Serve hot with rice.',
    source: 'USDA'
  },
  {
    name: 'Grilled Bangus',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 168,
    protein: 22.4,
    carbs: 0.0,
    fats: 8.6,
    allergens: ['Fish'],
    ingredients: ['bangus', 'calamansi', 'garlic', 'salt', 'pepper', 'onion', 'tomato'],
    instructions: '1. Clean and score bangus on both sides. 2. Season with calamansi, garlic, salt, and pepper. 3. Stuff with onion and tomato. 4. Grill over medium heat 8-10 minutes per side. 5. Serve with calamansi and tomato salad.',
    source: 'USDA'
  },
  {
    name: 'Monggo Guisado',
    category: 'Vegetable',
    meal_type: 'Lunch',
    calories: 142,
    protein: 9.8,
    carbs: 22.4,
    fats: 2.4,
    allergens: [],
    ingredients: ['mung beans', 'pork', 'spinach', 'garlic', 'onion', 'tomato', 'fish sauce'],
    instructions: '1. Boil mung beans until soft. 2. Sauté garlic, onion, and tomato. 3. Add pork and cook until brown. 4. Add cooked mung beans and broth. 5. Add spinach and cook for 2 minutes. 6. Season with fish sauce. 7. Serve with rice.',
    source: 'USDA'
  },
  {
    name: 'Chopsuey',
    category: 'Vegetable',
    meal_type: 'Lunch',
    calories: 125,
    protein: 8.4,
    carbs: 14.2,
    fats: 4.2,
    allergens: ['Eggs'],
    ingredients: ['mixed vegetables', 'pork', 'quail eggs', 'garlic', 'onion', 'oyster sauce', 'cornstarch'],
    instructions: '1. Sauté garlic and onion. 2. Add pork and cook until done. 3. Add hard vegetables first. 4. Add soft vegetables. 5. Add oyster sauce and cornstarch mixture. 6. Add quail eggs. 7. Serve with rice.',
    source: 'USDA'
  },
  {
    name: 'Turkey Breast with Quinoa',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 312,
    protein: 38.6,
    carbs: 28.4,
    fats: 5.8,
    allergens: [],
    ingredients: ['turkey breast', 'quinoa', 'mixed vegetables', 'olive oil', 'herbs', 'lemon'],
    instructions: '1. Cook quinoa according to package instructions. 2. Season turkey with herbs and lemon. 3. Grill or bake turkey until cooked through. 4. Sauté mixed vegetables in olive oil. 5. Serve turkey sliced over quinoa with vegetables.',
    source: 'USDA'
  },
  {
    name: 'Grilled Chicken with Brown Rice',
    category: 'Protein',
    meal_type: 'Lunch',
    calories: 385,
    protein: 36.2,
    carbs: 42.8,
    fats: 6.4,
    allergens: [],
    ingredients: ['chicken breast', 'brown rice', 'lemon', 'garlic', 'herbs', 'olive oil'],
    instructions: '1. Marinate chicken with lemon, garlic, and herbs. 2. Cook brown rice according to package. 3. Grill chicken over medium heat 6-7 minutes per side. 4. Rest chicken for 5 minutes before slicing. 5. Serve sliced chicken over brown rice.',
    source: 'USDA'
  },
  {
    name: 'Pinakbet',
    category: 'Vegetable',
    meal_type: 'Lunch',
    calories: 112,
    protein: 5.8,
    carbs: 12.4,
    fats: 5.2,
    allergens: ['Shellfish'],
    ingredients: ['ampalaya', 'eggplant', 'okra', 'string beans', 'squash', 'pork', 'bagoong alamang'],
    instructions: '1. Sauté garlic and onion. 2. Add pork and cook until brown. 3. Add bagoong alamang and stir. 4. Add squash and cook for 3 minutes. 5. Add remaining vegetables. 6. Cover and cook until tender. 7. Serve with rice.',
    source: 'USDA'
  },

  // ============================================
  // DINNER — PhilFCT (14 meals)
  // ============================================
  {
    name: 'Lumpiang Shanghai',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 266,
    protein: 5.8,
    carbs: 38.3,
    fats: 10.0,
    allergens: ['Eggs', 'Gluten'],
    ingredients: ['ground pork', 'carrots', 'onion', 'garlic', 'egg', 'lumpia wrapper', 'cooking oil'],
    instructions: '1. Mix ground pork, carrots, onion, garlic, egg, salt, and pepper. 2. Place 1 tablespoon filling on lumpia wrapper. 3. Roll tightly and seal edge with water. 4. Heat oil in pan for deep frying. 5. Fry lumpia in batches until golden brown. 6. Drain on paper towels. 7. Serve with sweet chili sauce.',
    source: 'PhilFCT'
  },
  {
    name: 'Fried Tilapia',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 107,
    protein: 18.1,
    carbs: 0.0,
    fats: 3.8,
    allergens: ['Fish'],
    ingredients: ['tilapia', 'salt', 'cooking oil', 'calamansi', 'garlic'],
    instructions: '1. Clean and score tilapia on both sides. 2. Season with salt and garlic. 3. Let marinate for 15 minutes. 4. Heat oil in pan over medium-high heat. 5. Fry tilapia for 5-7 minutes per side until golden. 6. Drain on paper towels. 7. Serve with calamansi and tomato.',
    source: 'PhilFCT'
  },
  {
    name: 'Beef Steak',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 161,
    protein: 9.6,
    carbs: 4.0,
    fats: 11.8,
    allergens: ['Soy'],
    ingredients: ['beef sirloin', 'soy sauce', 'calamansi', 'onion rings', 'garlic', 'butter', 'cooking oil'],
    instructions: '1. Marinate beef in soy sauce and calamansi for 30 minutes. 2. Heat oil in pan over high heat. 3. Pan fry beef for 3-4 minutes each side. 4. Remove beef and set aside. 5. In same pan, sauté garlic and onion rings. 6. Add remaining marinade and butter. Simmer. 7. Pour sauce over beef. 8. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Pork Nilaga',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 195,
    protein: 17.2,
    carbs: 11.4,
    fats: 9.2,
    allergens: [],
    ingredients: ['pork', 'potatoes', 'cabbage', 'pechay', 'onion', 'peppercorns'],
    instructions: '1. Boil pork with onion and peppercorns until tender. 2. Add potatoes and cook 10 minutes. 3. Add cabbage and pechay. 4. Season with fish sauce. 5. Serve hot with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Ginataang Manok',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 245,
    protein: 22.4,
    carbs: 6.8,
    fats: 14.6,
    allergens: [],
    ingredients: ['chicken', 'coconut milk', 'ginger', 'garlic', 'onion', 'green chili', 'spinach'],
    instructions: '1. Sauté ginger, garlic, and onion. 2. Add chicken and cook until brown. 3. Pour coconut milk and boil. 4. Add green chili. 5. Simmer 20 minutes. 6. Add spinach last. 7. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Beef Caldereta',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 284,
    protein: 18.4,
    carbs: 12.6,
    fats: 18.2,
    allergens: ['Dairy'],
    ingredients: ['beef', 'tomato sauce', 'liver spread', 'potatoes', 'carrots', 'bell pepper', 'cheese'],
    instructions: '1. Brown beef. 2. Add tomato sauce and liver spread. 3. Add water and simmer until tender. 4. Add potatoes and carrots. 5. Add bell pepper and cheese. 6. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Chicken Inasal',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 218,
    protein: 28.6,
    carbs: 4.2,
    fats: 9.8,
    allergens: [],
    ingredients: ['chicken', 'calamansi', 'vinegar', 'garlic', 'ginger', 'lemongrass', 'annatto'],
    instructions: '1. Marinate chicken in calamansi, vinegar, garlic, ginger and lemongrass for 2 hours. 2. Grill over medium heat basting with annatto oil. 3. Cook until golden and cooked through. 4. Serve with rice and vinegar dip.',
    source: 'PhilFCT'
  },
  {
    name: 'Paksiw na Bangus',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 168,
    protein: 20.4,
    carbs: 4.2,
    fats: 7.6,
    allergens: ['Fish'],
    ingredients: ['bangus', 'vinegar', 'garlic', 'ginger', 'eggplant', 'bitter melon', 'fish sauce'],
    instructions: '1. Arrange bangus in pan. 2. Add vinegar, garlic, ginger, and fish sauce. 3. Add eggplant and bitter melon. 4. Cover and simmer for 15 minutes. 5. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Tortang Talong',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 142,
    protein: 8.6,
    carbs: 8.4,
    fats: 8.2,
    allergens: ['Eggs'],
    ingredients: ['eggplant', 'eggs', 'ground pork', 'garlic', 'onion', 'salt', 'pepper', 'cooking oil'],
    instructions: '1. Grill eggplant until soft. Peel skin. 2. Sauté garlic, onion, and ground pork. 3. Flatten eggplant and dip in beaten egg. 4. Place pork filling on eggplant. 5. Pan fry until golden. 6. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Adobong Manok sa Gata',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 265,
    protein: 24.2,
    carbs: 4.8,
    fats: 16.4,
    allergens: ['Soy'],
    ingredients: ['chicken', 'coconut milk', 'soy sauce', 'vinegar', 'garlic', 'bay leaf', 'chili'],
    instructions: '1. Marinate chicken in soy sauce and vinegar. 2. Sauté garlic. 3. Add chicken and cook until brown. 4. Add marinade and bay leaf. Simmer 20 minutes. 5. Pour coconut milk. 6. Add chili. Simmer 10 more minutes. 7. Serve with rice.',
    source: 'PhilFCT'
  },
  {
    name: 'Grilled Chicken Breast',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 165,
    protein: 31.0,
    carbs: 0.0,
    fats: 3.6,
    allergens: [],
    ingredients: ['chicken breast', 'olive oil', 'garlic', 'lemon', 'herbs', 'salt', 'pepper'],
    instructions: '1. Pound chicken to even thickness. 2. Marinate with olive oil, garlic, lemon, and herbs for 30 minutes. 3. Preheat grill to medium-high. 4. Grill chicken 6-7 minutes per side. 5. Rest for 5 minutes before serving.',
    source: 'USDA'
  },
  {
    name: 'Steamed Fish with Vegetables',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 175,
    protein: 24.8,
    carbs: 8.4,
    fats: 4.8,
    allergens: ['Fish'],
    ingredients: ['white fish fillet', 'broccoli', 'carrots', 'ginger', 'spring onion', 'soy sauce'],
    instructions: '1. Season fish with ginger and salt. 2. Place on steaming rack. 3. Steam fish for 10-12 minutes. 4. Steam vegetables separately for 5 minutes. 5. Top fish with spring onion and ginger. 6. Drizzle with hot oil and soy sauce. 7. Serve with rice.',
    source: 'USDA'
  },
  {
    name: 'Vegetable Curry with Brown Rice',
    category: 'Vegetable',
    meal_type: 'Dinner',
    calories: 285,
    protein: 8.4,
    carbs: 48.6,
    fats: 8.2,
    allergens: [],
    ingredients: ['mixed vegetables', 'coconut milk', 'curry powder', 'brown rice', 'garlic', 'onion', 'ginger'],
    instructions: '1. Cook brown rice. 2. Sauté garlic, onion, and ginger. 3. Add curry powder and cook 1 minute. 4. Add vegetables and coconut milk. 5. Simmer 15 minutes. 6. Season with salt. 7. Serve over brown rice.',
    source: 'USDA'
  },
  {
    name: 'Chicken Breast with Broccoli',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 215,
    protein: 34.2,
    carbs: 8.6,
    fats: 5.4,
    allergens: [],
    ingredients: ['chicken breast', 'broccoli', 'garlic', 'olive oil', 'lemon', 'salt', 'pepper'],
    instructions: '1. Season chicken with salt, pepper, and garlic. 2. Heat oil in pan over medium-high heat. 3. Cook chicken 6-7 minutes per side. 4. Steam or blanch broccoli for 3-4 minutes. 5. Serve chicken with broccoli and lemon wedge.',
    source: 'USDA'
  },
  {
    name: 'Beef Stir Fry with Rice',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 342,
    protein: 26.8,
    carbs: 38.4,
    fats: 8.6,
    allergens: ['Soy'],
    ingredients: ['beef strips', 'mixed vegetables', 'soy sauce', 'garlic', 'ginger', 'sesame oil', 'rice'],
    instructions: '1. Cook rice and set aside. 2. Marinate beef in soy sauce and ginger. 3. Heat oil in wok over high heat. 4. Stir fry beef until browned. 5. Add vegetables and stir fry 3 minutes. 6. Add soy sauce and sesame oil. 7. Serve over rice.',
    source: 'USDA'
  },
  {
    name: 'Tuna Salad with Sweet Potato',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 285,
    protein: 28.4,
    carbs: 26.8,
    fats: 6.2,
    allergens: ['Fish'],
    ingredients: ['canned tuna', 'sweet potato', 'lettuce', 'tomato', 'cucumber', 'olive oil dressing'],
    instructions: '1. Bake sweet potato at 200°C for 40 minutes. 2. Drain and flake tuna. 3. Mix tuna with chopped vegetables. 4. Dress with olive oil, lemon, and salt. 5. Serve tuna salad alongside baked sweet potato.',
    source: 'USDA'
  },
  {
    name: 'Tofu with Mixed Vegetables',
    category: 'Vegetable',
    meal_type: 'Dinner',
    calories: 168,
    protein: 12.4,
    carbs: 14.8,
    fats: 6.8,
    allergens: ['Soy'],
    ingredients: ['firm tofu', 'mixed vegetables', 'garlic', 'ginger', 'soy sauce', 'sesame oil'],
    instructions: '1. Press tofu to remove excess water. Cut into cubes. 2. Pan fry tofu until golden on all sides. 3. Sauté garlic and ginger. 4. Add vegetables and stir fry for 3 minutes. 5. Add tofu back and season with soy sauce. 6. Drizzle sesame oil before serving.',
    source: 'USDA'
  },
  {
    name: 'Grilled Salmon',
    category: 'Protein',
    meal_type: 'Dinner',
    calories: 208,
    protein: 28.4,
    carbs: 0.0,
    fats: 10.2,
    allergens: ['Fish'],
    ingredients: ['salmon fillet', 'lemon', 'garlic', 'olive oil', 'dill', 'salt', 'pepper'],
    instructions: '1. Season salmon with lemon, garlic, dill, salt, and pepper. 2. Brush with olive oil. 3. Preheat grill to medium-high. 4. Grill salmon skin-side down for 4-5 minutes. 5. Flip and grill for 3-4 more minutes. 6. Serve with lemon wedge and steamed vegetables.',
    source: 'USDA'
  },
  {
    name: 'Steamed Vegetables with Brown Rice',
    category: 'Vegetable',
    meal_type: 'Dinner',
    calories: 225,
    protein: 6.8,
    carbs: 44.2,
    fats: 2.4,
    allergens: [],
    ingredients: ['broccoli', 'carrots', 'snap peas', 'brown rice', 'olive oil', 'garlic', 'salt'],
    instructions: '1. Cook brown rice. 2. Steam broccoli, carrots, and snap peas for 5-7 minutes. 3. Toss vegetables with olive oil and garlic. 4. Season with salt. 5. Serve over brown rice.',
    source: 'USDA'
  },
];

const seedAllMeals = async () => {
  try {
    console.log('🌱 Seeding all meals (PhilFCT + USDA)...\n');

    let successCount = 0;

    for (const meal of meals) {
      await pool.query(`
        INSERT INTO meals (
          name, category, meal_type, calories,
          protein, carbs, fats, allergens,
          ingredients, instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [
        meal.name,
        meal.category,
        meal.meal_type,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fats,
        meal.allergens,
        meal.ingredients,
        meal.instructions,
      ]);
      console.log(`✅ [${meal.source}] ${meal.name} — ${meal.calories} kcal (${meal.meal_type})`);
      successCount++;
    }

    const total = await pool.query(`SELECT COUNT(*) FROM meals`);
    const breakfast = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Breakfast'`);
    const lunch = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Lunch'`);
    const dinner = await pool.query(`SELECT COUNT(*) FROM meals WHERE meal_type = 'Dinner'`);
    const philfct = await pool.query(`SELECT COUNT(*) FROM meals`);

    console.log(`\n🎉 All meals seeded successfully!`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Total meals: ${total.rows[0].count}`);
    console.log(`🌅 Breakfast: ${breakfast.rows[0].count}`);
    console.log(`☀️  Lunch: ${lunch.rows[0].count}`);
    console.log(`🌙 Dinner: ${dinner.rows[0].count}`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seedAllMeals();