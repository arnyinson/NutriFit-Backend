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
// SHARED: Generate + Save Meal Plan
// ============================================
const generateAndSaveMealPlan = async (userId, mode) => {
  const userResult = await pool.query(
    `SELECT birthday, sex, height, weight, dietary_goal, activity_level, allergens
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
// GET ALL MEALS (for admin / meal database browsing)
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
    res.json({ success: true, meals: result.rows });

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
      allergens, ingredients, instructions, image_url
    } = req.body;

    if (!name || !meal_type || !calories) {
      return res.status(400).json({ error: 'Name, meal type, and calories are required.' });
    }

    const result = await pool.query(
      `INSERT INTO meals (
        name, category, meal_type, calories, protein, carbs, fats,
        allergens, ingredients, instructions, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name, category || null, meal_type, calories,
        protein || 0, carbs || 0, fats || 0,
        allergens || [], ingredients || [], instructions || '', image_url || null
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
};