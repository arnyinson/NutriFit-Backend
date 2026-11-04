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
const { submitBanAppeal } = require('../controllers/ticketController');
const verifyToken = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-registration-otp', verifyRegistrationOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', verifyToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/admin-login', adminLogin);
// Public: a banned user sends an appeal with the short-lived appeal token
router.post('/appeal', submitBanAppeal);

module.exports = router;