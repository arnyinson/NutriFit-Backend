const cron = require('node-cron');
const pool = require('./database');
const { notifyUser } = require('./pushNotifications');

// Kinukuha ang Monday ng kasalukuyang linggo (Philippine Time)
const getCurrentWeekMonday = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const dayOfWeek = phTime.getDay();
  const monday = new Date(phTime.getFullYear(), phTime.getMonth(), phTime.getDate());
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return monday;
};

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDayName = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toLocaleDateString('en-US', { weekday: 'long' });
};

// Ipinapadala lang ang reminder sa mga users na may naka-schedule na workout
// ngayong araw (hindi Rest Day) at hindi pa nila na-mark bilang tapos
const sendWorkoutReminder = async () => {
  try {
    const monday = getCurrentWeekMonday();
    const weekStart = formatLocalDate(monday);
    const todayDayName = getTodayDayName();

    // Hanapin ang mga users na may kahit isang exercise ngayong araw na hindi pa "done"
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.push_token
       FROM users u
       JOIN workout_plans wp ON wp.user_id = u.id
       WHERE u.is_active = true
         AND wp.week_start = $1
         AND wp.day = $2
         AND wp.done = false`,
      [weekStart, todayDayName]
    );

    if (result.rows.length === 0) {
      console.log('No users with a pending workout today.');
      return;
    }

    for (const user of result.rows) {
      await notifyUser(
        user.id,
        '💪 Workout Time!',
        `You have a workout scheduled for today. Let's keep the streak going!`,
        'workout',
        user.push_token
      );
    }

    console.log(`Workout reminder sent to ${result.rows.length} user(s).`);
  } catch (err) {
    console.error('Error sending workout reminder:', err.message);
  }
};

// Isang beses lang bawat araw, 5:00 PM Philippine Time
const initWorkoutReminders = () => {
  cron.schedule('0 17 * * *', () => {
    sendWorkoutReminder();
  }, { timezone: 'Asia/Manila' });

  console.log('✅ Workout reminder cron job initialized (5PM Philippine Time).');
};

module.exports = { initWorkoutReminders };