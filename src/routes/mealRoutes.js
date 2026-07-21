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
} = require('../controllers/mealController');
const verifyToken = require('../middleware/auth');

// Public/Admin meal database routes
router.get('/', getAllMeals);
router.get('/:id', getMealById);
router.post('/', createMeal);
router.put('/:id', updateMeal);
router.delete('/:id', deleteMeal);

// User meal plan routes (require auth)
router.post('/plan/generate', verifyToken, generateMealPlan);
router.get('/plan/me', verifyToken, getMyMealPlan);
router.patch('/plan/:planId/toggle', verifyToken, toggleMealStatus);
router.patch('/plan/:planId/replace', verifyToken, replaceMealInPlan);

// Food logging routes (require auth)
router.post('/log', verifyToken, logFood);
router.get('/log', verifyToken, getFoodLogs);

module.exports = router;