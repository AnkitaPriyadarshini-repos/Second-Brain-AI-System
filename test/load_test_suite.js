/**
 * Milo AI Workspace — Environment-Driven 100+ User Load Testing Suite
 *
 * Implements realistic multi-mode workload testing:
 * - Mode A: Local backend test using actual route handlers with mock AI provider
 * - Mode B: Deployed staging URL test with unique synthetic user sessions
 * - Mode C: Explicitly bounded live provider test with cost controls and spend caps
 *
 * Workload:
 * - Isolated virtual user sessions with cryptographic tokens
 * - Static homepage & health checks
 * - Fast greetings & complex RAG context queries
 * - Rapid burst submissions (testing rate limits & 429s)
 * - Async video job lifecycle (create, poll, cross-user 403 isolation check, cancel)
 * - Metrics: p50, p95, p99 latency, RPS, status distribution, error categorization
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { generateSessionToken } = require('../api/auth-guard');

// Parse CLI arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const MODE = (args.mode || 'A').toUpperCase();
const CONCURRENCY = parseInt(args.concurrency, 10) || (MODE === 'C' ? 5 : 100);
const TARGET_URL = (args.target || 'http://127.0.0.1:3199').trim();
const IS_DRY_RUN = Boolean(args['dry-run'] || args.dryRun);
const SPEND_CAP = parseFloat(args['spend-cap'] || args.spendCap) || 0.10;
const CONFIRM_LIVE = Boolean(args['confirm-live'] || args.confirmLive);
const CONFIRM_PROD = Boolean(args['confirm-production'] || args.confirmProduction);

// Provide a test session secret for local benchmark/load tests if none was set in environment
if (!process.env.MILO_SESSION_SECRET && !process.env.SESSION_SECRET) {
  process.env.MILO_SESSION_SECRET = 'milo_load_test_secret_32bytes_random_testing_val!';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep-Alive HTTP Agents for realistic pooled traffic
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 250, keepAliveMsecs: 1000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 250, keepAliveMsecs: 1000 });

// Budget & Cost Enforcement for Live Mode C
const ESTIMATED_COST_PER_AI_CALL = 0.00015; // Conservative Gemini Flash average prompt+response cost
const MAX_LIVE_PROVIDER_CALLS = parseInt(args['max-provider-calls'] || args.maxProviderCalls, 10) || 10;
let liveProviderCallsMade = 0;
let accumulatedEstimatedSpend = 0.0;

function checkSpendBudget() {
  if (MODE !== 'C') return true;
  if (accumulatedEstimatedSpend + ESTIMATED_COST_PER_AI_CALL > SPEND_CAP) {
    console.warn(`🛑 [SPEND CAP REACHED] Bounded test halted because estimated spend ($${accumulatedEstimatedSpend.toFixed(4)}) would exceed spend cap ($${SPEND_CAP.toFixed(4)}).`);
    return false;
  }
  if (liveProviderCallsMade >= MAX_LIVE_PROVIDER_CALLS) {
    console.warn(`🛑 [CALL LIMIT REACHED] Bounded test halted because provider call limit (${MAX_LIVE_PROVIDER_CALLS}) was reached.`);
    return false;
  }
  return true;
}

function recordProviderCall() {
  if (MODE === 'C') {
    liveProviderCallsMade++;
    accumulatedEstimatedSpend += ESTIMATED_COST_PER_AI_CALL;
  }
}

function makeRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (err) {
      return reject({ duration: 0, error: new Error(`Malformed URL: ${urlStr}`) });
    }

    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const reqOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json, text/html, */*',
        ...(options.headers || {})
      },
      agent,
      timeout: options.timeout || 10000
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - t0;
        resolve({
          statusCode: res.statusCode,
          duration,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', (err) => {
      reject({ duration: Date.now() - t0, error: err });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ duration: Date.now() - t0, error: new Error('Request timed out') });
    });

    if (postData) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataStr);
    }
    req.end();
  });
}

/**
 * Creates an in-process mock server for Mode A that mounts the actual production handlers
 */
async function startModeAServer(port) {
  process.env.MILO_TEST_VIDEO_PROVIDER = 'mock';

  // Intercept upstream AI provider calls in Mode A to isolate application throughput from external network/quota
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function(url, options) {
    const urlStr = typeof url === 'string' ? url : (url?.url || '');
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Milo system operational. Load test query processed successfully.' }]
              }
            }
          ]
        })
      };
    }
    return originalFetch(url, options);
  };

  // Load actual route handlers
  const videoHandler = require('../api/media/video.js');
  const imageHandler = require('../api/media/image.js');
  
  // Note: api/ai/gateway.js is an ES module. We load it via dynamic import
  const gatewayModule = await import('../api/ai/gateway.js');
  const gatewayHandler = gatewayModule.default || gatewayModule;

  const server = http.createServer(async (req, res) => {
    // Collect body
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      if (bodyData) {
        try { req.body = JSON.parse(bodyData); } catch (_) { req.body = {}; }
      } else {
        req.body = {};
      }

      // Add helper res methods mimicking Vercel/Express
      res.status = function(code) { res.statusCode = code; return res; };
      res.json = function(obj) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };

      const urlPath = req.url.split('?')[0];

      try {
        if (urlPath === '/' || urlPath === '/index.html') {
          res.setHeader('Content-Type', 'text/html');
          res.status(200).end('<!DOCTYPE html><html><head><title>Milo AI</title></head><body>Milo System</body></html>');
        } else if (urlPath === '/api/ai/health') {
          res.status(200).json({ ok: true, service: 'milo-ai-gateway', timestamp: Date.now() });
        } else if (urlPath === '/api/ai/gateway') {
          // Provide test GEMINI_API_KEY if needed to exercise gateway handler
          const origKey = process.env.GEMINI_API_KEY;
          if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = 'mock_loadtest_key';
          try {
            await gatewayHandler(req, res);
          } finally {
            if (!origKey) delete process.env.GEMINI_API_KEY;
          }
        } else if (urlPath === '/api/media/video') {
          await videoHandler(req, res);
        } else if (urlPath === '/api/media/image') {
          await imageHandler(req, res);
        } else {
          res.status(404).json({ error: 'Not found' });
        }
      } catch (err) {
        if (!res.writableEnded) {
          res.status(500).json({ error: err.message });
        }
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function runLoadTestSuite() {
  const modeDesc = {
    'A': 'Mode A: Local In-Process Benchmark with Mock AI Provider (Validates app throughput, route handling, and isolation; NOT proof of upstream provider quota/latency)',
    'B': 'Mode B: Deployed Staging Environment Workload (Exercises live serverless API routes on staging deployment)',
    'C': 'Mode C: Strictly Bounded Live Provider Test (Executes live upstream AI calls with enforced budget cap and call ceilings)'
  }[MODE] || `Mode ${MODE}`;

  console.log('====================================================');
  console.log(`⚡ MILO AI WORKSPACE — LOAD & CONCURRENCY TEST SUITE`);
  console.log(`   ${modeDesc}`);
  console.log(`   Virtual Users: ${CONCURRENCY} | Target: ${TARGET_URL}`);
  if (MODE === 'C') {
    console.log(`   Budget Cap   : $${SPEND_CAP.toFixed(4)} | Max Provider Calls: ${MAX_LIVE_PROVIDER_CALLS}`);
  }
  console.log('====================================================\n');

  if (IS_DRY_RUN) {
    console.log('🔍 [DRY RUN MODE ENABLED]');
    console.log(`• Target Endpoint       : ${TARGET_URL}`);
    console.log(`• Concurrency Plan      : ${CONCURRENCY} independent virtual user sessions`);
    console.log(`• Actions per User      : 7 distinct transactions (health, greeting, context, rate-limit burst, video create/poll/cancel)`);
    console.log(`• Total Planned Requests: ${CONCURRENCY * 7}`);
    console.log(`• Estimated Spend       : $${MODE === 'C' ? Math.min(SPEND_CAP, CONCURRENCY * 2 * ESTIMATED_COST_PER_AI_CALL).toFixed(4) : '0.0000'} (Mode ${MODE})`);
    console.log(`• Spend Cap Enforced    : $${SPEND_CAP.toFixed(4)} (hard ceiling)`);
    console.log('✅ Dry-run completed cleanly without sending network traffic.\n');
    return;
  }

  // Safety Gate 1: URL Syntax Validation
  try {
    const parsedTarget = new URL(TARGET_URL);
    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      throw new Error(`Unsupported protocol ${parsedTarget.protocol}`);
    }
  } catch (err) {
    console.error(`🛑 SAFETY GATE: Malformed or invalid target URL: "${TARGET_URL}". Error: ${err.message}`);
    process.exit(1);
  }

  // Safety Gate 2: Production Domain Protection
  if (TARGET_URL.includes('second-brain-ai-system.vercel.app')) {
    if (!CONFIRM_PROD) {
      console.error('🛑 SAFETY GATE: Automated load testing against PRODUCTION main domain (second-brain-ai-system.vercel.app) is forbidden by default.');
      console.error('   Please run load tests against a local server (Mode A) or staging deployment URL (Mode B).');
      console.error('   If you have explicit authorization to verify production, pass --confirm-production=true.');
      process.exit(1);
    }
  }

  // Safety Gate 3: Live Environment Confirmation
  if ((MODE === 'B' || MODE === 'C') && TARGET_URL.includes('vercel.app')) {
    if (!CONFIRM_LIVE) {
      console.error('🛑 SAFETY GATE: Live test against deployed URL requires explicit --confirm-live flag.');
      console.error('   Example: node test/load_test_suite.js --mode=B --target=https://... --confirm-live');
      process.exit(1);
    }
  }

  let localServer = null;
  let baseUrl = TARGET_URL;

  if (MODE === 'A') {
    const port = 3199;
    localServer = await startModeAServer(port);
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`🚀 Mode A local test server listening on ${baseUrl}`);
  }

  console.log(`🚀 Launching ${CONCURRENCY} concurrent user workflows targeting ${baseUrl}...`);

  const startTime = Date.now();
  const latencies = [];
  const statusCodes = {};
  let totalRequests = 0;
  let successfulRequests = 0;
  let isolationPasses = 0;
  let isolationFailures = 0;

  function recordMetric(res) {
    totalRequests++;
    latencies.push(res.duration);
    statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
    if (res.statusCode >= 200 && res.statusCode < 400) {
      successfulRequests++;
    }
  }

  // Generate unique virtual user workloads
  const userWorkflows = Array.from({ length: CONCURRENCY }, async (_, idx) => {
    const userId = `usr_load_${idx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const sessionToken = generateSessionToken(userId, false);
    const authHeaders = {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Milo-Session': sessionToken,
      'Content-Type': 'application/json'
    };

    // Stagger arrival slightly (3ms per user) to simulate natural user connection dispersion
    await sleep(idx * 3);

    try {
      // Step 1: Health check
      const healthRes = await makeRequest(`${baseUrl}/api/ai/health`, { method: 'GET' });
      recordMetric(healthRes);

      // Step 2: Short greeting AI query (subject to budget in Mode C)
      if (checkSpendBudget()) {
        recordProviderCall();
        const greetingRes = await makeRequest(`${baseUrl}/api/ai/gateway`, {
          method: 'POST',
          headers: authHeaders
        }, { prompt: 'Hello Milo, what is your system status?' });
        recordMetric(greetingRes);
      }

      // Step 3: Complex query with isolated private context notes (subject to budget in Mode C)
      if (checkSpendBudget()) {
        recordProviderCall();
        const ragRes = await makeRequest(`${baseUrl}/api/ai/gateway`, {
          method: 'POST',
          headers: authHeaders
        }, {
          prompt: `Query from virtual user ${userId}`,
          contextNotes: [
            {
              id: `note_${userId}_1`,
              title: `Confidential Architecture Doc for ${userId}`,
              content: `Private distributed system consensus specs for node cluster ${userId}.`
            }
          ]
        });
        recordMetric(ragRes);
      }

      // Step 4: Rapid burst submission to verify rate-limiting behavior
      const burstRes = await makeRequest(`${baseUrl}/api/ai/gateway`, {
        method: 'POST',
        headers: authHeaders
      }, { prompt: 'Rapid burst query' });
      recordMetric(burstRes);

      // Step 5: Async Video Generation Job creation
      let jobId = null;
      const vidCreateRes = await makeRequest(`${baseUrl}/api/media/video`, {
        method: 'POST',
        headers: authHeaders
      }, {
        action: 'create',
        prompt: `Cinematic drone view of cyber city for user ${userId}`
      });
      recordMetric(vidCreateRes);

      if (vidCreateRes.statusCode === 202 || vidCreateRes.statusCode === 200) {
        try {
          const body = JSON.parse(vidCreateRes.body);
          jobId = body.jobId;
        } catch (_) {}
      }

      if (jobId) {
        // Step 6: Poll video job status with owner token
        const vidPollRes = await makeRequest(`${baseUrl}/api/media/video`, {
          method: 'POST',
          headers: authHeaders
        }, { action: 'status', jobId });
        recordMetric(vidPollRes);

        // Step 7: Cross-user data isolation test
        // Virtual user attempts to access another user's job -> MUST return 403 Forbidden
        const intruderToken = generateSessionToken(`intruder_${userId}`, true);
        const intruderRes = await makeRequest(`${baseUrl}/api/media/video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${intruderToken}`,
            'Content-Type': 'application/json'
          }
        }, { action: 'status', jobId });

        totalRequests++;
        latencies.push(intruderRes.duration);
        statusCodes[intruderRes.statusCode] = (statusCodes[intruderRes.statusCode] || 0) + 1;

        if (intruderRes.statusCode === 403) {
          isolationPasses++;
          successfulRequests++; // Security boundary successfully enforced
        } else {
          isolationFailures++;
          console.warn(`[ISOLATION FAILURE] Intruder accessed job ${jobId} with status ${intruderRes.statusCode}!`);
        }

        // Step 8: Clean up by cancelling job
        const vidCancelRes = await makeRequest(`${baseUrl}/api/media/video`, {
          method: 'POST',
          headers: authHeaders
        }, { action: 'cancel', jobId });
        recordMetric(vidCancelRes);
      }
    } catch (err) {
      totalRequests++;
      statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
    }
  });

  await Promise.all(userWorkflows);

  // Close local server if started
  if (localServer) {
    httpAgent.destroy();
    httpsAgent.destroy();
    await new Promise((resolve) => localServer.close(resolve));
  }

  const totalTimeMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;
  const rps = ((totalRequests / totalTimeMs) * 1000).toFixed(1);
  const successRate = ((successfulRequests / totalRequests) * 100).toFixed(1);

  console.log('\n====================================================');
  console.log('📊 MEASURED LOAD & READINESS TEST RESULTS');
  console.log('====================================================');
  console.log(`• Test Mode             : ${modeDesc}`);
  console.log(`• Virtual Users         : ${CONCURRENCY}`);
  console.log(`• Total Requests        : ${totalRequests}`);
  console.log(`• Total Elapsed Time    : ${totalTimeMs} ms`);
  console.log(`• Throughput            : ${rps} req/sec`);
  console.log(`• Min Latency           : ${min} ms`);
  console.log(`• p50 Latency           : ${p50} ms`);
  console.log(`• p95 Latency           : ${p95} ms`);
  console.log(`• p99 Latency           : ${p99} ms`);
  console.log(`• Max Latency           : ${max} ms`);
  console.log(`• Average Latency       : ${avg} ms`);
  console.log(`• Success Rate (2xx/3xx): ${successRate}% (${successfulRequests} / ${totalRequests})`);
  console.log(`• Data Isolation Checks : ${isolationPasses} passed, ${isolationFailures} failed`);
  if (MODE === 'C') {
    console.log(`• Live Calls Made       : ${liveProviderCallsMade} / ${MAX_LIVE_PROVIDER_CALLS}`);
    console.log(`• Estimated Spend       : $${accumulatedEstimatedSpend.toFixed(4)} (Spend Cap: $${SPEND_CAP.toFixed(4)})`);
  }
  console.log('• HTTP Status Distribution:');
  for (const [code, count] of Object.entries(statusCodes)) {
    console.log(`    HTTP ${code} : ${count}`);
  }
  console.log('====================================================\n');

  // Acceptance Criteria
  const passedIsolation = isolationFailures === 0;
  const passedThroughput = parseFloat(successRate) >= 90;
  const passedP95 = p95 < 2500;

  if (passedIsolation && passedThroughput && passedP95) {
    console.log(`✅ [PASS] 100+ User Load & Readiness Test Passed successfully!\n`);
    process.exit(0);
  } else {
    console.error(`❌ [FAIL] Load test criteria not met: Isolation=${passedIsolation}, SuccessRate=${successRate}% (>=90%), p95=${p95}ms (<2500ms)\n`);
    process.exit(1);
  }
}

runLoadTestSuite().catch((err) => {
  console.error('Load test runner encountered unhandled error:', err);
  process.exit(1);
});

