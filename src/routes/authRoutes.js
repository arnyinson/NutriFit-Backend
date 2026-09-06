const express = require('express');
const router = express.Router();
const {
  register,
  verifyRegistrationOtp,
  resendOtp,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  adminLogin,
} = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-registration-otp', verifyRegistrationOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/admin-login', adminLogin);

module.exports = router;