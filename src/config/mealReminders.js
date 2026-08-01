const cron = require('node-cron');
const pool = require('./database');
const { sendPushNotification } = require('./pushNotifications');

// Ipinapadala ang reminder sa lahat ng users na may push token
const sendMealReminder = async (mealType, message) => {
  try {
    const result = await pool.query(
      "SELECT push_token FROM users WHERE push_token IS NOT NULL AND is_active = true"
    );

    const tokens = result.rows.map((r) => r.push_token).filter(Boolean);

    if (tokens.length === 0) {
      console.log(`No push tokens found for ${mealType} reminder.`);
      return;
    }

    await sendPushNotification(
      tokens,
      `🍽️ ${mealType} Time!`,
      message,
      { type: 'meal_reminder', meal_type: mealType }
    );

    console.log(`${mealType} reminder sent to ${tokens.length} user(s).`);
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