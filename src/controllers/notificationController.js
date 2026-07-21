const pool = require('../config/database');

// ============================================
// GET MY NOTIFICATIONS
// ============================================
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (type && type !== 'all') {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({ success: true, notifications: result.rows, unreadCount });

  } catch (err) {
    console.error('Get my notifications error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// CREATE NOTIFICATION (internal use / system-generated)
// ============================================
const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title, and message are required.' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, title, message, type || 'system']
    );

    res.status(201).json({ success: true, notification: result.rows[0] });

  } catch (err) {
    console.error('Create notification error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// MARK ONE AS READ
// ============================================
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true, notification: result.rows[0] });

  } catch (err) {
    console.error('Mark as read error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// MARK ALL AS READ
// ============================================
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    res.json({ success: true, message: 'All notifications marked as read.' });

  } catch (err) {
    console.error('Mark all as read error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// DELETE NOTIFICATION
// ============================================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification deleted.' });

  } catch (err) {
    console.error('Delete notification error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};