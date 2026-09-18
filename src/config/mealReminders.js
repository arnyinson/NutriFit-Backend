const cron = require('node-cron');
const pool = require('./database');
const { notifyUser } = require('./pushNotifications');

// Ipinapadala ang reminder sa lahat ng active users — kada user, i-save sa DB
// at ipadala ang push (kung meron itong push token)
const sendMealReminder = async (mealType, message) => {
  try {
    const result = await pool.query(
      "SELECT id, push_token FROM users WHERE is_active = true"
    );

    if (result.rows.length === 0) {
      console.log(`No active users found for ${mealType} reminder.`);
      return;
    }

    for (const user of result.rows) {
      await notifyUser(
        user.id,
        `🍽️ ${mealType} Time!`,
        message,
        'meal',
        user.push_token
      );
    }

    console.log(`${mealType} reminder sent to ${result.rows.length} user(s).`);
  } catch (err) {
    console.error(`Error sending ${mealType} reminder:`, err.message);
  }
};

// I-setup ang lahat ng scheduled reminders (Philippine Time, UTC+8)
// Ang node-cron ay gumagamit ng server timezone bilang default, kaya i-specify natin ang 'timezone' option
const initMealReminders = () => {
  // Breakfast — 7:00 AM
  cron.schedule('0 7 * * *', () => {
    sendMealReminder('Breakfast', 'Good morning! Don\'t forget to log your breakfast today.');
  }, { timezone: 'Asia/Manila' });

  // Lunch — 12:00 PM
  cron.schedule('0 12 * * *', () => {
    sendMealReminder('Lunch', 'It\'s lunch time! Check your meal plan for today.');
  }, { timezone: 'Asia/Manila' });

  // Dinner — 6:00 PM
  cron.schedule('0 18 * * *', () => {
    sendMealReminder('Dinner', 'Dinner time! Remember to log your meal in NutriFit.');
  }, { timezone: 'Asia/Manila' });

  console.log('✅ Meal reminder cron jobs initialized (Breakfast 7AM, Lunch 12PM, Dinner 6PM - Philippine Time).');
};

module.exports = { initMealReminders };