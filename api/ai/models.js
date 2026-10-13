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
    const candidates = [
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-pro-latest',
      'gemini-3.6-flash'
    ];

    const results = [];
    for (const model of candidates) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'What is 2+2?' }] }]
          })
        });
        const d = await resp.json();
        const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        results.push({
          model,
          status: resp.status,
          success: resp.status === 200,
          text: text ? text.slice(0, 50) : null,
          error: d?.error?.message || null
        });
        if (resp.status === 200) {
          break; // Found working model!
        }
      } catch (e) {
        results.push({ model, error: e.message });
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
