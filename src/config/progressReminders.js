const cron = require('node-cron');
const pool = require('./database');
const { notifyUser } = require('./pushNotifications');

const DAYS_WITHOUT_UPDATE_THRESHOLD = 3;

// Trigger 2: "Hindi pa nag-a-update ng progress sa loob ng ilang araw" —
// hinahanap ang mga active users na WALANG weight entry sa loob ng
// DAYS_WITHOUT_UPDATE_THRESHOLD na araw, magpapadala ng paalala
const sendProgressReminders = async () => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.push_token
       FROM users u
       WHERE u.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM progress p
           WHERE p.user_id = u.id
             AND p.weight IS NOT NULL
             AND p.date >= current_date() - $1::int
         )`,
      [DAYS_WITHOUT_UPDATE_THRESHOLD]
    );

    if (result.rows.length === 0) {
      console.log('No users need a progress update reminder.');
      return;
    }

    for (const user of result.rows) {
      await notifyUser(
        user.id,
        '📊 Time for a Progress Check-in!',
        `You haven't logged your weight in a few days. Update your progress to keep your plan accurate.`,
        'progress',
        user.push_token
      );
    }

    console.log(`Progress reminder sent to ${result.rows.length} user(s).`);
  } catch (err) {
    console.error('Error sending progress reminders:', err.message);
  }
};

// Isang beses lang bawat araw, 8:00 PM Philippine Time
const initProgressReminders = () => {
  cron.schedule('0 20 * * *', () => {
    sendProgressReminders();
  }, { timezone: 'Asia/Manila' });

  console.log('✅ Progress reminder cron job initialized (8PM Philippine Time).');
};

module.exports = { initProgressReminders };