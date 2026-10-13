function getApiKey() {
  const direct = (
    process.env.MILO_GEMINI_KEY ||
    process.env.JUNO_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');
  return direct;
}

export default async function handler(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'No key' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'What is 2+2?' }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const d = await resp.json();
    return res.status(resp.status).json({
      model: 'gemini-flash-latest',
      status: resp.status,
      data: d
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
