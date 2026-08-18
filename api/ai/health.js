const MODELS = {
  primary: 'gemini-3.6-flash',
  fast: 'gemini-3.5-flash-lite'
};

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  return res.status(200).json({
    ok: true,
    service: 'juno-ai-gateway',
    configured: Boolean(process.env.GEMINI_API_KEY),
    models: MODELS,
    timestamp: new Date().toISOString()
  });
}
