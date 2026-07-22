const pool = require('../config/database');
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// ============================================
// GET ALL EXERCISES (admin / browsing)
// ============================================
const getAllExercises = async (req, res) => {
  try {
    const { muscle_group, equipment, difficulty, search } = req.query;

    let query = 'SELECT * FROM exercises WHERE is_active = true';
    const params = [];
    let paramIndex = 1;

    if (muscle_group) {
      query += ` AND muscle_group = $${paramIndex}`;
      params.push(muscle_group);
      paramIndex++;
    }
    if (equipment) {
      query += ` AND equipment = $${paramIndex}`;
      params.push(equipment);
      paramIndex++;
    }
    if (difficulty) {
      query += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }
    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, exercises: result.rows });

  } catch (err) {
    console.error('Get all exercises error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET SINGLE EXERCISE
// ============================================
const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    res.json({ success: true, exercise: result.rows[0] });
  } catch (err) {
    console.error('Get exercise by id error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// CREATE EXERCISE (Admin)
// ============================================
const createExercise = async (req, res) => {
  try {
    const { name, muscle_group, equipment, difficulty, instructions, video_url, image_url } = req.body;

    if (!name || !muscle_group || !difficulty) {
      return res.status(400).json({ error: 'Name, muscle group, and difficulty are required.' });
    }

    const result = await pool.query(
      `INSERT INTO exercises (name, muscle_group, equipment, difficulty, instructions, video_url, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, muscle_group, equipment || 'Bodyweight', difficulty, instructions || '', video_url || null, image_url || null]
    );

    res.status(201).json({ success: true, message: 'Exercise created successfully.', exercise: result.rows[0] });

  } catch (err) {
    console.error('Create exercise error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// UPDATE EXERCISE (Admin)
// ============================================
const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, muscle_group, equipment, difficulty, instructions, video_url, image_url, is_active } = req.body;

    const result = await pool.query(
      `UPDATE exercises SET
        name = COALESCE($1, name),
        muscle_group = COALESCE($2, muscle_group),
        equipment = COALESCE($3, equipment),
        difficulty = COALESCE($4, difficulty),
        instructions = COALESCE($5, instructions),
        video_url = COALESCE($6, video_url),
        image_url = COALESCE($7, image_url),
        is_active = COALESCE($8, is_active),
        updated_at = now()
      WHERE id = $9
      RETURNING *`,
      [name, muscle_group, equipment, difficulty, instructions, video_url, image_url, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    res.json({ success: true, message: 'Exercise updated successfully.', exercise: result.rows[0] });

  } catch (err) {
    console.error('Update exercise error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// DELETE EXERCISE (Admin)
// ============================================
const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    res.json({ success: true, message: 'Exercise deleted successfully.' });

  } catch (err) {
    console.error('Delete exercise error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GENERATE WORKOUT PLAN (calls Python ML API, saves to DB)
// ============================================
const generateWorkoutPlan = async (req, res) => {
  try {
    const userId = req.userId;
    const { mode, experience_level, available_equipment } = req.body;

    // Call Python ML API
    const mlResponse = await axios.post(`${ML_API_URL}/recommend-workout`, {
      experience_level: experience_level || 'Beginner',
      available_equipment: available_equipment || ['Bodyweight', 'Dumbbell'],
      mode: mode || 'weekly',
    });

    const { workout_plan } = mlResponse.data.data;

    // Helper: format Date object as YYYY-MM-DD using LOCAL date parts (hindi UTC/toISOString)
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = formatLocalDate(monday);

    // Clear existing workout plan for this user (same mode)
    await pool.query(
      'DELETE FROM workout_plans WHERE user_id = $1 AND week_start = $2',
      [userId, weekStart]
    );

    // Save new workout plan
    for (const day of workout_plan) {
      if (day.is_rest) continue;

      for (const exercise of day.exercises) {
        await pool.query(
          `INSERT INTO workout_plans (
            user_id, exercise_id, day, week_start, sets, reps, done
          ) VALUES ($1, $2, $3, $4, $5, $6, false)`,
          [userId, exercise.id, day.day, weekStart, exercise.sets, exercise.reps]
        );
      }
    }

    res.json({
      success: true,
      message: 'Workout plan generated successfully!',
      data: { workout_plan, mode: mode || 'weekly' }
    });

  } catch (err) {
    console.error('Generate workout plan error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI recommendation service is unavailable. Please try again later.' });
    }
    res.status(500).json({ error: 'Server error while generating workout plan.' });
  }
};

// ============================================
// GET USER'S CURRENT WORKOUT PLAN
// ============================================
const getMyWorkoutPlan = async (req, res) => {
  try {
    const userId = req.userId;

    // Helper: format Date object as YYYY-MM-DD using LOCAL date parts (hindi UTC/toISOString)
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = formatLocalDate(monday);

    const result = await pool.query(
      `SELECT wp.id, wp.day, wp.sets, wp.reps, wp.done,
              e.id as exercise_id, e.name, e.muscle_group, e.equipment,
              e.difficulty, e.instructions, e.video_url
       FROM workout_plans wp
       JOIN exercises e ON wp.exercise_id = e.id
       WHERE wp.user_id = $1 AND wp.week_start = $2
       ORDER BY
         CASE wp.day
           WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7 END`,
      [userId, weekStart]
    );

    // Group by day
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.day]) {
        grouped[row.day] = { day: row.day, exercises: [] };
      }
      grouped[row.day].exercises.push({
        plan_id: row.id,
        sets: row.sets,
        reps: row.reps,
        done: row.done,
        exercise: {
          id: row.exercise_id,
          name: row.name,
          muscle_group: row.muscle_group,
          equipment: row.equipment,
          difficulty: row.difficulty,
          instructions: row.instructions,
          video_url: row.video_url,
        }
      });
    });

    res.json({ success: true, workoutPlan: Object.values(grouped) });

  } catch (err) {
    console.error('Get my workout plan error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// TOGGLE EXERCISE DONE
// ============================================
const toggleExerciseDone = async (req, res) => {
  try {
    const { planId } = req.params;
    const { done } = req.body;

    const result = await pool.query(
      `UPDATE workout_plans SET done = $1 WHERE id = $2 RETURNING *`,
      [done, planId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout plan entry not found.' });
    }

    res.json({ success: true, message: 'Exercise status updated.', workoutPlan: result.rows[0] });

  } catch (err) {
    console.error('Toggle exercise done error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// LOG WORKOUT (sets, reps, weight actually completed)
// ============================================
const logWorkout = async (req, res) => {
  try {
    const userId = req.userId;
    const { exercise_id, sets_completed, reps_completed, weight_used } = req.body;

    if (!exercise_id) {
      return res.status(400).json({ error: 'exercise_id is required.' });
    }

    const result = await pool.query(
      `INSERT INTO workout_logs (user_id, exercise_id, sets_completed, reps_completed, weight_used)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, exercise_id, sets_completed || null, reps_completed || null, weight_used || null]
    );

    res.status(201).json({ success: true, message: 'Workout logged successfully.', workoutLog: result.rows[0] });

  } catch (err) {
    console.error('Log workout error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET WORKOUT LOGS
// ============================================
const getWorkoutLogs = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.query;

    let query = `
      SELECT wl.*, e.name as exercise_name, e.muscle_group
      FROM workout_logs wl
      JOIN exercises e ON wl.exercise_id = e.id
      WHERE wl.user_id = $1
    `;
    const params = [userId];

    if (date) {
      query += ` AND DATE(logged_at) = $2`;
      params.push(date);
    }

    query += ' ORDER BY logged_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, workoutLogs: result.rows });

  } catch (err) {
    console.error('Get workout logs error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  generateWorkoutPlan,
  getMyWorkoutPlan,
  toggleExerciseDone,
  logWorkout,
  getWorkoutLogs,
};