// api/send-whatsapp.js – Sowmiya Travels WhatsApp Proxy
// FIX: Robust body parsing for Vercel, token fallback from body, better error messages
const https = require('https');
const querystring = require('querystring');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: false, reason: 'Method not allowed' });

  // FIX 1: Robust body parsing — Vercel may pass raw string, object, or nothing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  } else if (!body || typeof body !== 'object') {
    // Read raw stream as fallback (Vercel Edge / misconfigured)
    try {
      body = await new Promise((resolve) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); }
          catch(e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
      });
    } catch(e) { body = {}; }
  }

  const { target, message, token: bodyToken } = body;
  if (!target || !message) {
    return res.status(400).json({ status: false, reason: 'Missing target or message' });
  }

  // FIX 2: Accept token from env var OR from request body (fallback for when env var is not set)
  const token = process.env.FONNTE_TOKEN || bodyToken;
  if (!token) {
    return res.status(500).json({
      status: false,
      reason: 'FONNTE_TOKEN not configured. Set it in Vercel → Project → Settings → Environment Variables as FONNTE_TOKEN'
    });
  }

  // FIX 3: Normalize Indian phone number — strip ALL non-digits including +91 prefix duplicates
  let clean = String(target).replace(/[^\d]/g, ''); // strip everything except digits
  if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (clean.startsWith('91') && clean.length === 12) { /* already correct */ }
  else if (clean.length === 10) clean = '91' + clean;
  // If already 91XXXXXXXXXX (12 digits), leave as-is

  console.log('[send-whatsapp] Sending to:', clean, '| Message length:', message.length);

  const postData = querystring.stringify({ target: clean, message, countryCode: '91' });

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.fonnte.com',
        path: '/send',
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          console.log('[send-whatsapp] Fonnte raw response:', data.slice(0, 300));
          try { resolve(JSON.parse(data)); }
          catch(e) { resolve({ status: false, reason: 'Fonnte non-JSON response: ' + data.slice(0, 100) }); }
        });
      });
      request.on('error', (err) => {
        console.error('[send-whatsapp] HTTPS error:', err.message);
        reject(err);
      });
      request.setTimeout(15000, () => {
        request.destroy();
        reject(new Error('Fonnte API timeout after 15s'));
      });
      request.write(postData);
      request.end();
    });

    console.log('[send-whatsapp] Fonnte result:', JSON.stringify(result));

    // FIX 4: Fonnte returns status as boolean false OR string "false"
    if (result.status === false || result.status === 'false' || result.status === 0) {
      return res.status(400).json({
        status: false,
        reason: result.reason || result.message || result.detail || 'Fonnte rejected the request'
      });
    }
    return res.status(200).json({ status: true, data: result });

  } catch (err) {
    console.error('[send-whatsapp] Error:', err.message);
    return res.status(500).json({ status: false, reason: 'Proxy error: ' + err.message });
  }
};
