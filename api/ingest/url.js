/**
 * Second Brain AI System — Safe Server-Side URL Ingestion Endpoint
 *
 * Implements strict SSRF protection, size bounding, timeout enforcement,
 * HTML sanitization, and prompt-injection neutralization.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB
const REQUEST_TIMEOUT_MS = 10_000;      // 10 seconds

/**
 * Checks if a hostname or IP string resolves to a private or dangerous network range.
 */
function isDangerousDestination(hostname) {
  if (!hostname || typeof hostname !== 'string') return true;
  const h = hostname.trim().toLowerCase();

  // Localhost & local domain names
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.corp')) {
    return true;
  }

  // IPv4 checks
  const ipv4Match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, o1, o2, o3, o4] = ipv4Match.map(Number);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return true;

    // 0.0.0.0/8
    if (o1 === 0) return true;
    // 127.0.0.0/8 Loopback
    if (o1 === 127) return true;
    // 10.0.0.0/8 Private
    if (o1 === 10) return true;
    // 172.16.0.0/12 Private
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16 Private
    if (o1 === 192 && o2 === 168) return true;
    // 169.254.0.0/16 Link-local / Cloud Metadata (169.254.169.254)
    if (o1 === 169 && o2 === 254) return true;
    // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved
    if (o1 >= 224) return true;
  }

  // IPv6 loopback / unique local
  if (h === '::1' || h === '[::1]' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
    return true;
  }

  return false;
}

/**
 * Sanitizes extracted text and strips embedded prompt-injection phrases.
 */
function stripInjectionsAndFormat(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, '[REDACTED_INSTRUCTION]')
    .replace(/disregard\s+(all\s+)?(previous|prior)\s+rules/gi, '[REDACTED_INSTRUCTION]')
    .replace(/system\s+override/gi, '[REDACTED_INSTRUCTION]')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Basic HTML text extraction (title, description, and article body)
 */
function extractArticleFromHTML(html) {
  // Extract Title
  let title = 'Untitled Web Source';
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // Extract meta description
  let description = '';
  const metaMatch = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  if (metaMatch && metaMatch[1]) {
    description = metaMatch[1].trim();
  }

  // Strip script, style, svg, noscript, header, footer, nav
  let cleanHtml = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Extract article or main body if available
  const articleMatch = cleanHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
                       cleanHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const contentSource = articleMatch ? articleMatch[1] : cleanHtml;

  const text = stripInjectionsAndFormat(contentSource);
  return {
    title: title.slice(0, 200),
    description: description.slice(0, 300),
    text: text.slice(0, 25000), // Bounded to 25k chars
    charCount: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length
  };
}

function fetchSafeUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (_) {
      return reject(new Error('Invalid URL format. Please provide a valid http or https URL.'));
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return reject(new Error('Unsupported protocol. Only HTTP and HTTPS URLs are allowed.'));
    }

    if (isDangerousDestination(parsedUrl.hostname)) {
      return reject(new Error('Access to private, loopback, or metadata network addresses is strictly prohibited (SSRF Protection).'));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(
      parsedUrl.href,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MiloBot/1.0 (Personal Research Ingestion)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9'
        },
        timeout: REQUEST_TIMEOUT_MS
      },
      (res) => {
        // Handle Redirects safely
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, parsedUrl.href);
            if (isDangerousDestination(redirectUrl.hostname)) {
              return reject(new Error('Redirect destination is a forbidden private address.'));
            }
            return resolve(fetchSafeUrl(redirectUrl.href));
          } catch (e) {
            return reject(new Error('Failed to resolve redirect destination.'));
          }
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Remote server responded with HTTP status ${res.statusCode}.`));
        }

        let totalBytes = 0;
        let data = '';

        res.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_RESPONSE_BYTES) {
            res.destroy();
            return resolve(data); // Process what was gathered within size limits
          }
          data += chunk.toString('utf8');
        });

        res.on('end', () => resolve(data));
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Website request timed out after 10 seconds.'));
    });

    req.on('error', (err) => reject(new Error(`Failed to fetch URL: ${err.message}`)));
  });
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ success: false, error: 'A valid URL string is required.' });
  }

  try {
    const rawHtml = await fetchSafeUrl(url.trim());
    const extracted = extractArticleFromHTML(rawHtml);

    if (!extracted.text || extracted.text.length < 50) {
      return res.status(422).json({
        success: false,
        error: 'Extracted web content was empty or insufficient. The site may require JavaScript rendering or authentication.'
      });
    }

    return res.status(200).json({
      success: true,
      url: url.trim(),
      title: extracted.title,
      summary: extracted.description || extracted.text.slice(0, 180) + '...',
      content: extracted.text,
      charCount: extracted.charCount,
      wordCount: extracted.wordCount,
      sourceType: 'web',
      ingestedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Could not ingest the requested website.'
    });
  }
}

module.exports = handler;
module.exports.default = handler;

