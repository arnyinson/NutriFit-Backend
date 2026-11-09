// hCaptcha server-side check. The secret lives ONLY in the HCAPTCHA_SECRET env var.
const VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

// Returns { ok: true } or { ok: false, status, error }
const verifyCaptcha = async (token) => {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    console.error('HCAPTCHA_SECRET is not set - captcha check cannot run.');
    return { ok: false, status: 503, error: 'Verification is unavailable right now. Please try again later.' };
  }

  if (!token || typeof token !== 'string') {
    return { ok: false, status: 400, error: 'Please complete the captcha first.', code: 'CAPTCHA_REQUIRED' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }).toString(),
      signal: controller.signal,
    });
    const data = await res.json();
    if (data && data.success === true) return { ok: true };
    console.warn('hCaptcha rejected:', (data && data['error-codes']) || 'unknown');
    return { ok: false, status: 400, error: 'Captcha verification failed. Please try again.', code: 'CAPTCHA_FAILED' };
  } catch (err) {
    // hCaptcha unreachable: fail closed
    console.error('hCaptcha verify error:', err.message);
    return { ok: false, status: 503, error: 'Could not verify the captcha. Please try again.', code: 'CAPTCHA_UNAVAILABLE' };
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { verifyCaptcha };