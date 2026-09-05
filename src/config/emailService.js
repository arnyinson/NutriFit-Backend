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
      from: 'NutriFit <onboarding@resend.dev>',
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

module.exports = { generateOtp, sendOtpEmail };