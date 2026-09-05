const pool = require('./database');
require('dotenv').config();

const addOtpColumns = async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOL DEFAULT false');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code STRING');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_purpose STRING');
    console.log(' Added OTP-related columns to users table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addOtpColumns();