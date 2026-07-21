const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
    'Lightly Active (1-2 days per week)': 1.375,
    'Moderate Active (3-4 days per week)': 1.55,
    'Very Active (5+ days per week)': 1.725,
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
// REGISTER
// ============================================
const register = async (req, res) => {
  try {
    const {
      name, email, password, username,
      birthday, sex, height, weight,
      dietary_goal, activity_level, allergens
    } = req.body;

    // Validation
    if (!name || !email || !password || !username || !birthday || !sex || !height || !weight || !dietary_goal || !activity_level) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    // Check if email or username already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate BMI and TDEE
    const age = calculateAge(birthday);
    const bmi = calculateBMI(weight, height);
    const tdee = calculateTDEE(weight, height, age, sex, activity_level);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (
        name, email, password, username, birthday, sex,
        height, weight, dietary_goal, activity_level,
        allergens, bmi, tdee
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, name, email, username, dietary_goal, bmi, tdee`,
      [
        name, email, hashedPassword, username, birthday, sex,
        height, weight, dietary_goal, activity_level,
        allergens || [], bmi, tdee
      ]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user,
    });

  } catch (err) {
    console.error('Register error:', err.message);
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

    // Find user by username or email
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact support.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    // Remove password from response
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
// FORGOT PASSWORD (generates a temporary password)
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

    // Generate a random temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedTempPassword, user.id]);

    // Note: Sa totoong production app, ipapadala ito via email.
    // Para sa capstone demo, ibabalik natin mismo sa response.
    res.json({
      success: true,
      message: 'A temporary password has been generated.',
      username: user.username,
      tempPassword: tempPassword,
    });

  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};
module.exports = { register, login, getCurrentUser, forgotPassword };