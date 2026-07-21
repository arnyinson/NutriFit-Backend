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
  getWeightHistory,
  getWeeklySummary,
  getProgressByDate,
};