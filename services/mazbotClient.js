/**
 * MazBot — JWT login + WhatsApp template send.
 * Docs: https://api.mazbot.net/  (POST /login, POST /whatsapp/send-template)
 * Credentials only via environment variables (never commit).
 */

const MAZBOT_BASE = (process.env.MAZBOT_BASE_URL || 'https://mazbot.net/api').replace(/\/$/, '');

let cachedToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  return !!(process.env.MAZBOT_API_KEY && process.env.MAZBOT_EMAIL && process.env.MAZBOT_PASSWORD);
}

async function login() {
  const apiKey = process.env.MAZBOT_API_KEY;
  const email = process.env.MAZBOT_EMAIL;
  const password = process.env.MAZBOT_PASSWORD;
  if (!apiKey || !email || !password) {
    throw new Error('MazBot is not configured (MAZBOT_API_KEY, MAZBOT_EMAIL, MAZBOT_PASSWORD)');
  }

  const body = new URLSearchParams();
  body.set('email', email);
  body.set('password', password);

  const res = await fetch(`${MAZBOT_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apiKey,
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.data?.token) {
    throw new Error(data.message || `MazBot login failed (${res.status})`);
  }

  cachedToken = data.data.token;
  // Refresh before typical JWT expiry (assume ~24h; refresh at 20h)
  tokenExpiresAt = Date.now() + 20 * 60 * 60 * 1000;
  return cachedToken;
}

async function getJwt() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return login();
}

/**
 * @param {object} payload - { template_id, mobile, body_values?, body_matchs? }
 */
async function sendTemplate(payload) {
  const apiKey = process.env.MAZBOT_API_KEY;
  const token = await getJwt();

  const res = await fetch(`${MAZBOT_BASE}/whatsapp/send-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const err = new Error('MazBot rate limit (60/min). Try again shortly.');
    err.status = 429;
    throw err;
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `MazBot send failed (${res.status})`);
  }
  return data;
}

module.exports = {
  isConfigured,
  sendTemplate,
  getJwt,
};
