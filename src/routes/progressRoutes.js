const express = require('express');
const router = express.Router();
const {
  logProgress,
  getWeightHistory,
  getWeeklySummary,
  getProgressByDate,
} = require('../controllers/progressController');
const verifyToken = require('../middleware/auth');

router.post('/log', verifyToken, logProgress);
router.get('/weight-history', verifyToken, getWeightHistory);
router.get('/weekly-summary', verifyToken, getWeeklySummary);
router.get('/:date', verifyToken, getProgressByDate);

module.exports = router;