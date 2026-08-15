const MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'AI service is not configured. Add GEMINI_API_KEY to the Vercel Production environment.'
    });
  }

  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const history = Array.isArray(body.history) ? body.history : [];

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required.' });
  }

  if (prompt.length > 12000) {
    return res.status(413).json({ success: false, error: 'Message is too long.' });
  }

  const safeHistory = history
    .filter((item) => item && (item.role === 'user' || item.role === 'model') && typeof item.content === 'string')
    .slice(-20)
    .map((item) => ({
      role: item.role,
      parts: [{ text: item.content.slice(0, 12000) }]
    }));

  safeHistory.push({ role: 'user', parts: [{ text: prompt }] });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are Juno AI, a helpful personal AI assistant. Answer directly, accurately and naturally. Use clear Markdown when useful. Never claim to have searched a source or used a tool unless the application actually provided that source or tool result.'
            }]
          },
          contents: safeHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        }),
        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage = data?.error?.message || `Gemini returned HTTP ${response.status}`;
      console.error('[ai/gateway] Provider error:', response.status, providerMessage);
      return res.status(response.status === 429 ? 429 : 502).json({
        success: false,
        error: response.status === 429
          ? 'The AI service is temporarily rate-limited. Please try again shortly.'
          : 'The AI service could not complete this request.'
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part?.text === 'string')
      ?.map((part) => part.text)
      ?.join('')
      ?.trim();

    if (!answer) {
      console.error('[ai/gateway] Empty model response');
      return res.status(502).json({ success: false, error: 'The AI service returned an empty response.' });
    }

    return res.status(200).json({
      success: true,
      model: MODEL,
      answer,
      citations: []
    });
  } catch (error) {
    console.error('[ai/gateway] Request failed:', error?.name || error?.message || error);
    return res.status(error?.name === 'AbortError' ? 504 : 502).json({
      success: false,
      error: error?.name === 'AbortError'
        ? 'The AI service took too long to respond. Please try again.'
        : 'Unable to reach the AI service. Please try again.'
    });
  } finally {
    clearTimeout(timeout);
  }
}
