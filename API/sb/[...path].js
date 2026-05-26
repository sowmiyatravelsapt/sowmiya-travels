// Vercel serverless proxy — handles GET, POST, PATCH, PUT, DELETE to Supabase
export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://lbvtibzcltkdqqofoqcx.supabase.co';

export default async function handler(req, res) {
  // req.url = /api/sb/rest/v1/vehicles?select=*
  // Strip /api/sb to get /rest/v1/vehicles?select=*
  const path = req.url.replace(/^\/api\/sb/, '');
  const target = SUPABASE_URL + path;

  // Copy all headers except host
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'host') continue;
    headers[key] = value;
  }

  // Read raw body for mutating requests
  let body = undefined;
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    if (body.length === 0) body = undefined;
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    // Forward status and headers
    upstream.headers.forEach((value, key) => {
      if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    res.status(upstream.status);
    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('[proxy] error:', err.message);
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}
