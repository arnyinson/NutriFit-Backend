const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateAndSaveMealPlan } = require('./mealController');

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
// GET MY PROFILE
// ============================================
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, first_name, middle_name, last_name, email, username, birthday, sex, height, weight,
              dietary_goal, dietary_preference, activity_level, allergens, available_equipment,
              bmi, tdee, is_active, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, user: result.rows[0] });

  } catch (err) {
    console.error('Get my profile error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// UPDATE MY PROFILE
// ============================================
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, first_name, middle_name, last_name, birthday, sex, height, weight, dietary_goal, activity_level, allergens, available_equipment, dietary_preference } = req.body;

    const VALID_DIETS = ['None', 'Pescatarian', 'Vegetarian', 'Vegan'];
    if (dietary_preference !== undefined && dietary_preference !== null && !VALID_DIETS.includes(dietary_preference)) {
      return res.status(400).json({ error: 'Invalid dietary preference.' });
    }


    // If name parts are sent, rebuild the full name from them
    let fullName = name || null;
    let fn = null, mn = null, ln = null;
    if (first_name !== undefined || last_name !== undefined || middle_name !== undefined) {
      fn = (first_name || '').trim();
      mn = (middle_name || '').trim();
      ln = (last_name || '').trim();
      if (!fn || !ln) {
        return res.status(400).json({ error: 'First name and last name are required.' });
      }
      fullName = [fn, mn, ln].filter(Boolean).join(' ');
    }

    let bmi, tdee;
    if (height && weight) {
      bmi = calculateBMI(parseFloat(weight), parseFloat(height));

      const current = await pool.query('SELECT birthday, sex, activity_level FROM users WHERE id = $1', [userId]);
      const currentUser = current.rows[0];
      const useBirthday = birthday || currentUser.birthday;
      const useSex = sex || currentUser.sex;
      const useActivity = activity_level || currentUser.activity_level;
      const age = calculateAge(useBirthday);

      tdee = calculateTDEE(parseFloat(weight), parseFloat(height), age, useSex, useActivity);
    }

    // Kunin ang dating diet at allergens para malaman kung kailangang i-regenerate ang meal plan
    const beforeRes = await pool.query('SELECT dietary_preference, allergens FROM users WHERE id = $1', [userId]);
    const before = beforeRes.rows[0] || {};

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        birthday = COALESCE($2, birthday),
        sex = COALESCE($3, sex),
        height = COALESCE($4, height),
        weight = COALESCE($5, weight),
        dietary_goal = COALESCE($6, dietary_goal),
        activity_level = COALESCE($7, activity_level),
        allergens = COALESCE($8, allergens),
        available_equipment = COALESCE($9, available_equipment),
        bmi = COALESCE($10, bmi),
        tdee = COALESCE($11, tdee),
        first_name = COALESCE($13::text, first_name),
        middle_name = CASE WHEN $13::text IS NULL THEN middle_name ELSE NULLIF($14::text, '') END,
        last_name = COALESCE($15::text, last_name),
        dietary_preference = COALESCE($16::text, dietary_preference),
        updated_at = now()
      WHERE id = $12
      RETURNING id, name, first_name, middle_name, last_name, email, username, birthday, sex, height, weight,
                dietary_goal, dietary_preference, activity_level, allergens, available_equipment,
                bmi, tdee, avatar_url`,
      [fullName, birthday, sex, height, weight, dietary_goal, activity_level, allergens,
       available_equipment, bmi, tdee, userId, fn, mn, ln, dietary_preference || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Nagbago ang diet o allergens: i-regenerate ang NALALABING araw ng meal plan.
    // Hindi gagalawin ang mga nakaraang araw at ang mga meal na naka-taken o skipped na.
    const dietChanged =
      dietary_preference !== undefined && dietary_preference !== null &&
      dietary_preference !== (before.dietary_preference || 'None');
    const sortedKey = (arr) => [...(arr || [])].sort().join('|');
    const allergensChanged =
      Array.isArray(allergens) && sortedKey(allergens) !== sortedKey(before.allergens);

    let planWarning = null;
    if (dietChanged || allergensChanged) {
      try {
        const modesRes = await pool.query(
          'SELECT DISTINCT mode FROM meal_plans WHERE user_id = $1 AND plan_date >= current_date()',
          [userId]
        );
        const modes = modesRes.rows.length > 0 ? modesRes.rows.map((r) => r.mode) : ['weekly'];
        for (const m of modes) {
          await generateAndSaveMealPlan(userId, m, { keepProgress: true });
        }
      } catch (planErr) {
        console.error('Plan regeneration after profile update failed:', planErr.message);
        planWarning = planErr.statusCode === 422
          ? 'Your preferences were saved, but no meals match them yet. Your current meal plan was kept.'
          : 'Your preferences were saved, but your meal plan could not be updated right now.';
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.rows[0],
      ...(planWarning ? { plan_warning: planWarning } : {}),
    });

  } catch (err) {
    console.error('Update my profile error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ success: true, message: 'Password changed successfully.' });

  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET ALL USERS (Admin - User Management page)
// ============================================
const getAllUsers = async (req, res) => {
  try {
    const { search, dietary_goal, is_active, archived, banned } = req.query;

    let query = `
      SELECT id, name, first_name, middle_name, last_name, email, username, birthday, sex, height, weight,
             dietary_goal, activity_level, allergens, bmi, tdee, is_active,
             archived, banned, ban_reason, banned_at, last_login, avatar_url, created_at
      FROM users WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (dietary_goal && dietary_goal !== 'All Goal') {
      query += ` AND dietary_goal = $${paramIndex}`;
      params.push(dietary_goal);
      paramIndex++;
    }
    if (banned !== undefined) {
      query += ` AND banned = $${paramIndex}`;
      params.push(banned === 'true');
      paramIndex++;
    } else if (archived !== undefined) {
      query += ` AND archived = $${paramIndex}`;
      params.push(archived === 'true');
      paramIndex++;
    } else if (is_active !== undefined) {
      // Only apply the is_active filter when NOT specifically filtering by archived status,
      // so that "Archived" users aren't hidden by an unrelated is_active filter
      // Banned users are always is_active = false, so exclude them here —
      // they have their own "Banned" filter.
      query += ` AND banned = false AND is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });

  } catch (err) {
    console.error('Get all users error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET USER DETAILS (Admin - full profile)
// ============================================
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT id, name, first_name, middle_name, last_name, email, username, birthday, sex, height, weight,
              dietary_goal, activity_level, allergens, available_equipment,
              bmi, tdee, is_active, archived, banned, ban_reason, banned_at,
              last_login, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      success: true,
      user: userResult.rows[0],
    });

  } catch (err) {
    console.error('Get user details error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// BAN / UNBAN USER (Admin)
// Ban = permanent and needs a reason that the user sees on login.
// Deactivate = temporary suspension (no reason required).
// ============================================
const BAN_REASONS = [
  'Fake or unrealistic account',
  'Duplicate account',
  'Violation of Terms and Conditions',
  'Abuse or spam in Support tickets',
  'Providing harmful false information',
  'Other',
];

const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || '').trim();
    const note = String(req.body.note || '').trim().slice(0, 150);

    if (!BAN_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Please select a valid ban reason.' });
    }
    if (reason === 'Other' && !note) {
      return res.status(400).json({ error: 'Please describe the reason for the ban.' });
    }

    const banReason = reason === 'Other' ? note : note ? `${reason} - ${note}` : reason;

    const result = await pool.query(
      `UPDATE users
       SET banned = true, ban_reason = $1, banned_at = now(), is_active = false
       WHERE id = $2
       RETURNING id, name, is_active, banned, ban_reason, banned_at`,
      [banReason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'User banned.', user: result.rows[0] });

  } catch (err) {
    console.error('Ban user error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET banned = false, ban_reason = NULL, banned_at = NULL, is_active = true
       WHERE id = $1
       RETURNING id, name, is_active, banned`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'User unbanned.', user: result.rows[0] });

  } catch (err) {
    console.error('Unban user error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// TOGGLE USER ACTIVE STATUS (Admin - Activate/Deactivate)
// ============================================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'User status updated.', user: result.rows[0] });

  } catch (err) {
    console.error('Toggle user status error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// UNARCHIVE USER (Admin - manual override)
// ============================================
const unarchiveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET archived = false, last_login = now() WHERE id = $1 RETURNING id, name, archived',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'User unarchived successfully.', user: result.rows[0] });

  } catch (err) {
    console.error('Unarchive user error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET DASHBOARD STATS (Admin - Dashboard page)
// ============================================
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const activeMealPlans = await pool.query(
      "SELECT COUNT(DISTINCT user_id) FROM meal_plans WHERE week_start >= current_date() - 7"
    );
    const activeWorkoutPlans = await pool.query(
      "SELECT COUNT(DISTINCT user_id) FROM workout_plans WHERE week_start >= current_date() - 7"
    );
    const allergyCases = await pool.query(
      "SELECT COUNT(*) FROM users WHERE array_length(allergens, 1) > 0"
    );

    const goalDistribution = await pool.query(`
      SELECT dietary_goal, COUNT(*) as count
      FROM users GROUP BY dietary_goal
    `);

    const recentUsers = await pool.query(`
      SELECT name, email, dietary_goal, is_active, birthday
      FROM users ORDER BY created_at DESC LIMIT 5
    `);

    const recentUsersWithAge = recentUsers.rows.map(u => {
      const today = new Date();
      const birthDate = new Date(u.birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return { ...u, age };
    });

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.rows[0].count,
        activeMealPlans: activeMealPlans.rows[0].count,
        activeWorkoutPlans: activeWorkoutPlans.rows[0].count,
        allergyCases: allergyCases.rows[0].count,
      },
      goalDistribution: goalDistribution.rows,
      recentUsers: recentUsersWithAge,
    });

  } catch (err) {
    console.error('Get dashboard stats error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// SAVE PUSH TOKEN (Mobile App)
// ============================================
const savePushToken = async (req, res) => {
  try {
    const userId = req.userId;
    const { push_token } = req.body;

    if (!push_token) {
      return res.status(400).json({ error: 'push_token is required.' });
    }

    await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [push_token, userId]);

    res.json({ success: true, message: 'Push token saved.' });

  } catch (err) {
    console.error('Save push token error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  getUserDetails,
  banUser,
  unbanUser,
  toggleUserStatus,
  unarchiveUser,
  getDashboardStats,
  savePushToken,
};