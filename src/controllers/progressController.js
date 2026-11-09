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
    const { weight, mode } = req.body;
    const planMode = mode === 'continuous' ? 'continuous' : 'weekly'; // default sa 'weekly' kung wala

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
    // Kailangang i-filter din base sa planMode — kung minsan may existing na entries
    // ang user sa PAREHONG "weekly" AT "continuous" mode para sa parehong petsa
    // (dahil nag-switch sila ng mode dati), kaya kailangang piliin lang ang mode
    // na TALAGANG ginagamit nila ngayon, hindi lahat
    const mealResult = await pool.query(
      `SELECT mp.taken, m.calories, m.protein, m.carbs, m.fats
       FROM meal_plans mp
       JOIN meals m ON mp.meal_id = m.id
       WHERE mp.user_id = $1 AND mp.plan_date = $2 AND mp.mode = $3`,
      [userId, today, planMode]
    );
    const mealRows = mealResult.rows;
    // Huwag mag-default sa 3 kapag walang meal plan entries — 0 talaga kung walang naka-schedule,
    // para hindi ito "dumagdag" bilang phantom 0% day sa consistency average
    const totalMeals = mealRows.length;
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

    // Get today's workout completion — kinukuha na rin ang totoong bilang ng
    // exercises (hindi lang boolean), para malaman ng getWeeklySummary kung
    // Rest Day ba ito (total_exercises = 0) at hindi ito bilangin bilang "hindi completed"
    // Only THIS week's plan: old weeks are kept as history, and without the
    // week_start filter their same-named day (e.g. every past Monday) was counted too.
    const workoutResult = await pool.query(
      `SELECT wp.done, e.name
       FROM workout_plans wp
       JOIN exercises e ON wp.exercise_id = e.id
       WHERE wp.user_id = $1
         AND wp.day = TO_CHAR($2::date, 'FMDay')
         AND wp.week_start = $3::date`,
      [userId, today, mondayOf(today)]
    );
    const workoutRows = workoutResult.rows;
    const totalExercises = workoutRows.length;
    const exercisesCompleted = workoutRows.filter(w => w.done).length;
    const workoutCompleted = totalExercises > 0 && exercisesCompleted === totalExercises;

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
          workout_completed = $7, meals_taken = $8, total_meals = $9,
          total_exercises = $10, exercises_completed = $11
        WHERE user_id = $12 AND date = $13
        RETURNING *`,
        [weight, caloriesConsumed, caloriesTarget, proteinConsumed, carbsConsumed,
         fatsConsumed, workoutCompleted, mealsTaken, totalMeals,
         totalExercises, exercisesCompleted, userId, today]
      );
      progressRow = updateResult.rows[0];
    } else {
      const insertResult = await pool.query(
        `INSERT INTO progress (
          user_id, date, weight, calories_consumed, calories_target,
          protein_consumed, carbs_consumed, fats_consumed,
          workout_completed, meals_taken, total_meals,
          total_exercises, exercises_completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [userId, today, weight, caloriesConsumed, caloriesTarget, proteinConsumed,
         carbsConsumed, fatsConsumed, workoutCompleted, mealsTaken, totalMeals,
         totalExercises, exercisesCompleted]
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
// DATE HELPERS (Philippine time, plain YYYY-MM-DD strings)
// ============================================
const todayManila = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Monday of the week that contains the given date
const mondayOf = (key) => {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(key, dow === 0 ? -6 : 1 - dow);
};

// Maintenance calories (Mifflin-St Jeor x activity). users.tdee holds the
// goal-adjusted TARGET (Cutting = -400, Bulking = +400), so the weight
// forecast needs the real maintenance value instead.
const ACTIVITY_MULTIPLIERS = [
  ['Sedentary', 1.2],
  ['Lightly', 1.375],
  ['Moderately', 1.55],
  ['Very', 1.725],
  ['Extra', 1.9],
];

const computeMaintenanceTdee = (u) => {
  if (!u) return 0;
  const weight = parseFloat(u.weight);
  const height = parseFloat(u.height);
  const birthday = u.birthday ? new Date(u.birthday) : null;

  if (weight > 0 && height > 0 && birthday && !isNaN(birthday.getTime()) && u.sex) {
    const now = new Date();
    let age = now.getFullYear() - birthday.getFullYear();
    const hadBirthday =
      now.getMonth() > birthday.getMonth() ||
      (now.getMonth() === birthday.getMonth() && now.getDate() >= birthday.getDate());
    if (!hadBirthday) age -= 1;

    const bmr = u.sex === 'Male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
    const level = String(u.activity_level || '');
    const match = ACTIVITY_MULTIPLIERS.find(([prefix]) => level.startsWith(prefix));
    return Math.round(bmr * (match ? match[1] : 1.55));
  }

  // Fallback: undo the goal adjustment on the stored target
  const stored = parseFloat(u.tdee || 0);
  if (!stored) return 0;
  if (u.dietary_goal === 'Cutting') return stored + 400;
  if (u.dietary_goal === 'Bulking') return stored - 400;
  return stored;
};

// ============================================
// GET SUMMARY (for Progress screen — Daily, Weekly, or Monthly)
// - Weekly = Monday up to today, Monthly = last 30 days, Daily = today
// - EVERY day in the period is returned. Days with no saved progress row
//   (the user did not open Stats that day) are computed from the meal plan
//   (taken meals) and food logs, so no day is missing from the list.
// - Calorie averages only count days that have a log, so "No log" days
//   do not drag the adherence % and the forecast down.
// ============================================
const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { period, mode } = req.query; // period: 'daily' | 'weekly' | 'monthly'
    const planMode = mode === 'continuous' ? 'continuous' : 'weekly';

    const today = todayManila();
    let startKey;
    if (period === 'daily') startKey = today;
    else if (period === 'monthly') startKey = addDays(today, -29);
    else startKey = mondayOf(today);

    const allKeys = [];
    for (let k = startKey; k <= today; k = addDays(k, 1)) allKeys.push(k);

    const [progressResult, userResult] = await Promise.all([
      pool.query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date_key, weight,
                calories_consumed, calories_target,
                protein_consumed, carbs_consumed, fats_consumed,
                workout_completed, meals_taken, total_meals,
                total_exercises, exercises_completed
         FROM progress
         WHERE user_id = $1 AND date >= $2::date AND date <= $3::date
         ORDER BY date ASC`,
        [userId, startKey, today]
      ),
      pool.query(
        `SELECT weight, height, birthday, sex, activity_level, tdee, dietary_goal
         FROM users WHERE id = $1`,
        [userId]
      ),
    ]);

    const rows = progressResult.rows;
    const user = userResult.rows[0];
    const rowByKey = {};
    rows.forEach((r) => { rowByKey[r.date_key] = r; });

    // Days without a saved row: read the meal plan + food logs directly
    const missingKeys = allKeys.filter((k) => !rowByKey[k]);
    const mealsByKey = {};
    const foodByKey = {};
    if (missingKeys.length > 0) {
      const mealResult = await pool.query(
        `SELECT TO_CHAR(mp.plan_date, 'YYYY-MM-DD') AS d, mp.taken,
                m.calories, m.protein, m.carbs, m.fats
         FROM meal_plans mp
         JOIN meals m ON mp.meal_id = m.id
         WHERE mp.user_id = $1 AND mp.mode = $2
           AND mp.plan_date >= $3::date AND mp.plan_date <= $4::date`,
        [userId, planMode, startKey, today]
      );
      mealResult.rows.forEach((r) => {
        (mealsByKey[r.d] = mealsByKey[r.d] || []).push(r);
      });

      const foodResult = await pool.query(
        `SELECT TO_CHAR(DATE(logged_at), 'YYYY-MM-DD') AS d,
                calories, protein, carbs, fats
         FROM food_logs
         WHERE user_id = $1
           AND DATE(logged_at) >= $2::date AND DATE(logged_at) <= $3::date`,
        [userId, startKey, today]
      );
      foodResult.rows.forEach((r) => {
        (foodByKey[r.d] = foodByKey[r.d] || []).push(r);
      });
    }

    const lastRowTarget = rows.length
      ? parseFloat(rows[rows.length - 1].calories_target || 0)
      : 0;
    const fallbackTarget = lastRowTarget || parseFloat(user?.tdee || 2000);
    const num = (v) => parseFloat(v || 0);

    const entries = allKeys.map((key) => {
      const r = rowByKey[key];
      if (r) {
        return {
          key,
          target: num(r.calories_target) || fallbackTarget,
          actual: num(r.calories_consumed),
          protein: num(r.protein_consumed),
          carbs: num(r.carbs_consumed),
          fats: num(r.fats_consumed),
          totalMeals: num(r.total_meals),
          mealsTaken: num(r.meals_taken),
          totalExercises: num(r.total_exercises),
          exercisesCompleted: num(r.exercises_completed),
          weight: r.weight !== null && r.weight !== undefined ? parseFloat(r.weight) : null,
        };
      }
      const meals = mealsByKey[key] || [];
      const taken = meals.filter((m) => m.taken);
      const food = foodByKey[key] || [];
      const sum = (list, f) => list.reduce((s, x) => s + num(x[f]), 0);
      return {
        key,
        target: fallbackTarget,
        actual: sum(taken, 'calories') + sum(food, 'calories'),
        protein: sum(taken, 'protein') + sum(food, 'protein'),
        carbs: sum(taken, 'carbs') + sum(food, 'carbs'),
        fats: sum(taken, 'fats') + sum(food, 'fats'),
        totalMeals: meals.length,
        mealsTaken: taken.length,
        totalExercises: 0,
        exercisesCompleted: 0,
        weight: null,
      };
    });

    const maintenanceTdee = computeMaintenanceTdee(user);

    // Nothing at all in this period (new user): keep the "No records yet" screen
    const hasAnything =
      rows.length > 0 || entries.some((e) => e.actual > 0 || e.totalMeals > 0);
    if (!hasAnything) {
      return res.json({
        success: true,
        summary: {
          dailyCalories: [],
          bodyProgress: { start: 0, current: 0, change: 0 },
          calorieAdherence: { target: 0, actual: 0, percentage: 0 },
          macros: { protein: 0, carbs: 0, fats: 0 },
          workoutCompletion: 0,
          mealConsistency: 0,
          maintenanceTdee,
        },
      });
    }

    // Chart / records: weekday label for daily + weekly, "Sep 5" for monthly
    const dailyCalories = entries.map((e) => ({
      day: new Date(`${e.key}T00:00:00Z`).toLocaleDateString(
        'en-US',
        period === 'monthly'
          ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
          : { weekday: 'short', timeZone: 'UTC' }
      ),
      target: e.target,
      actual: e.actual,
    }));

    // Body progress (weight change); fall back to the profile weight
    const weightsOnly = entries.filter((e) => e.weight !== null);
    const profileWeight = parseFloat(user?.weight || 0);
    const startWeight = weightsOnly.length > 0 ? weightsOnly[0].weight : profileWeight;
    const currentWeight = weightsOnly.length > 0
      ? weightsOnly[weightsOnly.length - 1].weight
      : profileWeight;

    // Calorie adherence: only days with a log count (no-log days are not "0 kcal eaten")
    const loggedEntries = entries.filter((e) => e.actual > 0);
    const targetBase = loggedEntries.length > 0 ? loggedEntries : entries;
    const avgTarget = Math.round(
      targetBase.reduce((s, e) => s + e.target, 0) / targetBase.length
    );
    const avgActual = loggedEntries.length > 0
      ? Math.round(loggedEntries.reduce((s, e) => s + e.actual, 0) / loggedEntries.length)
      : 0;
    const adherencePercentage = avgTarget > 0 ? Math.round((avgActual / avgTarget) * 100) : 0;

    // Macros as a share of total macro calories
    const proteinCals = entries.reduce((s, e) => s + e.protein, 0) * 4;
    const carbsCals = entries.reduce((s, e) => s + e.carbs, 0) * 4;
    const fatsCals = entries.reduce((s, e) => s + e.fats, 0) * 9;
    const totalMacroCals = proteinCals + carbsCals + fatsCals || 1;
    const macros = {
      protein: Math.round((proteinCals / totalMacroCals) * 100),
      carbs: Math.round((carbsCals / totalMacroCals) * 100),
      fats: Math.round((fatsCals / totalMacroCals) * 100),
    };

    // Consistency: WEIGHTED (completed / scheduled); days with nothing scheduled
    // (Rest Day / no meal plan) are left out instead of counting as 0%.
    const workoutDays = entries.filter((e) => e.totalExercises > 0);
    const exScheduled = workoutDays.reduce((s, e) => s + e.totalExercises, 0);
    const exDone = workoutDays.reduce((s, e) => s + e.exercisesCompleted, 0);
    const workoutCompletion = exScheduled > 0 ? Math.round((exDone / exScheduled) * 100) : 0;

    const mealDays = entries.filter((e) => e.totalMeals > 0);
    const mealsScheduled = mealDays.reduce((s, e) => s + e.totalMeals, 0);
    const mealsTaken = mealDays.reduce((s, e) => s + e.mealsTaken, 0);
    const mealConsistency = mealsScheduled > 0
      ? Math.round((mealsTaken / mealsScheduled) * 100)
      : 0;

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
        maintenanceTdee,
      },
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