const pool = require('./database');
require('dotenv').config();

const addTicketImageColumn = async () => {
  try {
    await pool.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS image_url TEXT');
    console.log('Added image_url column to tickets table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

addTicketImageColumn();