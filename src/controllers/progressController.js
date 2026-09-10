const pool = require('../config/database');

// ============================================
// LOG DAILY PROGRESS (weight, calories, workout status)
// ============================================
const logProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      date, weight, calories_consumed, calories_target,
      protein_consumed, carbs_consumed, fats_consumed,
      workout_completed, meals_taken, total_meals
    } = req.body;

    const logDate = date || new Date().toISOString().split('T')[0];

    // Check if entry for this date already exists
    const existing = await pool.query(
      'SELECT id FROM progress WHERE user_id = $1 AND date = $2',
      [userId, logDate]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing entry
      result = await pool.query(
        `UPDATE progress SET
          weight = COALESCE($1, weight),
          calories_consumed = COALESCE($2, calories_consumed),
          calories_target = COALESCE($3, calories_target),
          protein_consumed = COALESCE($4, protein_consumed),
          carbs_consumed = COALESCE($5, carbs_consumed),
          fats_consumed = COALESCE($6, fats_consumed),
          workout_completed = COALESCE($7, workout_completed),
          meals_taken = COALESCE($8, meals_taken),
          total_meals = COALESCE($9, total_meals)
        WHERE user_id = $10 AND date = $11
        RETURNING *`,
        [weight, calories_consumed, calories_target, protein_consumed,
         carbs_consumed, fats_consumed, workout_completed, meals_taken,
         total_meals, userId, logDate]
      );
    } else {
      // Insert new entry
      result = await pool.query(
        `INSERT INTO progress (
          user_id, date, weight, calories_consumed, calories_target,
          protein_consumed, carbs_consumed, fats_consumed,
          workout_completed, meals_taken, total_meals
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [userId, logDate, weight || null, calories_consumed || 0, calories_target || 0,
         protein_consumed || 0, carbs_consumed || 0, fats_consumed || 0,
         workout_completed || false, meals_taken || 0, total_meals || 3]
      );
    }

    // If weight was logged, update user's current weight too
    if (weight) {
      await pool.query('UPDATE users SET weight = $1 WHERE id = $2', [weight, userId]);
    }

    res.json({ success: true, message: 'Progress logged successfully.', progress: result.rows[0] });

  } catch (err) {
    console.error('Log progress error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// SYNC TODAY'S PROGRESS
// Called from the "Update Progress" button on the Progress screen.
// Takes the user's current weight as input, updates their profile weight,
// AND automatically computes today's real calories/workout/meal data from
// the meal_plans, food_logs, and workout_plans tables (no need for the user
// to manually re-enter numbers that are already tracked elsewhere in the app).
// ============================================
const syncTodayProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const { weight } = req.body;

    if (!weight || isNaN(parseFloat(weight))) {
      return res.status(400).json({ error: 'Please enter a valid weight.' });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD, Philippine time

    // Update the user's profile weight (and recalc BMI/TDEE if we have their other stats)
    const userResult = await pool.query(
      'SELECT height, birthday, sex, activity_level, tdee FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    let newBmi = null;
    if (user && user.height) {
      const heightInMeters = user.height / 100;
      newBmi = parseFloat((parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1));
    }

    await pool.query(
      'UPDATE users SET weight = $1, bmi = COALESCE($2, bmi) WHERE id = $3',
      [weight, newBmi, userId]
    );

    // Get today's meal plan entries (taken vs total, and sum of calories/macros actually eaten)
    const mealResult = await pool.query(
      `SELECT mp.taken, m.calories, m.protein, m.carbs, m.fats
       FROM meal_plans mp
       JOIN meals m ON mp.meal_id = m.id
       WHERE mp.user_id = $1 AND mp.plan_date = $2`,
      [userId, today]
    );
    const mealRows = mealResult.rows;
    const totalMeals = mealRows.length || 3;
    const mealsTaken = mealRows.filter(m => m.taken).length;
    const mealsCaloriesConsumed = mealRows
      .filter(m => m.taken)
      .reduce((sum, m) => sum + parseFloat(m.calories || 0), 0);
    const mealsProteinConsumed = mealRows
      .filter(m => m.taken)
      .reduce((sum, m) => sum + parseFloat(m.protein || 0), 0);
    const mealsCarbsConsumed = mealRows
      .filter(m => m.taken)
      .reduce((sum, m) => sum + parseFloat(m.carbs || 0), 0);
    const mealsFatsConsumed = mealRows
      .filter(m => m.taken)
      .reduce((sum, m) => sum + parseFloat(m.fats || 0), 0);

    // Get today's manually logged outside food (extra calories not from the meal plan)
    const foodLogResult = await pool.query(
      `SELECT calories, protein, carbs, fats FROM food_logs
       WHERE user_id = $1 AND DATE(logged_at) = $2`,
      [userId, today]
    );
    const foodLogRows = foodLogResult.rows;
    const foodLogCalories = foodLogRows.reduce((sum, f) => sum + parseFloat(f.calories || 0), 0);
    const foodLogProtein = foodLogRows.reduce((sum, f) => sum + parseFloat(f.protein || 0), 0);
    const foodLogCarbs = foodLogRows.reduce((sum, f) => sum + parseFloat(f.carbs || 0), 0);
    const foodLogFats = foodLogRows.reduce((sum, f) => sum + parseFloat(f.fats || 0), 0);

    // Get today's workout completion (any exercise marked done today counts as workout_completed)
    const workoutResult = await pool.query(
      `SELECT wp.done, e.name
       FROM workout_plans wp
       JOIN exercises e ON wp.exercise_id = e.id
       WHERE wp.user_id = $1
         AND wp.day = TO_CHAR($2::date, 'FMDay')`,
      [userId, today]
    );
    const workoutRows = workoutResult.rows;
    const workoutCompleted = workoutRows.length > 0 && workoutRows.every(w => w.done);

    const caloriesConsumed = mealsCaloriesConsumed + foodLogCalories;
    const proteinConsumed = mealsProteinConsumed + foodLogProtein;
    const carbsConsumed = mealsCarbsConsumed + foodLogCarbs;
    const fatsConsumed = mealsFatsConsumed + foodLogFats;
    const caloriesTarget = parseFloat(user?.tdee || 2000);

    // Save (insert or update) today's progress row with all the computed data
    const existing = await pool.query(
      'SELECT id FROM progress WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    let progressRow;
    if (existing.rows.length > 0) {
      const updateResult = await pool.query(
        `UPDATE progress SET
          weight = $1, calories_consumed = $2, calories_target = $3,
          protein_consumed = $4, carbs_consumed = $5, fats_consumed = $6,
          workout_completed = $7, meals_taken = $8, total_meals = $9
        WHERE user_id = $10 AND date = $11
        RETURNING *`,
        [weight, caloriesConsumed, caloriesTarget, proteinConsumed, carbsConsumed,
         fatsConsumed, workoutCompleted, mealsTaken, totalMeals, userId, today]
      );
      progressRow = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO progress (
          user_id, date, weight, calories_consumed, calories_target,
          protein_consumed, carbs_consumed, fats_consumed,
          workout_completed, meals_taken, total_meals
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [userId, today, weight, caloriesConsumed, caloriesTarget, proteinConsumed,
         carbsConsumed, fatsConsumed, workoutCompleted, mealsTaken, totalMeals]
      );
      progressRow = insertResult.rows[0];
    }

    res.json({
      success: true,
      message: 'Progress updated successfully!',
      progress: progressRow,
    });

  } catch (err) {
    console.error('Sync today progress error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET WEIGHT HISTORY (for the weight graph in Profile)
// ============================================
const getWeightHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { range } = req.query; // '1W', '1M', '3M', '6M'

    let daysBack = 30;
    if (range === '1W') daysBack = 7;
    else if (range === '1M') daysBack = 30;
    else if (range === '3M') daysBack = 90;
    else if (range === '6M') daysBack = 180;

    const result = await pool.query(
      `SELECT date, weight FROM progress
       WHERE user_id = $1 AND weight IS NOT NULL
       AND date >= current_date() - $2::int
       ORDER BY date ASC`,
      [userId, daysBack]
    );

    res.json({ success: true, weightHistory: result.rows });

  } catch (err) {
    console.error('Get weight history error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET WEEKLY SUMMARY (for Progress screen)
// ============================================
const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.userId;

    // Get last 7 days of progress
    const result = await pool.query(
      `SELECT date, weight, calories_consumed, calories_target,
              protein_consumed, carbs_consumed, fats_consumed,
              workout_completed, meals_taken, total_meals
       FROM progress
       WHERE user_id = $1 AND date >= current_date() - 6
       ORDER BY date ASC`,
      [userId]
    );

    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({
        success: true,
        summary: {
          dailyCalories: [],
          bodyProgress: { start: 0, current: 0, change: 0 },
          calorieAdherence: { target: 0, actual: 0, percentage: 0 },
          macros: { protein: 0, carbs: 0, fats: 0 },
          workoutCompletion: 0,
          mealConsistency: 0,
        }
      });
    }

    // Daily calories for chart
    const dailyCalories = rows.map(r => ({
      day: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }),
      target: parseFloat(r.calories_target || 0),
      actual: parseFloat(r.calories_consumed || 0),
    }));

    // Body progress (weight change)
    const weightsOnly = rows.filter(r => r.weight !== null);
    const startWeight = weightsOnly.length > 0 ? parseFloat(weightsOnly[0].weight) : 0;
    const currentWeight = weightsOnly.length > 0 ? parseFloat(weightsOnly[weightsOnly.length - 1].weight) : 0;

    // Calorie adherence averages (parse to number first to avoid string concatenation)
    const avgTarget = Math.round(
      rows.reduce((s, r) => s + parseFloat(r.calories_target || 0), 0) / rows.length
    );
    const avgActual = Math.round(
      rows.reduce((s, r) => s + parseFloat(r.calories_consumed || 0), 0) / rows.length
    );
    const adherencePercentage = avgTarget > 0 ? Math.round((avgActual / avgTarget) * 100) : 0;

    // Macros averages (as percentages of total calories, roughly)
    const totalProtein = rows.reduce((s, r) => s + parseFloat(r.protein_consumed || 0), 0);
    const totalCarbs = rows.reduce((s, r) => s + parseFloat(r.carbs_consumed || 0), 0);
    const totalFats = rows.reduce((s, r) => s + parseFloat(r.fats_consumed || 0), 0);
    const proteinCals = totalProtein * 4;
    const carbsCals = totalCarbs * 4;
    const fatsCals = totalFats * 9;
    const totalMacroCals = proteinCals + carbsCals + fatsCals || 1;

    const macros = {
      protein: Math.round((proteinCals / totalMacroCals) * 100),
      carbs: Math.round((carbsCals / totalMacroCals) * 100),
      fats: Math.round((fatsCals / totalMacroCals) * 100),
    };

    // Consistency
    const workoutCompletion = Math.round(
      (rows.filter(r => r.workout_completed).length / rows.length) * 100
    );
    const mealConsistency = Math.round(
      (rows.reduce((s, r) => s + (parseFloat(r.meals_taken || 0) / (parseFloat(r.total_meals) || 3)), 0) / rows.length) * 100
    );

    res.json({
      success: true,
      summary: {
        dailyCalories,
        bodyProgress: {
          start: startWeight,
          current: currentWeight,
          change: parseFloat((currentWeight - startWeight).toFixed(1)),
        },
        calorieAdherence: {
          target: avgTarget,
          actual: avgActual,
          percentage: adherencePercentage,
        },
        macros,
        workoutCompletion,
        mealConsistency,
      }
    });

  } catch (err) {
    console.error('Get weekly summary error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET PROGRESS FOR SPECIFIC DATE
// ============================================
const getProgressByDate = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.params;

    const result = await pool.query(
      'SELECT * FROM progress WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, progress: null });
    }

    res.json({ success: true, progress: result.rows[0] });

  } catch (err) {
    console.error('Get progress by date error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  logProgress,
  syncTodayProgress,
  getWeightHistory,
  getWeeklySummary,
  getProgressByDate,
};