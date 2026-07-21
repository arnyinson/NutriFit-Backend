const pool = require('../config/database');

// Static na listahan ng achievements — ang unlock status ay kino-compute batay sa totoong activity ng user
const ACHIEVEMENT_DEFINITIONS = [
  { id: 'a1', title: 'First Healthy Meal', description: 'Logged your first nutritious meal', xp: 50, iconKey: 'salad', category: 'Nutrition', check: (s) => s.mealsTakenTotal >= 1 },
  { id: 'a2', title: 'Food Tracker', description: 'Logged all meals in one day', xp: 70, iconKey: 'clipboard-list', category: 'Nutrition', check: (s) => s.maxMealsTakenInADay >= 3 },
  { id: 'a3', title: 'Healthy Choice', description: 'Selected a recommended meal', xp: 50, iconKey: 'check-circle', category: 'Nutrition', check: (s) => s.mealsTakenTotal >= 1 },
  { id: 'a4', title: 'Meal Logger', description: 'Logged meals for 3 days', xp: 100, iconKey: 'notebook-pen', category: 'Nutrition', check: (s) => s.daysWithMealsTaken >= 3 },
  { id: 'a5', title: 'Food Explorer', description: 'Logged 10 different meals', xp: 150, iconKey: 'utensils-crossed', category: 'Nutrition', check: (s) => s.uniqueMealsTaken >= 10 },
  { id: 'a6', title: 'Nutrition Recorder', description: 'Logged meals for 30 days', xp: 300, iconKey: 'medal', category: 'Nutrition', check: (s) => s.daysWithMealsTaken >= 30 },

  { id: 'a7', title: 'First Workout', description: 'Completed your first workout', xp: 50, iconKey: 'dumbbell', category: 'Workout', check: (s) => s.workoutsCompletedTotal >= 1 },
  { id: 'a8', title: 'Consistency King', description: 'Worked out 3 days in a row', xp: 100, iconKey: 'crown', category: 'Workout', check: (s) => s.maxWorkoutStreak >= 3 },
  { id: 'a9', title: 'Sweat Session', description: 'Logged 5 full workouts', xp: 120, iconKey: 'dumbbell', category: 'Workout', check: (s) => s.workoutsCompletedTotal >= 5 },
  { id: 'a10', title: 'Iron Will', description: 'Completed 10 workouts', xp: 200, iconKey: 'flame', category: 'Workout', check: (s) => s.workoutsCompletedTotal >= 10 },
  { id: 'a11', title: 'No Days Off', description: 'Worked out 7 days in a row', xp: 250, iconKey: 'zap', category: 'Workout', check: (s) => s.maxWorkoutStreak >= 7 },

  { id: 'a12', title: 'Goal Setter', description: 'Set your first dietary goal', xp: 30, iconKey: 'target', category: 'Goals', check: (s) => s.hasSetGoal },
  { id: 'a13', title: 'On Track', description: 'Met calorie goal for 3 days', xp: 80, iconKey: 'bar-chart', category: 'Goals', check: (s) => s.daysMetCalorieGoal >= 3 },
  { id: 'a14', title: 'Weight Watcher', description: 'Lost 1kg toward your goal', xp: 150, iconKey: 'scale', category: 'Goals', check: (s) => s.weightLost >= 1 },
  { id: 'a15', title: 'Halfway There', description: 'Reached 50% of weight goal', xp: 200, iconKey: 'sparkle', category: 'Goals', check: (s) => s.weightLost >= 2.5 },
  { id: 'a16', title: 'Goal Crusher', description: 'Reached your target weight', xp: 500, iconKey: 'trophy', category: 'Goals', check: (s) => s.weightLost >= 5 },
];

const getLongestStreak = (sortedUniqueDates) => {
  if (sortedUniqueDates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const prev = new Date(sortedUniqueDates[i - 1]);
    const curr = new Date(sortedUniqueDates[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
};

const getMyAchievements = async (req, res) => {
  try {
    const userId = req.userId;

    // Meal plan stats (taken meals)
    const takenMealsRes = await pool.query(
      `SELECT mp.plan_date, mp.meal_id
       FROM meal_plans mp
       WHERE mp.user_id = $1 AND mp.taken = true`,
      [userId]
    );
    const takenRows = takenMealsRes.rows;
    const mealsTakenTotal = takenRows.length;
    const uniqueMealsTaken = new Set(takenRows.map(r => r.meal_id)).size;

    const mealsByDate = {};
    takenRows.forEach(r => {
      const key = r.plan_date.toISOString().split('T')[0];
      mealsByDate[key] = (mealsByDate[key] || 0) + 1;
    });
    const daysWithMealsTaken = Object.keys(mealsByDate).length;
    const maxMealsTakenInADay = Object.values(mealsByDate).length > 0 ? Math.max(...Object.values(mealsByDate)) : 0;

    // Workout stats (completed exercises)
    const doneWorkoutsRes = await pool.query(
      `SELECT week_start, day
       FROM workout_plans
       WHERE user_id = $1 AND done = true`,
      [userId]
    );
    const doneRows = doneWorkoutsRes.rows;
    const workoutsCompletedTotal = doneRows.length;

    // Approximate streak: distinct days (week_start + day name) na may completed workout, sorted
    const dayNameToOffset = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
    const workoutDateSet = new Set();
    doneRows.forEach(r => {
      const base = new Date(r.week_start);
      base.setDate(base.getDate() + (dayNameToOffset[r.day] ?? 0));
      workoutDateSet.add(base.toISOString().split('T')[0]);
    });
    const sortedWorkoutDates = [...workoutDateSet].sort();
    const maxWorkoutStreak = getLongestStreak(sortedWorkoutDates);

    // Progress / calorie goal / weight stats
    const progressRes = await pool.query(
      `SELECT date, weight, calories_consumed, calories_target
       FROM progress WHERE user_id = $1 ORDER BY date ASC`,
      [userId]
    );
    const progressRows = progressRes.rows;
    const daysMetCalorieGoal = progressRows.filter(p => {
      const target = parseFloat(p.calories_target || 0);
      const actual = parseFloat(p.calories_consumed || 0);
      if (target === 0) return false;
      const pct = (actual / target) * 100;
      return pct >= 90 && pct <= 110;
    }).length;

    const weightsOnly = progressRows.filter(p => p.weight !== null).map(p => parseFloat(p.weight));
    const weightLost = weightsOnly.length > 1 ? Math.max(0, weightsOnly[0] - weightsOnly[weightsOnly.length - 1]) : 0;

    // Goal set check
    const userRes = await pool.query('SELECT dietary_goal FROM users WHERE id = $1', [userId]);
    const hasSetGoal = !!(userRes.rows[0] && userRes.rows[0].dietary_goal);

    const stats = {
      mealsTakenTotal,
      uniqueMealsTaken,
      daysWithMealsTaken,
      maxMealsTakenInADay,
      workoutsCompletedTotal,
      maxWorkoutStreak,
      daysMetCalorieGoal,
      weightLost: parseFloat(weightLost.toFixed(1)),
      hasSetGoal,
    };

    const achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
      id: def.id,
      title: def.title,
      description: def.description,
      xp: def.xp,
      iconKey: def.iconKey,
      category: def.category,
      unlocked: def.check(stats),
    }));

    const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);

    res.json({
      success: true,
      achievements,
      totalXP,
      stats: {
        weightLost: stats.weightLost,
        mealsTaken: mealsTakenTotal,
        totalCaloriesBurnedEstimate: workoutsCompletedTotal * 150, // simpleng estimate para sa display
      },
    });

  } catch (err) {
    console.error('Get my achievements error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { getMyAchievements };