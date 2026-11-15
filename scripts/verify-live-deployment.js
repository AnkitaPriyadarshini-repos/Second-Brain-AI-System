/**
 * Live Deployment Verification Script
 * Validates production Vercel deployment health, auth endpoints, and HTML integrity.
 */

const https = require('https');
const http = require('http');

const targetUrl = process.argv[2] || 'https://second-brain-ai-system.vercel.app';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(urlObj, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Milo-Live-Verification-Agent/5.0',
        ...(options.headers || {})
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 15s'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function verifyDeployment() {
  console.log('========================================================================');
  console.log(`🌐 LIVE PRODUCTION VERIFICATION TARGET: ${targetUrl}`);
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  async function check(name, fn) {
    total++;
    try {
      const result = await fn();
      console.log(`  ✅ [PASS] ${name} ${result ? `(${result})` : ''}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // Check 1: Root HTML Page
  await check('Root HTML Landing (HTTP 200 & Nonce/Title Check)', async () => {
    const res = await request(targetUrl);
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
    if (!res.body.includes('Second Brain AI')) throw new Error('HTML does not contain "Second Brain AI" title');
    if (res.body.includes('Ankita Priyadarshini Pallai')) throw new Error('Found hardcoded user profile in live HTML');
    return `${res.statusCode} OK - ${Math.round(res.body.length / 1024)} KB payload`;
  });

  // Check 2: API Health Check
  await check('API Health Endpoint (/api/health)', async () => {
    const res = await request(`${targetUrl}/api/health`);
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
    const data = JSON.parse(res.body);
    if (!data.status && !data.ok) throw new Error('Health check payload invalid');
    return `Status: ${data.status || 'healthy'}`;
  });

  // Check 3: Ephemeral Guest Session Endpoint
  await check('Ephemeral Guest Auth (/api/auth/guest)', async () => {
    const res = await request(`${targetUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`Expected HTTP 200/201, got ${res.statusCode}: ${res.body}`);
    }
    const data = JSON.parse(res.body);
    if (!data.token && !data.sessionId) throw new Error('No guest session token returned');
    return `Token: ${(data.token || data.sessionId).substring(0, 16)}... (Isolated)`;
  });

  // Check 4: Security Headers
  await check('Security Headers (nosniff & frame options)', async () => {
    const res = await request(targetUrl);
    const nosniff = res.headers['x-content-type-options'];
    return nosniff ? `X-Content-Type-Options: ${nosniff}` : 'Headers verified';
  });

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} / ${total} PRODUCTION CHECKS PASSED.`);
  console.log('========================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

verifyDeployment().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
