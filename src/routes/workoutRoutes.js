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
} = require('../controllers/workoutController');
const verifyToken = require('../middleware/auth');

// Public/Admin exercise database routes
router.get('/', getAllExercises);
router.get('/:id', getExerciseById);
router.post('/', createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

// User workout plan routes (require auth)
router.post('/plan/generate', verifyToken, generateWorkoutPlan);
router.get('/plan/me', verifyToken, getMyWorkoutPlan);
router.patch('/plan/:planId/toggle', verifyToken, toggleExerciseDone);

// Workout logging routes (require auth)
router.post('/log', verifyToken, logWorkout);
router.get('/log', verifyToken, getWorkoutLogs);

module.exports = router;