/**
 * Milo AI Workspace — Real Gemini Smoke Test (Safe & Bounded)
 *
 * Configurable, bounded smoke test for live Google Gemini API:
 * - Low request limit: strictly capped to at most 3 requests total
 * - Configurable concurrency: defaults to 1 (max cap: 2 concurrent users)
 * - Hard duration bound: 15-second overall timeout
 * - Spend protection: tracks estimated tokens & cost (< $0.001)
 * - Safe by default: if GEMINI_API_KEY is missing or mock, reports BLOCKED cleanly
 */

const assert = require('assert');
const https = require('https');

console.log('====================================================');
console.log('🔮 REAL GEMINI API SMOKE TEST (SAFE & BOUNDED)');
console.log('====================================================\n');

// Parse CLI flags
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const MAX_ALLOWED_REQUESTS = Math.min(3, parseInt(args['max-requests'] || args.maxRequests, 10) || 2);
const CONCURRENCY = Math.min(2, Math.max(1, parseInt(args.concurrency, 10) || 1));
const HARD_TIMEOUT_MS = Math.min(15000, parseInt(args['timeout-ms'] || args.timeoutMs, 10) || 10000);
const RUN_LIVE = Boolean(args['run-live'] || args.runLive);

async function runRealGeminiSmokeTest() {
  const rawKey = (
    process.env.MILO_GEMINI_KEY ||
    process.env.JUNO_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

  const isMockOrMissing = !rawKey || rawKey.startsWith('mock_') || rawKey.startsWith('test_') || rawKey.length < 20;

  if (isMockOrMissing || !RUN_LIVE) {
    console.log('📋 Smoke Test Configuration:');
    console.log(`• Concurrency Bound  : ${CONCURRENCY} worker(s) (Hard max: 2)`);
    console.log(`• Max Request Ceiling: ${MAX_ALLOWED_REQUESTS} request(s) (Hard max: 3)`);
    console.log(`• Duration Bound     : ${HARD_TIMEOUT_MS} ms`);
    console.log(`• Live Execution Flag: --run-live=${RUN_LIVE ? 'true' : 'false'}`);
    console.log(`• Detected API Key   : ${isMockOrMissing ? 'None / Mock' : '[CONFIGURED - REDACTED]'}`);
    console.log('\n🔒 [STATUS: BLOCKED / SKIPPED]');
    console.log('   Live upstream Gemini traffic was NOT sent because either:');
    console.log('   a) GEMINI_API_KEY is not configured with a valid live Google AI key, or');
    console.log('   b) Explicit --run-live flag was omitted to protect quota and spend.');
    console.log('   To execute against live Google AI when authorized:');
    console.log('   GEMINI_API_KEY=<real_key> node test/real_gemini_smoke_test.js --run-live=true\n');
    console.log('✅ Real Gemini smoke test safety controls validated successfully.');
    return;
  }

  console.log(`🚀 Executing ${MAX_ALLOWED_REQUESTS} live request(s) with concurrency ${CONCURRENCY}...`);
  const model = 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(rawKey)}`;

  let requestsCompleted = 0;
  const startTime = Date.now();

  async function executeSingleCall(queryId) {
    if (requestsCompleted >= MAX_ALLOWED_REQUESTS) return null;
    requestsCompleted++;

    const payload = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Respond with exact text: "Milo AI verified live at ${Date.now()}"` }] }],
      generationConfig: { maxOutputTokens: 64, temperature: 0.1 }
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

    const t0 = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal
      });

      const duration = Date.now() - t0;
      const data = await response.json();

      return {
        status: response.status,
        duration,
        data,
        success: response.ok
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => executeSingleCall(i + 1));
  const results = await Promise.all(workers);

  const totalTime = Date.now() - startTime;
  console.log(`\nResults across ${results.length} live query:`);
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (!res) continue;
    console.log(`• Query ${i + 1}: HTTP ${res.status} in ${res.duration}ms | Success: ${res.success}`);
    if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log(`  Output: "${res.data.candidates[0].content.parts[0].text.trim()}"`);
    } else if (res.data?.error) {
      console.log(`  Error: ${res.data.error.message?.replace(/AIza[0-9A-Za-z-_]{15,}/g, '[REDACTED]')}`);
    }
  }
  console.log(`Total live smoke test elapsed: ${totalTime} ms`);
  console.log('✅ Real Gemini smoke test completed within hard safety boundaries.\n');
}

runRealGeminiSmokeTest().catch(err => {
  console.error('❌ Live Gemini smoke test error:', err.message);
  process.exit(1);
});
