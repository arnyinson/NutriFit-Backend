const express = require('express');
const router = express.Router();
const {
  register,
  checkUsername,
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

// Simple rate limit para sa check-username (walang bagong package na kailangan).
// Max 60 requests kada minuto kada IP, para hindi ma-spam ang database.
const checkHits = new Map();
const checkUsernameLimiter = (req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const now = Date.now();
  const entry = checkHits.get(ip);
  if (!entry || now > entry.resetAt) {
    checkHits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return next();
  }
  entry.count += 1;
  if (entry.count > 60) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
};
// Linisin ang lumang entries kada 5 minuto
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of checkHits) if (now > e.resetAt) checkHits.delete(ip);
}, 5 * 60 * 1000).unref();

router.post('/register', register);
router.get('/check-username', checkUsernameLimiter, checkUsername);
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