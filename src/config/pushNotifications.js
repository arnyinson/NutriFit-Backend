const { Expo } = require('expo-server-sdk');

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

module.exports = { sendPushNotification };