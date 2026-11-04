const pool = require('../config/database');
const { notifyUser } = require('../config/pushNotifications');
const { emitToAdmins, emitToUser } = require('../config/socket');
const { readAppealToken, sendAppealReplyEmail } = require('../config/appeal');

const APPEAL_TYPE = 'Ban Appeal';
const APPEAL_MAX = 500;

// ============================================
// SUBMIT TICKET (User)
// ============================================
const submitTicket = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, message, image_url } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Please enter your feedback message.' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (user_id, type, message, status, image_url)
       VALUES ($1, $2, $3, 'New', $4)
       RETURNING *`,
      [userId, type || 'Other', message, image_url || null]
    );

    // Live update: the admin Feedback page shows the new ticket right away
    emitToAdmins('tickets:changed', { ticket_id: result.rows[0].id, reason: 'new' });

    res.status(201).json({ success: true, message: 'Feedback submitted successfully!', ticket: result.rows[0] });

  } catch (err) {
    console.error('Submit ticket error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ============================================
// SUBMIT BAN APPEAL (Public - banned user, uses the short-lived appeal token)
// ============================================
const submitBanAppeal = async (req, res) => {
  try {
    const { appealToken, message } = req.body;

    const decoded = readAppealToken(appealToken);
    if (!decoded) {
      return res.status(401).json({
        error: 'Your appeal session expired. Please log in again to send an appeal.',
        code: 'APPEAL_EXPIRED',
      });
    }

    const text = (message || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Please write your appeal message.' });
    }
    if (text.length > APPEAL_MAX) {
      return res.status(400).json({ error: `Your message is too long (max ${APPEAL_MAX} characters).` });
    }

    const userResult = await pool.query('SELECT id, banned FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (!userResult.rows[0].banned) {
      return res.status(400).json({
        error: 'Your account is not banned anymore. You can log in normally.',
        code: 'NOT_BANNED',
      });
    }

    // One appeal at a time: wait for the admin to answer the first one
    const open = await pool.query(
      `SELECT id FROM tickets WHERE user_id = $1 AND type = $2 AND status IN ('New', 'Pending') LIMIT 1`,
      [decoded.id, APPEAL_TYPE]
    );
    if (open.rows.length > 0) {
      return res.status(409).json({
        error: 'You already sent an appeal. Please wait for the admin to review it. You will get a reply by email.',
        code: 'APPEAL_PENDING',
      });
    }

    const result = await pool.query(
      `INSERT INTO tickets (user_id, type, message, status)
       VALUES ($1, $2, $3, 'New')
       RETURNING id`,
      [decoded.id, APPEAL_TYPE, text]
    );

    emitToAdmins('tickets:changed', { ticket_id: result.rows[0].id, reason: 'new' });

    res.status(201).json({ success: true, message: 'Appeal sent. We will review it and email you.' });
  } catch (err) {
    console.error('Submit ban appeal error:', err.message);
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

    // Previous reply, so the user is only notified when the reply really changed
    const prev = await pool.query('SELECT admin_response FROM tickets WHERE id = $1', [id]);
    const previousResponse = prev.rows[0]?.admin_response || '';

    // responded_at is only refreshed when the reply text actually changes
    const result = await pool.query(
      `UPDATE tickets SET
        admin_response = COALESCE($1, admin_response),
        responded_at = CASE
          WHEN $1::text IS NOT NULL AND $1::text <> ''
               AND $1::text IS DISTINCT FROM admin_response THEN now()
          ELSE responded_at
        END,
        status = COALESCE($2, status),
        updated_at = now()
      WHERE id = $3
      RETURNING *`,
      [admin_response ?? null, status || 'Resolved', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = result.rows[0];

    // Save to DB (in-app Notifications screen) AND send push when there is a reply.
    // type 'ticket' + ticket_id lets the mobile app open the conversation on tap.
    const replyChanged = !!admin_response && admin_response.trim() !== '' && admin_response !== previousResponse;
    const isAppeal = ticket.type === APPEAL_TYPE;
    if (replyChanged && ticket.user_id && isAppeal) {
      // A banned user cannot open the app, so the reply goes to their email
      try {
        const u = await pool.query('SELECT name, email FROM users WHERE id = $1', [ticket.user_id]);
        if (u.rows[0]) await sendAppealReplyEmail(u.rows[0].email, u.rows[0].name, admin_response);
      } catch (mailErr) {
        console.error('Appeal reply email error (non-fatal):', mailErr.message);
      }
    } else if (replyChanged && ticket.user_id) {
      try {
        const userResult = await pool.query('SELECT push_token FROM users WHERE id = $1', [ticket.user_id]);
        const pushToken = userResult.rows[0]?.push_token;
        await notifyUser(
          ticket.user_id,
          'NutriFit Support',
          'An admin has responded to your feedback ticket.',
          'ticket',
          pushToken,
          { ticket_id: String(ticket.id) }
        );
      } catch (notifyErr) {
        console.error('Notify user error (non-fatal):', notifyErr.message);
      }
    }

    // Live update for the ticket owner (mobile History) and every open admin page
    if (ticket.user_id) emitToUser(ticket.user_id, 'tickets:changed', { ticket_id: ticket.id, reason: 'respond' });
    emitToAdmins('tickets:changed', { ticket_id: ticket.id, reason: 'respond' });

    res.json({ success: true, message: 'Ticket updated successfully.', ticket });

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

    const updated = result.rows[0];
    if (updated.user_id) emitToUser(updated.user_id, 'tickets:changed', { ticket_id: updated.id, reason: 'status' });
    emitToAdmins('tickets:changed', { ticket_id: updated.id, reason: 'status' });

    res.json({ success: true, message: 'Ticket status updated.', ticket: updated });

  } catch (err) {
    console.error('Update ticket status error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  submitTicket,
  submitBanAppeal,
  getMyTickets,
  getAllTickets,
  getTicketById,
  respondToTicket,
  updateTicketStatus,
};