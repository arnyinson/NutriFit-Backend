const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, forgotPassword, adminLogin } = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/admin-login', adminLogin);

module.exports = router;

