const pool = require('../config/database');
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// ============================================
// SHARED DATE HELPERS
// ============================================

// Gamitin ang Philippine Time (UTC+8) bilang reference, hindi ang server's default timezone
const getPhilippineNow = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const day = parseInt(parts.find(p => p.type === 'day').value, 10);
  return new Date(year, month - 1, day);
};

// Helper: format Date object as YYYY-MM-DD using LOCAL date parts (hindi UTC/toISOString)
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Kinukuha ang Monday ng kasalukuyang linggo (base sa Philippine Time)
const getCurrentWeekMonday = () => {
  const today = getPhilippineNow();
  const dayOfWeek = today.getDay();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return { today, monday };
};

// ============================================
// GRADUAL CALORIE ADJUSTMENT (adaptive feedback loop)
// Sinusuri ang totoong weight change noong nakaraang linggo laban sa inaasahang
// rate base sa dietary goal, tapos kaunting (±100 kcal) inaayos ang calorie
// target papunta sa tamang direksyon. Isang beses lang ito tumatakbo bawat
// linggo, sa simula ng bagong linggo (bago mag-regenerate ng bagong plan).
// ============================================
const EXPECTED_WEEKLY_CHANGE = {
  Cutting: -0.4,      // kg/week — malusog na rate ng pagbaba ng timbang
  Bulking: 0.25,       // kg/week — malusog na rate ng pagtaas ng timbang
  Maintenance: 0,      // dapat halos stable
};
const ADJUSTMENT_TOLERANCE = 0.15; // kg — sa loob nito, itinuturing na "on track"
const ADJUSTMENT_STEP = 100;       // kcal — dagdag/bawas bawat linggo
const MAX_ADJUSTMENT = 300;        // kcal — pinaka-malaking maaabot na kabuuang adjustment

const applyGradualCalorieAdjustment = async (userId) => {
  try {
    const userResult = await pool.query(
      'SELECT dietary_goal, calorie_adjustment FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) return;
    const { dietary_goal, calorie_adjustment } = userResult.rows[0];
    const currentAdjustment = calorie_adjustment || 0;

    // Kunin ang weight entries ng nakaraang 7 araw
    const progressResult = await pool.query(
      `SELECT date, weight FROM progress
       WHERE user_id = $1 AND weight IS NOT NULL AND date >= current_date() - 7
       ORDER BY date ASC`,
      [userId]
    );
    const weightRows = progressResult.rows;

    // Kulang ang datos para gumawa ng makatuwirang desisyon — huwag muna mag-adjust
    if (weightRows.length < 2) return;

    const startWeight = parseFloat(weightRows[0].weight);
    const endWeight = parseFloat(weightRows[weightRows.length - 1].weight);
    const actualChange = endWeight - startWeight;
    const expectedChange = EXPECTED_WEEKLY_CHANGE[dietary_goal] ?? 0;

    let delta = 0;

    if (dietary_goal === 'Cutting') {
      if (actualChange > expectedChange + ADJUSTMENT_TOLERANCE) {
        delta = -ADJUSTMENT_STEP; // masyadong mabagal bumaba — dagdagan ang deficit
      } else if (actualChange < expectedChange - ADJUSTMENT_TOLERANCE) {
        delta = ADJUSTMENT_STEP; // masyadong mabilis bumaba — bawasan ang deficit, ligtas
      }
    } else if (dietary_goal === 'Bulking') {
      if (actualChange < expectedChange - ADJUSTMENT_TOLERANCE) {
        delta = ADJUSTMENT_STEP; // masyadong mabagal tumaas — dagdagan ang surplus
      } else if (actualChange > expectedChange + ADJUSTMENT_TOLERANCE) {
        delta = -ADJUSTMENT_STEP; // masyadong mabilis tumaas — bawasan ang surplus
      }
    } else {
      // Maintenance — dapat stable, kaunting drift lang
      if (actualChange > ADJUSTMENT_TOLERANCE) {
        delta = -ADJUSTMENT_STEP; // tumataas ang timbang — kaunting bawasan
      } else if (actualChange < -ADJUSTMENT_TOLERANCE) {
        delta = ADJUSTMENT_STEP; // bumababa ang timbang — kaunting dagdagan
      }
    }

    if (delta === 0) return; // on track na, walang kailangang baguhin

    const newAdjustment = Math.max(
      -MAX_ADJUSTMENT,
      Math.min(MAX_ADJUSTMENT, currentAdjustment + delta)
    );

    await pool.query(
      'UPDATE users SET calorie_adjustment = $1 WHERE id = $2',
      [newAdjustment, userId]
    );

    console.log(`Gradual adjustment for user ${userId}: ${currentAdjustment} -> ${newAdjustment} kcal (weekly change: ${actualChange.toFixed(2)}kg, expected: ${expectedChange}kg)`);
  } catch (err) {
    console.error('Gradual calorie adjustment error:', err.message);
    // Hindi natin ito ituturing na fatal error — kung mag-fail ito, mag-proproceed pa rin ang regeneration
    // gamit ang dating adjustment value
  }
};

// ============================================
// SHARED: Generate + Save Meal Plan
// ============================================
const generateAndSaveMealPlan = async (userId, mode) => {
  const userResult = await pool.query(
    `SELECT birthday, sex, height, weight, dietary_goal, activity_level, allergens, calorie_adjustment
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = userResult.rows[0];
  const { today, monday } = getCurrentWeekMonday();

  const birthDate = new Date(user.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const mlResponse = await axios.post(`${ML_API_URL}/recommend`, {
    weight: parseFloat(user.weight),
    height: parseFloat(user.height),
    age,
    sex: user.sex,
    activity_level: user.activity_level,
    dietary_goal: user.dietary_goal,
    allergens: user.allergens || [],
    mode: mode || 'weekly',
    calorie_adjustment: user.calorie_adjustment || 0,
  });

  const { meal_plan, tdee, target_calories, macro_targets } = mlResponse.data.data;
  const weekStart = formatLocalDate(monday);

  await pool.query(
    'DELETE FROM meal_plans WHERE user_id = $1 AND mode = $2',
    [userId, mode || 'weekly']
  );

  for (const day of meal_plan) {
    if (day.is_rest) continue;

    const mealSlots = [
      { type: 'Breakfast', meal: day.breakfast },
      { type: 'Lunch', meal: day.lunch },
      { type: 'Dinner', meal: day.dinner },
    ];

    for (const slot of mealSlots) {
      if (!slot.meal) continue;

      const planDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + (day.day_number - 1));

      await pool.query(
        `INSERT INTO meal_plans (
          user_id, meal_id, day, meal_type, week_start, mode, plan_date, taken
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
        [userId, slot.meal.id, day.day, slot.type, weekStart, mode || 'weekly', formatLocalDate(planDate)]
      );
    }
  }

  return { meal_plan, tdee, target_calories, macro_targets, mode: mode || 'weekly' };
};

// ============================================
// SHARED: apply the 3-tier allergen filter (main = exclude, sub = substitute or exclude)
// to a list of meals for a given set of user allergens. Used by the mobile app's
// meal search/replace screen, so allergen-containing meals never even appear as options.
// ============================================
const applyAllergenFilterToMeals = async (meals, userAllergens) => {
  if (!userAllergens || userAllergens.length === 0) return meals;

  const substitutesResult = await pool.query('SELECT ingredient_name, allergen, substitute_name FROM allergen_substitutes');
  const substituteLookup = {};
  substitutesResult.rows.forEach((row) => {
    substituteLookup[`${row.ingredient_name.toLowerCase()}|${row.allergen}`] = row.substitute_name;
  });

  const safeMeals = [];

  for (const meal of meals) {
    const mainIngredients = meal.main_ingredients || [];
    const subIngredients = meal.sub_ingredients || [];

    // Tier 1: main ingredient allergen -> automatic exclusion, no substitute
    const mainHasAllergen = mainIngredients.some((ing) =>
      (ing.allergens || []).some((a) => userAllergens.includes(a))
    );
    if (mainHasAllergen) continue;

    // Tier 2 & 3: sub ingredient allergen -> try substitute, else exclude
    let mealIsSafe = true;
    const substitutionsMade = [];

    for (const ing of subIngredients) {
      const triggered = (ing.allergens || []).filter((a) => userAllergens.includes(a));
      if (triggered.length === 0) continue;

      let substituteName = ing.substitute_override;
      if (!substituteName) {
        for (const allergen of triggered) {
          substituteName = substituteLookup[`${ing.name.toLowerCase()}|${allergen}`];
          if (substituteName) break;
        }
      }

      if (substituteName) {
        substitutionsMade.push({ original: ing.name, substitute: substituteName, allergen: triggered[0] });
      } else {
        mealIsSafe = false;
        break;
      }
    }

    if (!mealIsSafe) continue;

    safeMeals.push({ ...meal, allergen_substitutions: substitutionsMade });
  }

  return safeMeals;
};

// ============================================
// GET ALL MEALS (for admin / meal database browsing, AND mobile app meal search)
// If the request is authenticated (has req.userId), allergen-containing meals are
// automatically filtered out per the 3-tier logic — they never appear in search
// results at all, matching the "no longer visible for recommendation" requirement.
// ============================================
const getAllMeals = async (req, res) => {
  try {
    const { meal_type, category, search } = req.query;

    let query = 'SELECT * FROM meals WHERE is_active = true';
    const params = [];
    let paramIndex = 1;

    if (meal_type) {
      query += ` AND meal_type = $${paramIndex}`;
      params.push(meal_type);
      paramIndex++;
    }
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    let meals = result.rows;

    // If this request came from a logged-in mobile user, filter by their allergens
    if (req.userId) {
      const userResult = await pool.query('SELECT allergens FROM users WHERE id = $1', [req.userId]);
      const userAllergens = userResult.rows[0]?.allergens || [];
      meals = await applyAllergenFilterToMeals(meals, userAllergens);
    }

    res.json({ success: true, meals });

  } catch (err) {
    console.error('Get all meals error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET SINGLE MEAL
// ============================================
const getMealById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM meals WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal not found.' });
    }

    res.json({ success: true, meal: result.rows[0] });
  } catch (err) {
    console.error('Get meal by id error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// CREATE MEAL (Admin)
// ============================================
const createMeal = async (req, res) => {
  try {
    const {
      name, category, meal_type, calories, protein, carbs, fats,
      allergens, ingredients, instructions, image_url,
      main_ingredients, sub_ingredients
    } = req.body;

    if (!name || !meal_type || !calories) {
      return res.status(400).json({ error: 'Name, meal type, and calories are required.' });
    }

    const result = await pool.query(
      `INSERT INTO meals (
        name, category, meal_type, calories, protein, carbs, fats,
        allergens, ingredients, instructions, image_url,
        main_ingredients, sub_ingredients
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name, category || null, meal_type, calories,
        protein || 0, carbs || 0, fats || 0,
        allergens || [], ingredients || [], instructions || '', image_url || null,
        JSON.stringify(main_ingredients || []), JSON.stringify(sub_ingredients || [])
      ]
    );

    res.status(201).json({ success: true, message: 'Meal created successfully.', meal: result.rows[0] });

  } catch (err) {
    console.error('Create meal error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// UPDATE MEAL (Admin)
// ============================================
const updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, meal_type, calories, protein, carbs, fats,
      allergens, ingredients, instructions, image_url, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE meals SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        meal_type = COALESCE($3, meal_type),
        calories = COALESCE($4, calories),
        protein = COALESCE($5, protein),
        carbs = COALESCE($6, carbs),
        fats = COALESCE($7, fats),
        allergens = COALESCE($8, allergens),
        ingredients = COALESCE($9, ingredients),
        instructions = COALESCE($10, instructions),
        image_url = COALESCE($11, image_url),
        is_active = COALESCE($12, is_active),
        updated_at = now()
      WHERE id = $13
      RETURNING *`,
      [name, category, meal_type, calories, protein, carbs, fats,
       allergens, ingredients, instructions, image_url, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal not found.' });
    }

    res.json({ success: true, message: 'Meal updated successfully.', meal: result.rows[0] });

  } catch (err) {
    console.error('Update meal error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// DELETE MEAL (Admin)
// ============================================
const deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM meals WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal not found.' });
    }

    res.json({ success: true, message: 'Meal deleted successfully.' });

  } catch (err) {
    console.error('Delete meal error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GENERATE MEAL PLAN (endpoint)
// ============================================
const generateMealPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { mode } = req.body;

    const data = await generateAndSaveMealPlan(userId, mode || 'weekly');

    res.json({
      success: true,
      message: 'Meal plan generated successfully!',
      data,
    });

  } catch (err) {
    console.error('Generate meal plan error:', err.message);
    console.error('ML API response data:', err.response?.data);
    console.error('ML API status:', err.response?.status);
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI recommendation service is unavailable. Please try again later.' });
    }
    res.status(500).json({ error: 'Server error while generating meal plan.' });
  }
};

// ============================================
// GET USER'S CURRENT MEAL PLAN
// ============================================
const getMyMealPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const mode = req.query.mode || 'weekly';

    const { today, monday } = getCurrentWeekMonday();
    const currentWeekStart = formatLocalDate(monday);
    const todayStr = formatLocalDate(today);

    const existingCheck = await pool.query(
      `SELECT week_start, MAX(plan_date) as max_plan_date
       FROM meal_plans WHERE user_id = $1 AND mode = $2
       GROUP BY week_start`,
      [userId, mode]
    );

    let needsRegeneration = false;

    if (existingCheck.rows.length === 0) {
      needsRegeneration = true;
    } else if (mode === 'weekly') {
      const existingWeekStart = formatLocalDate(new Date(existingCheck.rows[0].week_start));
      if (existingWeekStart !== currentWeekStart) {
        needsRegeneration = true;
      }
    } else {
      const maxPlanDate = existingCheck.rows[0].max_plan_date;
      if (!maxPlanDate || formatLocalDate(new Date(maxPlanDate)) < todayStr) {
        needsRegeneration = true;
      }
    }

    if (needsRegeneration) {
      try {
        // Sa simula ng bagong linggo lang natin susuriin at ia-adjust ang
        // calorie target — tumutugma ito sa "End of Week?" na desisyon sa flowchart
        if (mode === 'weekly') {
          await applyGradualCalorieAdjustment(userId);
        }
        await generateAndSaveMealPlan(userId, mode);
      } catch (genErr) {
        console.error('Auto-regeneration error:', genErr.message);
        console.error('Auto-regeneration ML API response:', genErr.response?.data);
      }
    }

    const result = await pool.query(
      `SELECT mp.id, mp.day, mp.meal_type, mp.plan_date, mp.taken, mp.skipped, mp.mode,
              m.id as meal_id, m.name, m.category, m.calories, m.protein, m.carbs, m.fats,
              m.allergens, m.ingredients, m.instructions
       FROM meal_plans mp
       JOIN meals m ON mp.meal_id = m.id
       WHERE mp.user_id = $1 AND mp.mode = $2
       ORDER BY mp.plan_date ASC,
         CASE mp.meal_type WHEN 'Breakfast' THEN 1 WHEN 'Lunch' THEN 2 WHEN 'Dinner' THEN 3 END`,
      [userId, mode]
    );

    const grouped = {};
    result.rows.forEach(row => {
      const key = formatLocalDate(row.plan_date);
      if (!grouped[key]) {
        grouped[key] = { date: key, day: row.day, meals: [] };
      }
      grouped[key].meals.push({
        plan_id: row.id,
        meal_type: row.meal_type,
        taken: row.taken,
        skipped: row.skipped,
        meal: {
          id: row.meal_id,
          name: row.name,
          category: row.category,
          calories: row.calories,
          protein: row.protein,
          carbs: row.carbs,
          fats: row.fats,
          allergens: row.allergens,
          ingredients: row.ingredients,
          instructions: row.instructions,
        }
      });
    });

    res.json({ success: true, mealPlan: Object.values(grouped) });

  } catch (err) {
    console.error('Get my meal plan error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// TOGGLE MEAL TAKEN / SKIP
// ============================================
const toggleMealStatus = async (req, res) => {
  try {
    const { planId } = req.params;
    const { taken } = req.body;

    const result = await pool.query(
      `UPDATE meal_plans SET taken = $1, skipped = $2 WHERE id = $3
       RETURNING *`,
      [taken, !taken, planId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan entry not found.' });
    }

    res.json({ success: true, message: 'Meal status updated.', mealPlan: result.rows[0] });

  } catch (err) {
    console.error('Toggle meal status error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// REPLACE A MEAL IN THE PLAN (edit meal / swap)
// ============================================
const replaceMealInPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { new_meal_id } = req.body;

    if (!new_meal_id) {
      return res.status(400).json({ error: 'new_meal_id is required.' });
    }

    const result = await pool.query(
      `UPDATE meal_plans SET meal_id = $1, taken = false, skipped = false WHERE id = $2 RETURNING *`,
      [new_meal_id, planId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan entry not found.' });
    }

    res.json({ success: true, message: 'Meal replaced successfully.', mealPlan: result.rows[0] });

  } catch (err) {
    console.error('Replace meal error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// LOG MANUAL FOOD (kumain sa labas)
// ============================================
const logFood = async (req, res) => {
  try {
    const userId = req.userId;
    const { food_name, calories, protein, carbs, fats, weight_grams } = req.body;

    if (!food_name || !calories) {
      return res.status(400).json({ error: 'Food name and calories are required.' });
    }

    const result = await pool.query(
      `INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fats, weight_grams)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, food_name, calories, protein || 0, carbs || 0, fats || 0, weight_grams || null]
    );

    res.status(201).json({ success: true, message: 'Food logged successfully.', foodLog: result.rows[0] });

  } catch (err) {
    console.error('Log food error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET FOOD LOGS (for a specific date, for progress tracking)
// ============================================
const getFoodLogs = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.query;

    let query = 'SELECT * FROM food_logs WHERE user_id = $1';
    const params = [userId];

    if (date) {
      query += ` AND DATE(logged_at) = $2`;
      params.push(date);
    }

    query += ' ORDER BY logged_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, foodLogs: result.rows });

  } catch (err) {
    console.error('Get food logs error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET ALL FOOD LOGS (Admin - monitor outside/manual food logging)
// ============================================
const getAllFoodLogs = async (req, res) => {
  try {
    const { limit } = req.query;
    const rowLimit = limit ? parseInt(limit, 10) : 50;

    const result = await pool.query(
      `SELECT fl.id, fl.food_name, fl.calories, fl.protein, fl.carbs, fl.fats,
              fl.weight_grams, fl.logged_at, u.name as user_name, u.username
       FROM food_logs fl
       JOIN users u ON fl.user_id = u.id
       ORDER BY fl.logged_at DESC
       LIMIT $1`,
      [rowLimit]
    );

    res.json({ success: true, foodLogs: result.rows });

  } catch (err) {
    console.error('Get all food logs error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getAllMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  generateMealPlan,
  getMyMealPlan,
  toggleMealStatus,
  replaceMealInPlan,
  logFood,
  getFoodLogs,
  getAllFoodLogs,
};