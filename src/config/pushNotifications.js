const { Expo } = require('expo-server-sdk');
const pool = require('./database');

const expo = new Expo();

// Ipapadala ang push notification sa isa o maraming users
const sendPushNotification = async (pushTokens, title, body, data = {}) => {
  const validTokens = pushTokens.filter((token) => token && Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.log('No valid push tokens to send to.');
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    channelId: 'default', // matches the Android channel created in the app
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
// SHARED: save to DB (in-app Notifications screen) AND send push.
// `extra` is optional, e.g. { ticket_id } — saved in notifications.ticket_id
// and included in the push `data` so the app can open the right screen on tap.
// ============================================
const notifyUser = async (userId, title, message, type, pushToken, extra = {}) => {
  const ticketId = extra.ticket_id ? String(extra.ticket_id) : null;

  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, ticket_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, message, type || 'system', ticketId]
    );
  } catch (err) {
    // 42703 = column does not exist (migration not run yet) -> fall back
    if (err.code === '42703') {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, $4)`,
          [userId, title, message, type || 'system']
        );
      } catch (err2) {
        console.error('Save notification to DB error:', err2.message);
      }
    } else {
      console.error('Save notification to DB error:', err.message);
    }
  }

  if (pushToken) {
    try {
      await sendPushNotification([pushToken], title, message, { type, ...extra });
    } catch (err) {
      console.error('Send push notification error:', err.message);
    }
  }
};

module.exports = { sendPushNotification, notifyUser };