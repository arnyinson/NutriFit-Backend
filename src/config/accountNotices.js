const { notifyUser } = require('./pushNotifications');
const { sendAccountStatusEmail } = require('./emailService');

// In-app notification + push text for each account status change
const NOTICES = {
  banned: (reason) => ({
    title: 'Account banned',
    body: `Your account has been banned. Reason: ${reason || 'Violation of the Terms and Conditions'}. If you believe this is a mistake, please contact support.`,
  }),
  unbanned: () => ({
    title: 'Account restored',
    body: 'Your account has been unbanned. You can log in again.',
  }),
  deactivated: () => ({
    title: 'Account deactivated',
    body: 'Your account has been deactivated by an administrator. You will not be able to log in until it is activated again.',
  }),
  activated: () => ({
    title: 'Account activated',
    body: 'Your account has been activated. You can log in again.',
  }),
  archived: () => ({
    title: 'Account archived',
    body: 'Your account was archived after 30 days without logging in. Your data is safe. Log in again to restore it.',
  }),
  unarchived: () => ({
    title: 'Account restored',
    body: 'Your account has been restored from the archive.',
  }),
};

// Tells the user their account status changed: in-app notification + push + email.
// `user` needs { id, name, email, push_token }. Each channel is tried on its own and
// never throws, so a failed push or email can never undo the admin's action.
const notifyAccountChange = async (user, kind, reason) => {
  const make = NOTICES[kind];
  if (!user || !make) return;
  const { title, body } = make(reason);

  try {
    await notifyUser(user.id, title, body, 'system', user.push_token);
  } catch (err) {
    console.error('Account notice (push) error:', err.message);
  }

  try {
    await sendAccountStatusEmail(user.email, user.name, kind, reason);
  } catch (err) {
    console.error('Account notice (email) error:', err.message);
  }
};

module.exports = { notifyAccountChange };