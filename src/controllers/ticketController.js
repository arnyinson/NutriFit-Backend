const pool = require('../config/database');

// ============================================
// SUBMIT TICKET (User)
// ============================================
const submitTicket = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, message, rating } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Please enter your feedback message.' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please provide a rating between 1 and 5.' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (user_id, type, message, rating, status)
       VALUES ($1, $2, $3, $4, 'New')
       RETURNING *`,
      [userId, type || 'Other', message, rating]
    );

    res.status(201).json({ success: true, message: 'Feedback submitted successfully!', ticket: result.rows[0] });

  } catch (err) {
    console.error('Submit ticket error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET MY TICKETS (User - view own ticket history)
// ============================================
const getMyTickets = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, tickets: result.rows });

  } catch (err) {
    console.error('Get my tickets error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET ALL TICKETS (Admin - view all feedback)
// ============================================
const getAllTickets = async (req, res) => {
  try {
    const { status, search, date_start, date_end } = req.query;

    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All Status') {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR t.message ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (date_start) {
      query += ` AND t.created_at >= $${paramIndex}`;
      params.push(date_start);
      paramIndex++;
    }
    if (date_end) {
      query += ` AND t.created_at <= $${paramIndex}`;
      params.push(date_end);
      paramIndex++;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);

    // Summary counts
    const summary = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'New') as new_count,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_count
      FROM tickets
    `);

    res.json({
      success: true,
      tickets: result.rows,
      summary: summary.rows[0],
    });

  } catch (err) {
    console.error('Get all tickets error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// GET SINGLE TICKET (Admin - view detail)
// ============================================
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ success: true, ticket: result.rows[0] });

  } catch (err) {
    console.error('Get ticket by id error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// RESPOND TO / RESOLVE TICKET (Admin)
// ============================================
const respondToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_response, status } = req.body;

    const result = await pool.query(
      `UPDATE tickets SET
        admin_response = COALESCE($1, admin_response),
        status = COALESCE($2, status),
        updated_at = now()
      WHERE id = $3
      RETURNING *`,
      [admin_response, status || 'Resolved', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ success: true, message: 'Ticket updated successfully.', ticket: result.rows[0] });

  } catch (err) {
    console.error('Respond to ticket error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// UPDATE TICKET STATUS ONLY (Admin - quick status change)
// ============================================
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['New', 'Pending', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const result = await pool.query(
      `UPDATE tickets SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ success: true, message: 'Ticket status updated.', ticket: result.rows[0] });

  } catch (err) {
    console.error('Update ticket status error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  submitTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  respondToTicket,
  updateTicketStatus,
};