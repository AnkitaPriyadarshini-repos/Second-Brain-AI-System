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
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-pro-latest', 'gemma-4-31b-it'];
    for (const m of modelsToTry) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'What is 2+2?' }] }]
        })
      });
      const d = await resp.json();
      if (resp.status === 200) {
        return res.status(200).json({
          workingModel: m,
          status: 200,
          answer: d?.candidates?.[0]?.content?.parts?.[0]?.text
        });
      }
    }
    return res.status(503).json({ error: 'All tested flash-lite models were unavailable' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
