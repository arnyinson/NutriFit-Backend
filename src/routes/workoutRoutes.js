const express = require('express');
const router = express.Router();
const {
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
  getExerciseVideo,
} = require('../controllers/workoutController');
const verifyToken = require('../middleware/auth');

// IMPORTANT: specific routes go BEFORE the generic "/:id" route,
// otherwise Express will interpret "video" as an :id value

// User workout plan routes (require auth)
router.post('/plan/generate', verifyToken, generateWorkoutPlan);
router.get('/plan/me', verifyToken, getMyWorkoutPlan);
router.patch('/plan/:planId/toggle', verifyToken, toggleExerciseDone);

// Workout logging routes (require auth)
router.post('/log', verifyToken, logWorkout);
router.get('/log', verifyToken, getWorkoutLogs);

// Exercise video (uploaded video first, ExerciseDB GIF fallback)
router.get('/:id/video', getExerciseVideo);

// Public/Admin exercise database routes
router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

module.exports = router;