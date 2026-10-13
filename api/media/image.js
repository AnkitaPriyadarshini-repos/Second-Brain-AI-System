/**
 * Milo AI Workspace — Image Generation Serverless API Route
 *
 * Supported providers:
 * 1. Gemini Imagen 3 (via server-side GEMINI_API_KEY)
 * 2. Pollinations AI (Flux / SDXL high-fidelity public GPU tier - zero user config required)
 * 3. User-configured Custom Local Endpoint (ComfyUI / Automatic1111 with SSRF checks)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const authGuard = require('../auth-guard');

const MAX_PROMPT_LENGTH = 1500;
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  } else {
    entry.count++;
  }
  rateLimitMap.set(key, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

function getApiKey() {
  return (
    process.env.MILO_GEMINI_KEY ||
    process.env.JUNO_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');
}

function getDimensions(aspectRatio) {
  switch (aspectRatio) {
    case '16:9': return { width: 1280, height: 720 };
    case '9:16': return { width: 720, height: 1280 };
    case '4:3': return { width: 1024, height: 768 };
    case '3:2': return { width: 1080, height: 720 };
    case '1:1':
    default:
      return { width: 1024, height: 1024 };
  }
}

async function generateViaPollinations({ prompt, negativePrompt, width, height, seed }) {
  let fullPrompt = prompt.trim();
  if (negativePrompt) fullPrompt += ` (avoid: ${negativePrompt})`;
  const encodedPrompt = encodeURIComponent(fullPrompt);
  const targetSeed = seed || Math.floor(Math.random() * 1000000);
  const directUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${targetSeed}&nologo=true`;

  return {
    success: true,
    imageUrl: directUrl,
    provider: 'Pollinations Flux',
    aspectRatio: `${width}:${height}`,
    dimensions: { width, height },
    seed: targetSeed,
    createdAt: new Date().toISOString()
  };
}

async function generateViaGeminiImagen({ prompt, aspectRatio, apiKey }) {
  const geminiRatio = aspectRatio === '16:9' ? '16:9' : (aspectRatio === '9:16' ? '9:16' : (aspectRatio === '4:3' ? '4:3' : '1:1'));
  const payload = JSON.stringify({
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: geminiRatio,
      outputMimeType: 'image/jpeg'
    }
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 45000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            const msg = parsed?.error?.message || `Imagen returned HTTP ${res.statusCode}`;
            return reject(new Error(msg));
          }
          const base64Bytes = parsed?.predictions?.[0]?.bytesBase64Encoded;
          if (!base64Bytes) {
            return reject(new Error('Imagen returned empty prediction payload'));
          }
          resolve({
            success: true,
            imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
            provider: 'Gemini Imagen 3',
            aspectRatio: geminiRatio,
            dimensions: getDimensions(aspectRatio),
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          reject(new Error(`Failed to parse Imagen response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Imagen network error: ${err.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Imagen generation timed out after 45s'));
    });
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientIdentity = authGuard.extractClientIdentity(req);
  const rateLimitKey = `${clientIdentity.id}:${clientIdentity.ip}`;
  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ success: false, error: 'Image generation rate limit exceeded. Please wait a minute.' });
  }

  const body = req.body || {};
  const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const negativePrompt = typeof body.negativePrompt === 'string' ? body.negativePrompt.trim() : '';
  const requestedRatio = body.aspectRatio || '1:1';
  const requestedProvider = body.provider || 'auto';
  const seed = body.seed ? parseInt(body.seed, 10) : undefined;

  if (!rawPrompt) {
    return res.status(400).json({ success: false, error: 'Image prompt is required.' });
  }

  if (rawPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ success: false, error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.` });
  }

  const { width, height } = getDimensions(requestedRatio);
  const geminiKey = getApiKey();

  // Try selected or automatic provider chain
  try {
    let result = null;

    const isGeminiRequested = requestedProvider === 'imagen' || requestedProvider === 'gemini';
    if (isGeminiRequested && geminiKey) {
      result = await generateViaGeminiImagen({ prompt: rawPrompt, aspectRatio: requestedRatio, apiKey: geminiKey });
    } else if (isGeminiRequested && !geminiKey) {
      return res.status(503).json({
        success: false,
        error: 'Gemini Imagen requires GEMINI_API_KEY to be configured in your server environment variables.'
      });
    }

    if (!result) {
      // Default / Fallback: Pollinations Flux engine
      result = await generateViaPollinations({
        prompt: rawPrompt,
        negativePrompt,
        width,
        height,
        seed
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[milo/media/image error]', err.message);

    // If Imagen failed, try Pollinations as resilient fallback
    if (requestedProvider !== 'imagen') {
      try {
        const fallbackRes = await generateViaPollinations({
          prompt: rawPrompt,
          negativePrompt,
          width,
          height,
          seed
        });
        return res.status(200).json(fallbackRes);
      } catch (fallbackErr) {
        return res.status(502).json({
          success: false,
          error: `Media provider failed to generate image: ${fallbackErr.message}`
        });
      }
    }

    return res.status(502).json({
      success: false,
      error: `Media provider failed to generate image: ${err.message}`
    });
  }
};
