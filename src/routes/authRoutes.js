const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, forgotPassword } = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);

module.exports = router;