const pool = require('../config/database');
const bcrypt = require('bcryptjs');

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
      `SELECT id, name, email, username, birthday, sex, height, weight,
              dietary_goal, activity_level, allergens, bmi, tdee, is_active, avatar_url, created_at
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
    const { name, birthday, sex, height, weight, dietary_goal, activity_level, allergens } = req.body;

    // Recalculate BMI and TDEE if height/weight/birthday/sex/activity changed
    let bmi, tdee;
    if (height && weight) {
      bmi = calculateBMI(parseFloat(weight), parseFloat(height));

      // Need birthday and sex for TDEE - fetch current if not provided
      const current = await pool.query('SELECT birthday, sex, activity_level FROM users WHERE id = $1', [userId]);
      const currentUser = current.rows[0];
      const useBirthday = birthday || currentUser.birthday;
      const useSex = sex || currentUser.sex;
      const useActivity = activity_level || currentUser.activity_level;
      const age = calculateAge(useBirthday);

      tdee = calculateTDEE(parseFloat(weight), parseFloat(height), age, useSex, useActivity);
    }

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
        bmi = COALESCE($9, bmi),
        tdee = COALESCE($10, tdee),
        updated_at = now()
      WHERE id = $11
      RETURNING id, name, email, username, birthday, sex, height, weight,
                dietary_goal, activity_level, allergens, bmi, tdee, avatar_url`,
      [name, birthday, sex, height, weight, dietary_goal, activity_level, allergens, bmi, tdee, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'Profile updated successfully.', user: result.rows[0] });

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
    const { search, dietary_goal, is_active } = req.query;

    let query = `
      SELECT id, name, email, username, birthday, sex, height, weight,
             dietary_goal, activity_level, allergens, bmi, tdee, is_active, avatar_url, created_at
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
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
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
// GET DASHBOARD STATS (Admin - Dashboard page)
// ============================================
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const activeMealPlans = await pool.query(
      "SELECT COUNT(DISTINCT user_id) FROM meal_plans WHERE week_start >= current_date() - 7"
    );
    const weeklyReports = await pool.query(
      "SELECT COUNT(*) FROM progress WHERE date >= current_date() - 7"
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

    // Compute age in JS instead of SQL (safer across DB engines)
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
        weeklyReports: weeklyReports.rows[0].count,
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

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus,
  getDashboardStats,
};