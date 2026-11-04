const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Gumawa ng random 6-digit na OTP code
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Ipadala ang OTP sa email ng user
const sendOtpEmail = async (toEmail, otpCode, purpose) => {
  const subject =
    purpose === 'registration'
      ? 'Verify your NutriFit account'
      : 'Reset your NutriFit password';

  const heading =
    purpose === 'registration'
      ? 'Welcome to NutriFit!'
      : 'Password Reset Request';

  const bodyText =
    purpose === 'registration'
      ? 'Use the code below to verify your email and activate your account.'
      : 'Use the code below to reset your password.';

  try {
    const result = await resend.emails.send({
      from: 'NutriFit <noreply@nutrifitcapstone.xyz>',
      to: toEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4CAF50;">${heading}</h2>
          <p style="color: #333; font-size: 14px;">${bodyText}</p>
          <div style="background: #f0faf0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${otpCode}</span>
          </div>
          <p style="color: #888; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    return result;
  } catch (err) {
    console.error('Send OTP email error:', err.message);
    throw err;
  }
};

// Keeps names / ban reasons typed by admins or users from breaking the email HTML
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// Email copy for each account status change
const ACCOUNT_EMAILS = {
  banned: {
    subject: 'Your NutriFit account has been banned',
    heading: 'Account banned',
    color: '#E53935',
    body: 'Your NutriFit account has been banned and you can no longer log in.',
    showReason: true,
    footer: 'If you believe this is a mistake, please contact support.',
  },
  unbanned: {
    subject: 'Your NutriFit account has been restored',
    heading: 'Account restored',
    color: '#4CAF50',
    body: 'Your NutriFit account has been unbanned. You can log in again.',
    footer: 'Welcome back!',
  },
  deactivated: {
    subject: 'Your NutriFit account has been deactivated',
    heading: 'Account deactivated',
    color: '#FF9800',
    body: 'Your NutriFit account has been deactivated by an administrator. You will not be able to log in until it is activated again.',
    footer: 'If you believe this is a mistake, please contact support.',
  },
  activated: {
    subject: 'Your NutriFit account has been activated',
    heading: 'Account activated',
    color: '#4CAF50',
    body: 'Your NutriFit account has been activated. You can log in again.',
    footer: 'Welcome back!',
  },
  archived: {
    subject: 'Your NutriFit account has been archived',
    heading: 'Account archived',
    color: '#FF9800',
    body: 'Your NutriFit account was archived because you have not logged in for 30 days. Your data is safe and nothing was deleted.',
    footer: 'Log in again to restore your account.',
  },
  unarchived: {
    subject: 'Your NutriFit account has been restored',
    heading: 'Account restored',
    color: '#4CAF50',
    body: 'Your NutriFit account has been restored from the archive.',
    footer: 'Welcome back!',
  },
};

// Tells the user that their account status changed. It never throws:
// if the email cannot be sent, the ban / status change must still go through.
const sendAccountStatusEmail = async (toEmail, name, kind, reason) => {
  const copy = ACCOUNT_EMAILS[kind];
  if (!copy || !toEmail) return null;

  try {
    return await resend.emails.send({
      from: 'NutriFit <noreply@nutrifitcapstone.xyz>',
      to: toEmail,
      subject: copy.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: ${copy.color};">${copy.heading}</h2>
          <p style="color: #333; font-size: 14px;">Hi ${escapeHtml(name || 'there')},</p>
          <p style="color: #333; font-size: 14px;">${copy.body}</p>
          ${
            copy.showReason && reason
              ? `<div style="background: #fff5f5; border-radius: 12px; padding: 16px; margin: 20px 0;">
                   <p style="margin: 0; color: #888; font-size: 12px;">Reason</p>
                   <p style="margin: 4px 0 0; color: #333; font-size: 14px;">${escapeHtml(reason)}</p>
                 </div>`
              : ''
          }
          <p style="color: #888; font-size: 12px;">${copy.footer}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Send account status email error:', err.message);
    return null;
  }
};

module.exports = { generateOtp, sendOtpEmail, sendAccountStatusEmail };