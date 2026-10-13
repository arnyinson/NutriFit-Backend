const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please login.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    try {
      const result = await pool.query(
        'SELECT is_active, banned, ban_reason FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Account not found. Please login again.', code: 'ACCOUNT_NOT_FOUND' });
      }

      const account = result.rows[0];

      if (account.banned) {
        return res.status(403).json({
          error: `Your account has been banned. Reason: ${account.ban_reason || 'Violation of the Terms and Conditions'}. If you believe this is a mistake, please contact support.`,
          code: 'ACCOUNT_BANNED',
        });
      }

      if (!account.is_active) {
        return res.status(403).json({
          error: 'This account has been deactivated. Contact support.',
          code: 'ACCOUNT_DEACTIVATED',
        });
      }

      req.userId = decoded.id;
      next();
    } catch (dbErr) {
      console.error('verifyToken account check error:', dbErr.message);
      return res.status(500).json({ error: 'Server error.' });
    }
  });
};


const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.userId = decoded.id;
    }
    next(); 
  });
};

module.exports = verifyToken;
module.exports.optionalVerifyToken = optionalVerifyToken;