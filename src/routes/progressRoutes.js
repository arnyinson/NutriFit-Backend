const express = require('express');
const router = express.Router();
const {
  logProgress,
  syncTodayProgress,
  getWeightHistory,
  getWeeklySummary,
  getProgressByDate,
} = require('../controllers/progressController');
const verifyToken = require('../middleware/auth');

// IMPORTANT: specific routes go BEFORE the generic "/:date" route,
// otherwise Express will interpret "sync-today" as a :date value

router.post('/log', verifyToken, logProgress);
router.post('/sync-today', verifyToken, syncTodayProgress);
router.get('/weight-history', verifyToken, getWeightHistory);
router.get('/weekly-summary', verifyToken, getWeeklySummary);
router.get('/:date', verifyToken, getProgressByDate);

module.exports = router;