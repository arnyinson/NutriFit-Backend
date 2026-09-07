const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOtp, sendOtpEmail } = require('../config/emailService');
require('dotenv').config();

const OTP_EXPIRY_MINUTES = 10;

// Calculate BMI
const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

// Calculate TDEE (Mifflin-St Jeor)
const calculateTDEE = (weight, height, age, sex, activityLevel) => {
  let bmr;
  if (sex === 'Male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  const multipliers = {
    'Sedentary (little or no exercise)': 1.2,
    'Lightly Active (1-3 days per week)': 1.375,
    'Moderately Active (3-5 days per week)': 1.55,
    'Very Active (6-7 days per week)': 1.725,
    'Extra Active (very hard exercise / physical job)': 1.9,
  };
  const multiplier = multipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
};

// Calculate age from birthday
const calculateAge = (birthday) => {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// ============================================
// REGISTER (creates an UNVERIFIED account, sends OTP)
// ============================================
const register = async (req, res) => {
  try {
    const {
      name, email, password, username,
      birthday, sex, height, weight,
      dietary_goal, activity_level, allergens
    } = req.body;

    if (!name || !email || !password || !username || !birthday || !sex || !height || !weight || !dietary_goal || !activity_level) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const age = calculateAge(birthday);
    const bmi = calculateBMI(weight, height);
    const tdee = calculateTDEE(weight, height, age, sex, activity_level);

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO users (
        name, email, password, username, birthday, sex,
        height, weight, dietary_goal, activity_level,
        allergens, bmi, tdee, otp_code, otp_expires_at, otp_purpose
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, name, email, username, dietary_goal, bmi, tdee`,
      [
        name, email, hashedPassword, username, birthday, sex,
        height, weight, dietary_goal, activity_level,
        allergens || [], bmi, tdee, otpCode, otpExpiresAt, 'registration'
      ]
    );

    const user = result.rows[0];

    try {
      await sendOtpEmail(email, otpCode, 'registration');
    } catch (emailErr) {
      console.error('Send registration OTP email error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email for the verification code.',
      email: user.email,
      requiresVerification: true,
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// VERIFY REGISTRATION OTP
// ============================================
const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const result = await pool.query(
      `SELECT id, name, email, username, dietary_goal, bmi, tdee, otp_code, otp_expires_at, email_verified
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    if (!user.otp_code || user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    await pool.query(
      `UPDATE users SET email_verified = true, otp_code = NULL, otp_expires_at = NULL, otp_purpose = NULL
       WHERE id = $1`,
      [user.id]
    );

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        dietary_goal: user.dietary_goal,
        bmi: user.bmi,
        tdee: user.tdee,
      },
    });

  } catch (err) {
    console.error('Verify registration OTP error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// RESEND OTP (works for both registration and forgot-password)
// ============================================
const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ error: 'Email and purpose are required.' });
    }

    const userResult = await pool.query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = userResult.rows[0];

    if (purpose === 'registration' && user.email_verified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3 WHERE id = $4',
      [otpCode, otpExpiresAt, purpose, user.id]
    );

    await sendOtpEmail(email, otpCode, purpose);

    res.json({ success: true, message: 'A new verification code has been sent to your email.' });

  } catch (err) {
    console.error('Resend OTP error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// LOGIN
// ============================================
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter username and password.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact support.' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Track last login time, and un-archive the account if it comes back after being archived
    await pool.query(
      'UPDATE users SET last_login = now(), archived = false WHERE id = $1',
      [user.id]
    );
    user.archived = false;

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    delete user.password;

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user,
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// GET CURRENT USER (for auto-login / token check)
// ============================================
const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, username, birthday, sex, height, weight,
              dietary_goal, activity_level, allergens, bmi, tdee, is_active, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, user: result.rows[0] });

  } catch (err) {
    console.error('Get current user error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// FORGOT PASSWORD — STEP 1: request an OTP
// ============================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    const userResult = await pool.query(
      'SELECT id, name, username FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    const user = userResult.rows[0];

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3 WHERE id = $4',
      [otpCode, otpExpiresAt, 'forgot_password', user.id]
    );

    await sendOtpEmail(email, otpCode, 'forgot_password');

    res.json({
      success: true,
      message: 'A verification code has been sent to your email.',
      email,
    });

  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// FORGOT PASSWORD — STEP 2: verify OTP and set new password
// ============================================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, code, and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const result = await pool.query(
      'SELECT id, otp_code, otp_expires_at, otp_purpose FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = result.rows[0];

    if (!user.otp_code || user.otp_code !== otp || user.otp_purpose !== 'forgot_password') {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users SET password = $1, otp_code = NULL, otp_expires_at = NULL, otp_purpose = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });

  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ============================================
// ADMIN LOGIN (for Admin Web)
// ============================================
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter username and password.' });
    }

    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, message: 'Admin login successful!', token });

  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

module.exports = {
  register,
  verifyRegistrationOtp,
  resendOtp,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  adminLogin,
};