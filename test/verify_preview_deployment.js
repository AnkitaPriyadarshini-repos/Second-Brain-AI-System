/**
 * Milo AI Workspace — Dedicated Preview Deployment Verification Script
 *
 * Verifies live Preview deployments over HTTPS with:
 * - Edge Deployment Protection detection (SSO 302/401/login HTML vs genuine application JSON)
 * - Safe Vercel Protection Bypass header forwarding (never prints or logs the token)
 * - Non-destructive inspection of /api/health and /api/ai/health
 *
 * Usage:
 *   node test/verify_preview_deployment.js
 *   node test/verify_preview_deployment.js --target=https://...
 *   node test/verify_preview_deployment.js --bypass-secret=<secret>
 */

const https = require('https');
const { URL } = require('url');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const TARGET_URL = (
  args.target ||
  process.env.VERCEL_PREVIEW_URL ||
  'https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app'
).replace(/\/$/, '');

const BYPASS_SECRET = (
  args['bypass-secret'] ||
  args.bypassSecret ||
  process.env.VERCEL_PROTECTION_BYPASS ||
  ''
).trim();

function probeEndpoint(pathname) {
  return new Promise((resolve) => {
    const fullUrl = `${TARGET_URL}${pathname}`;
    let parsed;
    try {
      parsed = new URL(fullUrl);
    } catch (err) {
      return resolve({ ok: false, error: `Malformed URL: ${fullUrl}` });
    }

    const headers = {
      'Accept': 'application/json, text/html, */*'
    };

    if (BYPASS_SECRET) {
      headers['x-vercel-protection-bypass'] = BYPASS_SECRET;
    }

    const t0 = Date.now();
    const req = https.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        const duration = Date.now() - t0;
        const contentType = res.headers['content-type'] || '';
        const isHtml = contentType.includes('text/html');
        const isJson = contentType.includes('application/json');

        let isVercelSSO = false;
        if (res.statusCode === 401 && body.includes('"Protected deployment"')) {
          isVercelSSO = true;
        } else if ((res.statusCode === 302 || res.statusCode === 307) && res.headers.location && res.headers.location.includes('sso-api')) {
          isVercelSSO = true;
        } else if (res.statusCode === 200 && (body.includes('<title>Login – Vercel</title>') || (body.includes('data-dpl-id') && isHtml))) {
          isVercelSSO = true;
        }

        let parsedJson = null;
        if (isJson) {
          try {
            parsedJson = JSON.parse(body);
          } catch (_) {}
        }

        resolve({
          ok: true,
          pathname,
          statusCode: res.statusCode,
          contentType,
          duration,
          isVercelSSO,
          isJson,
          parsedJson,
          bodySnippet: body.substring(0, 150)
        });
      });
    });

    req.on('error', (err) => resolve({ ok: false, pathname, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, pathname, error: 'Request timed out after 10,000ms' });
    });
    req.end();
  });
}

async function run() {
  console.log(`====================================================`);
  console.log(`🔍 MILO AI — PREVIEW DEPLOYMENT VERIFICATION PROBE`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Bypass Token: ${BYPASS_SECRET ? '[CONFIGURED VIA CLI / ENV]' : '[NOT PROVIDED]'}`);
  console.log(`====================================================\n`);

  // Probe 1: Root Health Check (/api/health)
  console.log(`▶ Probing GET /api/health ...`);
  const rootHealth = await probeEndpoint('/api/health');

  if (!rootHealth.ok) {
    console.error(`❌ Request failed: ${rootHealth.error}`);
  } else if (rootHealth.isVercelSSO) {
    console.warn(`🔒 [VERCEL SSO INTERCEPTION DETECTED]`);
    console.warn(`   HTTP Status: ${rootHealth.statusCode}`);
    console.warn(`   Response Type: ${rootHealth.contentType}`);
    console.warn(`   Vercel Deployment Protection intercepted the request before reaching serverless lambdas.`);
    console.warn(`   A Vercel login page returning HTTP 200 or 401 is NOT counted as an application health success.`);
    console.warn(`   To bypass: provide --bypass-secret=<token> or set VERCEL_PROTECTION_BYPASS.\n`);
  } else if (rootHealth.isJson && rootHealth.parsedJson && rootHealth.parsedJson.ok === true) {
    console.log(`✅ [GENUINE APPLICATION HEALTH SUCCESS]`);
    console.log(`   HTTP Status: ${rootHealth.statusCode}`);
    console.log(`   Service: ${rootHealth.parsedJson.service}`);
    console.log(`   Status: ${rootHealth.parsedJson.status}`);
    console.log(`   Uptime: ${rootHealth.parsedJson.uptimeSeconds}s`);
    console.log(`   Latency: ${rootHealth.duration}ms\n`);
  } else {
    console.warn(`⚠️ [UNEXPECTED RESPONSE]`);
    console.warn(`   HTTP Status: ${rootHealth.statusCode}`);
    console.warn(`   Snippet: ${rootHealth.bodySnippet}\n`);
  }

  // Probe 2: AI Gateway Readiness (/api/ai/health)
  console.log(`▶ Probing GET /api/ai/health ...`);
  const aiHealth = await probeEndpoint('/api/ai/health');

  if (!aiHealth.ok) {
    console.error(`❌ Request failed: ${aiHealth.error}`);
  } else if (aiHealth.isVercelSSO) {
    console.warn(`🔒 [VERCEL SSO INTERCEPTION DETECTED]`);
    console.warn(`   HTTP Status: ${aiHealth.statusCode}`);
    console.warn(`   Vercel Deployment Protection intercepted the request.`);
  } else if (aiHealth.isJson && aiHealth.parsedJson) {
    if (aiHealth.statusCode === 200 && aiHealth.parsedJson.configured === true) {
      console.log(`✅ [AI GATEWAY READY]`);
      console.log(`   Status: 200 OK | Configured: true | Provider credentials active.`);
    } else if (aiHealth.statusCode === 503 && aiHealth.parsedJson.configured === false) {
      console.log(`⚠️ [AI GATEWAY UNCONFIGURED — FAIL-SAFE WORKING]`);
      console.log(`   Status: 503 Service Unavailable (Expected when GEMINI_API_KEY is missing from Preview).`);
      console.log(`   Error: ${aiHealth.parsedJson.error}`);
    }
  } else {
    console.warn(`⚠️ [UNEXPECTED RESPONSE] Status: ${aiHealth.statusCode}`);
  }

  console.log(`\n====================================================`);
  console.log(`SUMMARY: Live probe completed.`);
  console.log(`====================================================`);
}

run().catch(console.error);
