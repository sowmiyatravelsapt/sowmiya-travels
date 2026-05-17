// api/send-whatsapp.js – Sowmiya Travels WhatsApp Proxy
const https = require('https');
const querystring = require('querystring');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: false, reason: 'Method not allowed' });

  // Parse body manually in case Vercel doesn't auto-parse it
  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch(e) { body = {}; }
  }

  const { target, message } = body;
  if (!target || !message) {
    return res.status(400).json({ status: false, reason: 'Missing target or message' });
  }

  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return res.status(500).json({ status: false, reason: 'FONNTE_TOKEN not set in Vercel environment variables' });
  }

  // Normalize Indian phone number
  let clean = String(target).replace(/[\s\-\(\)\+]/g, '');
  if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (!clean.startsWith('91') && clean.length === 10) clean = '91' + clean;

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
          try { resolve(JSON.parse(data)); }
          catch(e) { resolve({ status: false, reason: 'Fonnte returned non-JSON: ' + data.slice(0, 100) }); }
        });
      });
      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    console.log('[send-whatsapp] Fonnte result:', JSON.stringify(result));

    if (result.status === false || result.status === 'false') {
      return res.status(400).json({ status: false, reason: result.reason || result.message || 'Fonnte rejected' });
    }
    return res.status(200).json({ status: true, data: result });

  } catch (err) {
    console.error('[send-whatsapp] Error:', err.message);
    return res.status(500).json({ status: false, reason: err.message });
  }
};
