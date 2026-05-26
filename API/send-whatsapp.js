// api/send-whatsapp.js – Sowmiya Travels WhatsApp Proxy via Fonnte.
const https = require('https');
const querystring = require('querystring');

// ── Fonnte token (hardcoded + env var fallback) ──────────────────────────────
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || 'QP4Hop3z3fEdzTv1sQiK';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, reason: 'Method not allowed' });
  }

  // ── Body parsing ─────────────────────────────────────────────────────────────
  let body = req.body;
  if (!body || Object.keys(body || {}).length === 0) {
    body = await new Promise((resolve) => {
      let raw = '';
      req.on('data', chunk => { raw += chunk.toString(); });
      req.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); }
        catch (e) { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const { target, message } = body;
  if (!target || !message) {
    return res.status(400).json({
      status: false,
      reason: 'Missing: ' + (!target ? 'target ' : '') + (!message ? 'message' : '')
    });
  }

  // ── Normalize Indian phone number ─────────────────────────────────────────
  let phone = String(target).replace(/[^\d]/g, '');
  if (phone.startsWith('0'))   phone = '91' + phone.slice(1);
  if (phone.length === 10)     phone = '91' + phone;
  if (phone.startsWith('091')) phone = phone.slice(1);

  console.log('[WA] Sending to:', phone, '| Msg:', message.slice(0, 60));

  // ── Call Fonnte ───────────────────────────────────────────────────────────
  const postData = querystring.stringify({
    target: phone,
    message: message,
    countryCode: '91',
    delay: '2',
    schedule: '0',
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'api.fonnte.com',
        path: '/send',
        method: 'POST',
        headers: {
          'Authorization': FONNTE_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (resp) => {
        let data = '';
        resp.on('data', c => { data += c; });
        resp.on('end', () => {
          console.log('[WA] Fonnte response:', data.slice(0, 300));
          try { resolve({ parsed: JSON.parse(data), raw: data }); }
          catch (e) { resolve({ parsed: null, raw: data }); }
        });
      });
      req2.setTimeout(20000, () => { req2.destroy(); reject(new Error('Fonnte timeout')); });
      req2.on('error', reject);
      req2.write(postData);
      req2.end();
    });

    const { parsed, raw } = result;

    if (!parsed) {
      return res.status(401).json({ status: false, reason: 'Fonnte non-JSON reply (bad token?): ' + raw.slice(0, 100) });
    }
    if (parsed.status === false || parsed.status === 'false' || parsed.status === 0) {
      return res.status(400).json({ status: false, reason: parsed.reason || parsed.message || 'Fonnte rejected' });
    }

    return res.status(200).json({ status: true, data: parsed });

  } catch (err) {
    console.error('[WA] Error:', err.message);
    return res.status(500).json({ status: false, reason: err.message });
  }
};
