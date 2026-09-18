const { Expo } = require('expo-server-sdk');
const pool = require('./database');

const expo = new Expo();

// Ipapadala ang push notification sa isa o maraming users
const sendPushNotification = async (pushTokens, title, body, data = {}) => {
  // I-filter lang ang mga valid na Expo push tokens
  const validTokens = pushTokens.filter((token) => token && Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.log('No valid push tokens to send to.');
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Push notification tickets:', ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
    }
  }
};

// ============================================
// SHARED: i-save sa database (para makita sa in-app Notifications screen)
// AT ipadala ang push notification (para makita kahit nakasara ang app).
// Ito ang gagamitin ng lahat ng triggers (ticket response, achievement, meal
// reminder) sa halip na direktang tumawag ng sendPushNotification lang.
// ============================================
const notifyUser = async (userId, title, message, type, pushToken) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type || 'system']
    );
  } catch (err) {
    console.error('Save notification to DB error:', err.message);
  }

  if (pushToken) {
    try {
      await sendPushNotification([pushToken], title, message, { type });
    } catch (err) {
      console.error('Send push notification error:', err.message);
    }
  }
};

module.exports = { sendPushNotification, notifyUser };