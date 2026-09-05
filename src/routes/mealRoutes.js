const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/mealController');
const verifyToken = require('../middleware/auth');

// IMPORTANTE: specific routes muna bago ang generic "/:id" route,
// kung hindi ay ma-i-interpret ni Express ang "log" o "plan" bilang halaga ng :id

// Food logging routes (require auth)
router.post('/log', verifyToken, logFood);
router.get('/log', verifyToken, getFoodLogs);

// Admin route — view ALL users' outside/manual food logs
router.get('/log/all', getAllFoodLogs);

// User meal plan routes (require auth)
router.post('/plan/generate', verifyToken, generateMealPlan);
router.get('/plan/me', verifyToken, getMyMealPlan);
router.patch('/plan/:planId/toggle', verifyToken, toggleMealStatus);
router.patch('/plan/:planId/replace', verifyToken, replaceMealInPlan);

// Public/Admin meal database routes
router.get('/', getAllMeals);
router.post('/', createMeal);
router.get('/:id', getMealById);
router.put('/:id', updateMeal);
router.delete('/:id', deleteMeal);

module.exports = router;