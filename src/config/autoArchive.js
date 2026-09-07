const cron = require('node-cron');
const pool = require('./database');

const ARCHIVE_AFTER_DAYS = 30;

const runArchiveCheck = async () => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET archived = true
       WHERE archived = false
         AND last_login < now() - INTERVAL '${ARCHIVE_AFTER_DAYS} days'
       RETURNING username`,
      []
    );

    if (result.rows.length > 0) {
      console.log(`Auto-archived ${result.rows.length} inactive user(s):`, result.rows.map(r => r.username));
    } else {
      console.log('Auto-archive check: no users to archive.');
    }
  } catch (err) {
    console.error('Auto-archive error:', err.message);
  }
};

const initAutoArchive = () => {
  // Run once daily at 2:00 AM Philippine Time
  cron.schedule('0 2 * * *', () => {
    runArchiveCheck();
  }, { timezone: 'Asia/Manila' });

  console.log('✅ Auto-archive cron job initialized (daily at 2AM Philippine Time).');
};

module.exports = { initAutoArchive };