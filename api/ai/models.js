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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Explain SQL joins with an example.' }] }]
      })
    });
    const data = await response.json();
    return res.status(200).json({
      status: response.status,
      data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
