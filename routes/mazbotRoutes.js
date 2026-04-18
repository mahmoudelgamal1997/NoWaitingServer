/**
 * MazBot WhatsApp Business (template) — server-side only.
 * MazBot HTTP API reference: https://api.mazbot.net/ (login + POST /whatsapp/send-template).
 *
 * GET /api/mazbot/health — returns 200 when this route is deployed (use to verify Heroku).
 *
 * POST /api/mazbot/send-prescription  (multipart/form-data)
 *   - pdf: file (application/pdf)
 *   - mobile: digits with country code, e.g. 2010...
 *   - patient_name: optional
 *
 * The PDF is stored briefly on this server under /uploads/mazbot-temp/ so the public HTTPS URL
 * can be passed into your MazBot template (WhatsApp Business requires a reachable URL for
 * link/document templates — this is not Firebase).
 *
 * Env:
 *   MAZBOT_API_KEY, MAZBOT_EMAIL, MAZBOT_PASSWORD
 *   MAZBOT_PRESCRIPTION_TEMPLATE_ID
 *   MAZBOT_TEMPLATE_SLOTS=1|2  (default 2: {{1}} link, {{2}} name)
 *   PUBLIC_API_BASE_URL  optional, e.g. https://your-app.herokuapp.com  (if req host is wrong behind CDN)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { isConfigured, sendTemplate } = require('../services/mazbotClient');

const tempDir = path.join(__dirname, '../uploads/mazbot-temp');
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const safe = `${uuidv4()}.pdf`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || (file.originalname || '').toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

function normalizeMobile(m) {
  return String(m || '').replace(/\D/g, '');
}

/** GET /api/mazbot/health — confirms route is live; does not call MazBot. */
router.get('/mazbot/health', (req, res) => {
  res.json({
    success: true,
    mazbotConfigured: isConfigured(),
    sendTemplatePath: `${(process.env.MAZBOT_BASE_URL || 'https://mazbot.net/api').replace(/\/$/, '')}/whatsapp/send-template`,
    documentation: 'https://api.mazbot.net/',
  });
});

function buildPlaceholderPayload(pdfUrl, patientName) {
  const slots = Math.min(3, Math.max(1, parseInt(process.env.MAZBOT_TEMPLATE_SLOTS || '2', 10) || 2));
  const body_values = {};
  const body_matchs = {};
  if (slots >= 1) {
    body_values['1'] = pdfUrl;
    body_matchs['1'] = 'input_value';
  }
  if (slots >= 2) {
    body_values['2'] = patientName || '';
    body_matchs['2'] = 'input_value';
  }
  return { body_values, body_matchs };
}

/** Public base URL for files WhatsApp servers must fetch (HTTPS). */
function publicOrigin(req) {
  const fromEnv = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

router.post('/mazbot/send-prescription', upload.single('pdf'), async (req, res) => {
  let filePath = req.file?.path;

  const cleanup = () => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('[MazBot] temp file cleanup:', e.message);
      }
    }
  };

  try {
    if (!isConfigured()) {
      cleanup();
      return res.status(503).json({
        success: false,
        message:
          'MazBot is not configured on this server. Set MAZBOT_API_KEY, MAZBOT_EMAIL, MAZBOT_PASSWORD, MAZBOT_PRESCRIPTION_TEMPLATE_ID.',
      });
    }

    const templateId = process.env.MAZBOT_PRESCRIPTION_TEMPLATE_ID;
    if (!templateId) {
      cleanup();
      return res.status(503).json({
        success: false,
        message: 'MAZBOT_PRESCRIPTION_TEMPLATE_ID is not set.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing PDF file (field name: pdf).',
      });
    }

    const mobile = normalizeMobile(req.body.mobile);
    if (!mobile || mobile.length < 8) {
      cleanup();
      return res.status(400).json({ success: false, message: 'Valid mobile (with country code) is required.' });
    }

    const patient_name = req.body.patient_name ? String(req.body.patient_name).trim() : '';
    const origin = publicOrigin(req);
    const pdfUrl = `${origin}/uploads/mazbot-temp/${path.basename(req.file.path)}`;

    const { body_values, body_matchs } = buildPlaceholderPayload(pdfUrl, patient_name);

    const result = await sendTemplate({
      template_id: String(templateId),
      mobile,
      body_values,
      body_matchs,
    });

    cleanup();

    return res.json({
      success: true,
      data: result.data || result,
    });
  } catch (err) {
    cleanup();
    console.error('[MazBot] send-prescription:', err.message);
    const status = err.status === 429 ? 429 : 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'MazBot send failed',
    });
  }
});

module.exports = router;
