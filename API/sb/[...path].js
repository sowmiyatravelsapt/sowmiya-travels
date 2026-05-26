// Vercel serverless proxy — handles ALL methods (GET/POST/PATCH/PUT/DELETE) to Supabase
export const config = { api: { bodyParser: false } };

const SUPABASE_URL = 'https://lbvtibzcltkdqqofoqcx.supabase.co';

export default async function handler(req, res) {
  // In Vercel catch-all [...path], the path segments come in req.query.path
  // e.g. /api/sb/rest/v1/vehicles → req.query.path = ['rest','v1','vehicles']
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const pathStr = '/' + pathSegments.join('/');

  // Reconstruct query string (exclude 'path' param which is Vercel's internal)
  const queryParams = { ...req.query };
  delete queryParams.path;
  const qs = new URLSearchParams(queryParams).toString();
  const target = SUPABASE_URL + pathStr + (qs ? '?' + qs : '');

  // Forward all headers except host
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

    // Forward response headers
    upstream.headers.forEach((value, key) => {
      if (['transfer-encoding', 'connection'].includes(key.toLowerCase())) return;
      try { res.setHeader(key, value); } catch(e) {}
    });

    res.status(upstream.status);
    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error('[proxy] error:', err.message, '| target:', target);
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}
