// Minimal public readiness endpoint for the Juno AI gateway.
// Never return environment-variable names, secret lengths, deployment metadata,
// model configuration, or raw provider error details from a public health route.
function getApiKey() {
  const direct = (
    process.env.JUNO_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  if (direct) return direct;

  if (process.env && typeof process.env === 'object') {
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === 'string' && /(?:gemini|juno|google).*key/i.test(key)) {
        const cleaned = value.trim().replace(/^["']|["']$/g, '');
        if (cleaned.length > 10) return cleaned;
      }
    }
  }

  return '';
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const configured = Boolean(getApiKey());
  const payload = {
    ok: configured,
    service: 'juno-ai-gateway',
    configured,
    timestamp: new Date().toISOString()
  };

  if (!configured) {
    // Readiness should fail until a server-side provider credential is present.
    return res.status(503).json({
      ...payload,
      error: 'AI provider is not configured.'
    });
  }

  return res.status(200).json(payload);
}
