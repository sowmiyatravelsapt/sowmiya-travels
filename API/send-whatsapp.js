// api/send-whatsapp.js  –  Sowmiya Travels WhatsApp Proxy
// Uses CommonJS (module.exports) and built-in https module for max Vercel compatibility.

const https = require('https');
const querystring = require('querystring');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, reason: 'Method not allowed' });
  }

  const { target, message } = req.body || {};

  if (!target || !message) {
    return res.status(400).json({ status: false, reason: 'Missing target or message' });
  }

  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return res.status(500).json({ status: false, reason: 'FONNTE_TOKEN env variable not set in Vercel' });
  }

  // Normalize Indian phone number
  let clean = String(target).replace(/[\s\-\(\)\+]/g, '');
  if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (!clean.startsWith('91') && clean.length === 10) clean = '91' + clean;

  const postData = querystring.stringify({
    target: clean,
    message: message,
    countryCode: '91',
  });

  try {
    const fonnteResponse = await new Promise((resolve, reject) => {
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

      const req = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: response.statusCode, body: { raw: body } });
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('[send-whatsapp] Fonnte status:', fonnteResponse.status, 'body:', JSON.stringify(fonnteResponse.body));

    if (fonnteResponse.body.status === false || fonnteResponse.body.status === 'false') {
      return res.status(400).json({
        status: false,
        reason: fonnteResponse.body.reason || fonnteResponse.body.message || 'Fonnte rejected the request',
      });
    }

    return res.status(200).json({ status: true, data: fonnteResponse.body });

  } catch (err) {
    console.error('[send-whatsapp] Error:', err.message);
    return res.status(500).json({ status: false, reason: err.message });
  }
};
