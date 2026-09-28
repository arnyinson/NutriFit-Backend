const cron = require('node-cron');
const pool = require('./database');
const { notifyUser } = require('./pushNotifications');

// Rest days ng fixed weekly split (dapat tumugma sa recommend.py)
const REST_DAYS = ['Wednesday', 'Sunday'];

const getPhilippineNow = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

// Kinukuha ang Monday ng kasalukuyang linggo (Philippine Time)
const getCurrentWeekMonday = () => {
  const phTime = getPhilippineNow();
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

const getTodayDayName = () =>
  getPhilippineNow().toLocaleDateString('en-US', { weekday: 'long' });

// Ipinapadala ang reminder sa:
// 1. mga user na may pending (done = false) na exercise ngayong araw, O
// 2. mga user na wala pang plan ngayong linggo (hindi pa nagbubukas ng app)
//    PERO may plan noong nakaraang linggo (regular na user, hindi dormant),
//    basta training day ito at hindi Rest Day
const sendWorkoutReminder = async () => {
  try {
    const monday = getCurrentWeekMonday();
    const weekStart = formatLocalDate(monday);
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevWeekStart = formatLocalDate(prevMonday);
    const todayDayName = getTodayDayName();
    const isTrainingDay = !REST_DAYS.includes(todayDayName);

    const result = await pool.query(
      `SELECT u.id, u.push_token
       FROM users u
       WHERE u.is_active = true
         AND (
           EXISTS (
             SELECT 1 FROM workout_plans wp
             WHERE wp.user_id = u.id
               AND wp.week_start = $1
               AND wp.day = $2
               AND wp.done = false
           )
           OR (
             $3::BOOL = true
             AND NOT EXISTS (
               SELECT 1 FROM workout_plans wp
               WHERE wp.user_id = u.id
                 AND wp.week_start = $1
             )
             AND EXISTS (
               SELECT 1 FROM workout_plans wp
               WHERE wp.user_id = u.id
                 AND wp.week_start = $4
             )
           )
         )`,
      [weekStart, todayDayName, isTrainingDay, prevWeekStart]
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