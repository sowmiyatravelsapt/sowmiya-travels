// ─────────────────────────────────────────────────────────────────────────────
// api/send-whatsapp.js  –  Sowmiya Travels
// Vercel serverless function that proxies calls to Fonnte WhatsApp API.
//
// WHY THIS FILE EXISTS:
//   Browsers block direct fetch() calls to api.fonnte.com due to CORS policy.
//   This server-side function has no CORS restrictions and keeps your token secret.
//
// ENVIRONMENT VARIABLE (set in Vercel dashboard):
//   FONNTE_TOKEN = your Fonnte API token
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, reason: 'Method not allowed' });
  }

  // CORS headers so index.html can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { target, message } = req.body;

  // Validate inputs
  if (!target || !message) {
    return res.status(400).json({ status: false, reason: 'Missing target or message' });
  }

  // Get token from environment variable (set in Vercel dashboard)
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.error('[send-whatsapp] FONNTE_TOKEN env var is not set');
    return res.status(500).json({ status: false, reason: 'Server config error: FONNTE_TOKEN missing' });
  }

  // Normalize phone number
  let clean = target.replace(/[\s\-\(\)\+]/g, '');
  if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (!clean.startsWith('91') && clean.length === 10) clean = '91' + clean;

  try {
    const form = new URLSearchParams();
    form.append('target', clean);
    form.append('message', message);
    form.append('countryCode', '91');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await response.json();
    console.log('[send-whatsapp] Fonnte response:', JSON.stringify(data));

    if (data.status === false || data.status === 'false') {
      // Fonnte returned an error
      return res.status(400).json({
        status: false,
        reason: data.reason || data.message || 'Fonnte rejected the request',
        raw: data,
      });
    }

    return res.status(200).json({ status: true, data });
  } catch (err) {
    console.error('[send-whatsapp] Fetch error:', err.message);
    return res.status(500).json({ status: false, reason: err.message });
  }
}
