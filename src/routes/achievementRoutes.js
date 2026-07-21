const express = require('express');
const router = express.Router();
const { getMyAchievements } = require('../controllers/achievementController');
const verifyToken = require('../middleware/auth');

router.get('/me', verifyToken, getMyAchievements);

module.exports = router;