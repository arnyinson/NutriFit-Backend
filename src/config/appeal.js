const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Short-lived token given to a banned user so they can send ONE appeal without
// being logged in. It is NOT a login token (purpose = 'appeal'); the normal
// auth middleware rejects it.
const makeAppealToken = (userId) =>
  jwt.sign({ id: userId, purpose: 'appeal' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const readAppealToken = (token) => {
  try {
    const decoded = jwt.verify(String(token || ''), process.env.JWT_SECRET);
    return decoded && decoded.purpose === 'appeal' ? decoded : null;
  } catch {
    return null;
  }
};

// Banned users cannot open the app, so the admin's reply goes to their email.
// Never throws.
const sendAppealReplyEmail = async (toEmail, name, reply) => {
  if (!toEmail || !reply) return null;
  try {
    return await resend.emails.send({
      from: 'NutriFit <noreply@nutrifitcapstone.xyz>',
      to: toEmail,
      subject: 'Reply to your NutriFit account appeal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4CAF50;">Reply to your appeal</h2>
          <p style="color: #333; font-size: 14px;">Hi ${escapeHtml(name || 'there')},</p>
          <p style="color: #333; font-size: 14px;">An admin has reviewed your account appeal:</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin: 20px 0; white-space: pre-line; color: #333; font-size: 14px;">${escapeHtml(reply)}</div>
          <p style="color: #888; font-size: 12px;">If your account was restored, you can log in to NutriFit again. This is an automated message, please do not reply.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Send appeal reply email error:', err.message);
    return null;
  }
};

// Result of an appeal (approved / not approved) with the admin's note.
// `kind` is 'ban' or 'deactivation'. Never throws.
const sendAppealDecisionEmail = async (toEmail, name, approved, note, kind) => {
  if (!toEmail) return null;
  const what = kind === 'deactivation' ? 'account deactivation' : 'account ban';
  const heading = approved ? 'Your appeal was approved' : 'Your appeal was not approved';
  const color = approved ? '#4CAF50' : '#F44336';
  const intro = approved
    ? `Good news! An admin reviewed your appeal about your ${what} and your account has been restored. You can log in to NutriFit again.`
    : `An admin reviewed your appeal about your ${what}, but we are unable to restore your account. This decision is final.`;
  try {
    return await resend.emails.send({
      from: 'NutriFit <noreply@nutrifitcapstone.xyz>',
      to: toEmail,
      subject: approved ? 'Your NutriFit appeal was approved' : 'Your NutriFit appeal was not approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: ${color};">${heading}</h2>
          <p style="color: #333; font-size: 14px;">Hi ${escapeHtml(name || 'there')},</p>
          <p style="color: #333; font-size: 14px;">${intro}</p>
          ${
            note
              ? `<div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin: 20px 0;">
                   <p style="margin: 0; color: #888; font-size: 12px;">Message from the admin</p>
                   <p style="margin: 4px 0 0; color: #333; font-size: 14px; white-space: pre-line;">${escapeHtml(note)}</p>
                 </div>`
              : ''
          }
          <p style="color: #888; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Send appeal decision email error:', err.message);
    return null;
  }
};

module.exports = { makeAppealToken, readAppealToken, sendAppealReplyEmail, sendAppealDecisionEmail };