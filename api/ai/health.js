const MODELS = {
  primary: 'gemini-3.6-flash',
  fast: 'gemini-3.5-flash-lite'
};

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    ''
  ).trim();
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const apiKey = getApiKey();
  const rawKey = process.env.GEMINI_API_KEY;
  const configured = Boolean(apiKey);
  const matchingKeys = Object.keys(process.env).filter((k) => /gemini|google/i.test(k));
  const keyInfo = {
    type: typeof rawKey,
    isUndefined: rawKey === undefined,
    isEmptyString: rawKey === '',
    length: typeof rawKey === 'string' ? rawKey.length : 0
  };

  return res.status(200).json({
    ok: true,
    service: 'juno-ai-gateway',
    configured,
    matchingKeys,
    keyInfo,
    models: MODELS,
    timestamp: new Date().toISOString()
  });
}

