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
const RUN_ALL_STAGES = Boolean(args.stages || args['all-stages'] || args['run-stages']);
const SOAK_ROUNDS = parseInt(args['soak-rounds'] || args.soakRounds, 10) || 3;

// Vercel Deployment Protection Bypass Configuration (for Mode B Live Staging)
const VERCEL_BYPASS_SECRET = (
  args['bypass-secret'] ||
  args.bypassSecret ||
  process.env.VERCEL_PROTECTION_BYPASS ||
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  ''
).trim();

const VERCEL_BYPASS_COOKIE = (
  args['bypass-cookie'] ||
  args.bypassCookie ||
  process.env.VERCEL_PROTECTION_COOKIE ||
  ''
).trim();

// Provide a test session secret for local benchmark/load tests if none was set in environment
if (!process.env.MILO_SESSION_SECRET && !process.env.SESSION_SECRET) {
  process.env.MILO_SESSION_SECRET = 'milo_load_test_secret_32bytes_random_testing_val!';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep-Alive HTTP Agents for realistic pooled traffic (sized for 300+ concurrent connections)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 600, keepAliveMsecs: 1000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 600, keepAliveMsecs: 1000 });

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

function isGenuineApplicationHealth(res) {
  if (!res || res.statusCode !== 200) return false;
  if (res.isVercelEdgeProtected) return false;
  const contentType = (res.headers && res.headers['content-type']) || '';
  if (!contentType.includes('application/json')) return false;
  try {
    const data = JSON.parse(res.body);
    return Boolean(data && (data.ok === true || data.status === 'healthy' || data.service === 'milo-ai-system' || data.service === 'milo-ai-gateway'));
  } catch (_) {
    return false;
  }
}

function makeRequest(urlStr, options = {}, postData = null, retries = 2) {
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

    const reqHeaders = {
      'Accept': 'application/json, text/html, */*',
      ...(options.headers || {})
    };

    if (VERCEL_BYPASS_SECRET) {
      reqHeaders['x-vercel-protection-bypass'] = VERCEL_BYPASS_SECRET;
    }
    if (VERCEL_BYPASS_COOKIE) {
      reqHeaders['Cookie'] = VERCEL_BYPASS_COOKIE.startsWith('_vercel_jwt=')
        ? VERCEL_BYPASS_COOKIE
        : `_vercel_jwt=${VERCEL_BYPASS_COOKIE}`;
    }

    const reqOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: reqHeaders,
      agent,
      timeout: options.timeout || 15000
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - t0;

        // Detect Vercel Deployment Protection (SSO / Edge gate interception)
        let isVercelEdgeProtected = false;
        if (res.statusCode === 401 && body.includes('"Protected deployment"') && body.includes('"vercel_auth_enabled"')) {
          isVercelEdgeProtected = true;
        } else if ((res.statusCode === 302 || res.statusCode === 307) && res.headers['location'] && res.headers['location'].includes('sso-api')) {
          isVercelEdgeProtected = true;
        } else if (res.statusCode === 200 && (body.includes('<title>Login – Vercel</title>') || (body.includes('data-dpl-id') && res.headers['content-type']?.includes('text/html')))) {
          isVercelEdgeProtected = true;
        }

        resolve({
          statusCode: res.statusCode,
          duration,
          headers: res.headers,
          body,
          isVercelEdgeProtected
        });
      });
    });

    req.on('error', (err) => {
      if (retries > 0 && (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNREFUSED')) {
        // Retry pooled socket race condition cleanly
        return makeRequest(urlStr, options, postData, retries - 1).then(resolve, reject);
      }
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
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = 'mock_loadtest_key';
  }

  // Intercept upstream AI provider calls in Mode A to isolate application throughput from external network/quota
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function(url, options) {
    const urlStr = typeof url === 'string' ? url : (url?.url || '');
    if (urlStr.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        headers: {
          get: (h) => (String(h).toLowerCase() === 'content-type' ? 'application/json' : null)
        },
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
        } else if (urlPath === '/api/health') {
          res.status(200).json({ ok: true, service: 'milo-ai-system', status: 'healthy', timestamp: Date.now() });
        } else if (urlPath === '/api/ai/health') {
          res.status(200).json({ ok: true, service: 'milo-ai-gateway', timestamp: Date.now() });
        } else if (urlPath === '/api/ai/gateway') {
          await gatewayHandler(req, res);
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

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;

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

  function computePercentiles(arr) {
    if (!arr || !arr.length) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      min: sorted[0],
      p50: sorted[Math.floor(sorted.length * 0.50)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      max: sorted[sorted.length - 1],
      avg: parseFloat((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1))
    };
  }

  async function runSingleStage(stageConcurrency, stageLabel) {
    console.log(`\n----------------------------------------------------`);
    console.log(`▶ ${stageLabel}: ${stageConcurrency} Concurrent Virtual Users`);
    console.log(`----------------------------------------------------`);

    // Reset circuit breaker, in-flight set, and rate limits between stages for reproducible benchmark isolation
    if (globalThis.__miloCircuitBreaker) {
      globalThis.__miloCircuitBreaker.consecutiveFailures = 0;
      globalThis.__miloCircuitBreaker.cooldownUntil = 0;
    }
    if (globalThis.__miloActiveInFlight) {
      globalThis.__miloActiveInFlight.clear();
    }
    if (globalThis.__junoRateBuckets) {
      globalThis.__junoRateBuckets.clear();
    }

    const cpuBefore = process.cpuUsage();
    const memBefore = process.memoryUsage();
    const startTime = Date.now();
    const allLatencies = [];
    const aiLatencies = [];
    const nonAiLatencies = [];
    const statusCodes = {};
    let totalRequests = 0;
    let successfulRequests = 0;
    let isolationPasses = 0;
    let isolationFailures = 0;
    let completedWorkflows = 0;

    function recordMetric(res, isAi = false, isExpectedRateLimit = false, isExplicitSuccess = null) {
      totalRequests++;
      allLatencies.push(res.duration);
      if (isAi) {
        aiLatencies.push(res.duration);
      } else {
        nonAiLatencies.push(res.duration);
      }

      statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
      if (res.isVercelEdgeProtected) {
        statusCodes['VERCEL_SSO_BLOCKED'] = (statusCodes['VERCEL_SSO_BLOCKED'] || 0) + 1;
        return; // Intercepted by Vercel edge - NOT an application success
      }

      if (isExplicitSuccess !== null) {
        if (isExplicitSuccess) successfulRequests++;
      } else if (res.statusCode >= 200 && res.statusCode < 400) {
        successfulRequests++;
      } else if (isExpectedRateLimit && res.statusCode === 429) {
        successfulRequests++; // Correctly classified expected rate-limit rejection
      }
    }

    const userWorkflows = Array.from({ length: stageConcurrency }, async (_, idx) => {
      const userId = `usr_load_${idx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const sessionToken = generateSessionToken(userId, false);
      const authHeaders = {
        'Authorization': `Bearer ${sessionToken}`,
        'X-Milo-Session': sessionToken,
        'Content-Type': 'application/json'
      };

      // Stagger arrival slightly (2-3ms per user)
      await sleep(idx * 3);

      try {
        let stepCount = 0;

        // Step 1: Health check (non-AI) — strictly verifies genuine JSON application payload
        const healthRes = await makeRequest(`${baseUrl}/api/health`, { method: 'GET' });
        const isHealthy = isGenuineApplicationHealth(healthRes);
        recordMetric(healthRes, false, false, isHealthy);
        if (isHealthy) stepCount++;

        if (healthRes.isVercelEdgeProtected && idx === 0) {
          console.warn(`\n🚨 [VERCEL DEPLOYMENT PROTECTION ACTIVE]
   Request to ${baseUrl}/api/health was intercepted by Vercel Edge SSO (HTTP ${healthRes.statusCode}).
   Milo serverless functions cannot be reached without an automation bypass secret.
   To unblock: supply --bypass-secret=<token> or set VERCEL_PROTECTION_BYPASS=<token>.\n`);
        }

        // Step 2: Short greeting AI query
        if (checkSpendBudget()) {
          recordProviderCall();
          const greetingRes = await makeRequest(`${baseUrl}/api/ai/gateway`, {
            method: 'POST',
            headers: authHeaders
          }, { prompt: 'Hello Milo, what is your system status?' });
          recordMetric(greetingRes, true);
          if (greetingRes.statusCode === 200 && !greetingRes.isVercelEdgeProtected) stepCount++;
        }

        // Step 3: Complex query with isolated private context notes
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
          recordMetric(ragRes, true);
          if (ragRes.statusCode === 200 && !ragRes.isVercelEdgeProtected) stepCount++;
        }

        // Step 4: Rapid burst submission to verify rate-limiting behavior
        const burstRes = await makeRequest(`${baseUrl}/api/ai/gateway`, {
          method: 'POST',
          headers: authHeaders
        }, { prompt: 'Rapid burst query' });
        recordMetric(burstRes, true, true);
        if ((burstRes.statusCode === 200 || burstRes.statusCode === 429) && !burstRes.isVercelEdgeProtected) stepCount++;

        // Step 5: Async Video Generation Job creation (non-AI API)
        let jobId = null;
        const vidCreateRes = await makeRequest(`${baseUrl}/api/media/video`, {
          method: 'POST',
          headers: authHeaders
        }, {
          action: 'create',
          prompt: `Cinematic drone view of cyber city for user ${userId}`
        });
        recordMetric(vidCreateRes, false);
        if ((vidCreateRes.statusCode === 202 || vidCreateRes.statusCode === 200) && !vidCreateRes.isVercelEdgeProtected) {
          stepCount++;
          try {
            const body = JSON.parse(vidCreateRes.body);
            jobId = body.jobId;
          } catch (_) {}
        }

        if (jobId) {
          // Step 6: Poll video job status with owner token (non-AI API)
          const vidPollRes = await makeRequest(`${baseUrl}/api/media/video`, {
            method: 'POST',
            headers: authHeaders
          }, { action: 'status', jobId });
          recordMetric(vidPollRes, false);
          if (vidPollRes.statusCode === 200 && !vidPollRes.isVercelEdgeProtected) stepCount++;

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
          allLatencies.push(intruderRes.duration);
          nonAiLatencies.push(intruderRes.duration);
          statusCodes[intruderRes.statusCode] = (statusCodes[intruderRes.statusCode] || 0) + 1;

          if (intruderRes.isVercelEdgeProtected) {
            statusCodes['VERCEL_SSO_BLOCKED'] = (statusCodes['VERCEL_SSO_BLOCKED'] || 0) + 1;
          } else if (intruderRes.statusCode === 403) {
            isolationPasses++;
            successfulRequests++; // Security boundary successfully enforced
            stepCount++;
          } else {
            isolationFailures++;
            console.warn(`[ISOLATION FAILURE] Intruder accessed job ${jobId} with status ${intruderRes.statusCode}!`);
          }

          // Step 8: Clean up by cancelling job (non-AI API)
          const vidCancelRes = await makeRequest(`${baseUrl}/api/media/video`, {
            method: 'POST',
            headers: authHeaders
          }, { action: 'cancel', jobId });
          recordMetric(vidCancelRes, false);
          if (vidCancelRes.statusCode === 200 && !vidCancelRes.isVercelEdgeProtected) stepCount++;
        }

        if (stepCount >= 7) {
          completedWorkflows++;
        }
      } catch (err) {
        totalRequests++;
        statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
        if (statusCodes['ERROR'] <= 5) {
          console.warn(`[DEBUG ERROR]`, err?.error?.message || err?.message || err);
        }
      }
    });

    await Promise.all(userWorkflows);

    const totalTimeMs = Date.now() - startTime;
    const cpuDelta = process.cpuUsage(cpuBefore);
    const cpuUserMs = (cpuDelta.user / 1000).toFixed(1);
    const cpuSysMs = (cpuDelta.system / 1000).toFixed(1);
    const memAfter = process.memoryUsage();
    const heapDiffMb = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);
    const rssMb = (memAfter.rss / (1024 * 1024)).toFixed(1);

    const overallPct = computePercentiles(allLatencies);
    const aiPct = computePercentiles(aiLatencies);
    const nonAiPct = computePercentiles(nonAiLatencies);

    const rps = ((totalRequests / totalTimeMs) * 1000).toFixed(1);
    const successRate = ((successfulRequests / totalRequests) * 100).toFixed(1);

    const passed = isolationFailures === 0 && parseFloat(successRate) >= 90 && nonAiPct.p95 < 2500;

    console.log(`• Completed Workflows    : ${completedWorkflows} / ${stageConcurrency} (${((completedWorkflows / stageConcurrency) * 100).toFixed(1)}%)`);
    console.log(`• Total Requests         : ${totalRequests} | Elapsed: ${totalTimeMs} ms | Throughput: ${rps} req/sec`);
    console.log(`• Success Rate           : ${successRate}% (${successfulRequests} / ${totalRequests})`);
    console.log(`• Non-AI Latency (p50/p95/p99): ${nonAiPct.p50} ms / ${nonAiPct.p95} ms / ${nonAiPct.p99} ms (avg: ${nonAiPct.avg} ms)`);
    console.log(`• AI Latency     (p50/p95/p99): ${aiPct.p50} ms / ${aiPct.p95} ms / ${aiPct.p99} ms (avg: ${aiPct.avg} ms)`);
    console.log(`• Overall Latency(p50/p95/p99): ${overallPct.p50} ms / ${overallPct.p95} ms / ${overallPct.p99} ms (avg: ${overallPct.avg} ms)`);
    console.log(`• CPU Usage              : user: ${cpuUserMs} ms | system: ${cpuSysMs} ms`);
    console.log(`• Memory Delta (Heap)    : ${heapDiffMb > 0 ? '+' : ''}${heapDiffMb} MB (Current RSS: ${rssMb} MB)`);
    console.log(`• Data Isolation         : ${isolationPasses} passed, ${isolationFailures} failed`);
    console.log(`• HTTP Statuses          :`, Object.entries(statusCodes).map(([c, n]) => `${c}:${n}`).join('  '));
    console.log(`• Mode Label             : LOCAL MOCK — NOT CLOUD CERTIFICATION`);
    console.log(`• Stage Verdict          : ${passed ? '✅ PASS' : '❌ FAIL'}`);

    return {
      label: stageLabel,
      concurrency: stageConcurrency,
      totalRequests,
      completedWorkflows,
      totalTimeMs,
      rps,
      successRate,
      isolationPasses,
      isolationFailures,
      cpuUserMs,
      cpuSysMs,
      heapDiffMb,
      rssMb,
      statusCodes,
      overall: overallPct,
      ai: aiPct,
      nonAi: nonAiPct,
      passed
    };
  }

  const stageResults = [];

  try {
    if (RUN_ALL_STAGES) {
      console.log('🚀 Initiating Full 200+ User Concurrency & Soak Certification Matrix...');
      console.log('   All results labeled: LOCAL MOCK — NOT CLOUD CERTIFICATION\n');

      // Stage 1: 10 concurrent users
      stageResults.push(await runSingleStage(10, 'Stage 1: 10 Concurrent Users'));
      await sleep(300);

      // Stage 2: 25 concurrent users
      stageResults.push(await runSingleStage(25, 'Stage 2: 25 Concurrent Users'));
      await sleep(300);

      // Stage 3: 50 concurrent users
      stageResults.push(await runSingleStage(50, 'Stage 3: 50 Concurrent Users'));
      await sleep(300);

      // Stage 4: 100 concurrent users
      stageResults.push(await runSingleStage(100, 'Stage 4: 100 Concurrent Users'));
      await sleep(400);

      // Stage 5: 150 concurrent users
      stageResults.push(await runSingleStage(150, 'Stage 5: 150 Concurrent Users'));
      await sleep(400);

      // Stage 6: 200 concurrent users (Certification Target)
      const stage6 = await runSingleStage(200, 'Stage 6: 200 Concurrent Users (Capacity Certification Gate)');
      stageResults.push(stage6);
      await sleep(500);

      // Stage 7: 250 concurrent users
      if (stage6.passed) {
        stageResults.push(await runSingleStage(250, 'Stage 7: 250 Concurrent Users (Burst Peak 1)'));
        await sleep(500);
      } else {
        console.warn('⚠️ Skipping Stage 7 (250 users) because Stage 6 did not pass certification criteria.');
      }

      // Stage 8: 300 concurrent users
      if (stage6.passed) {
        stageResults.push(await runSingleStage(300, 'Stage 8: 300 Concurrent Users (Burst Peak 2)'));
        await sleep(500);
      } else {
        console.warn('⚠️ Skipping Stage 8 (300 users) because Stage 6 did not pass certification criteria.');
      }

      // Stage 9: Soak test (sustained 200 users across 3 successive waves)
      console.log(`\n====================================================`);
      console.log(`🧪 STAGE 9: SUSTAINED SOAK TEST (200 Users x ${SOAK_ROUNDS} Successive Waves)`);
      console.log(`   Label: LOCAL MOCK — NOT CLOUD CERTIFICATION`);
      console.log(`====================================================`);
      for (let round = 1; round <= SOAK_ROUNDS; round++) {
        stageResults.push(await runSingleStage(200, `Stage 9 Soak Wave ${round}/${SOAK_ROUNDS} (200 Users)`));
        if (round < SOAK_ROUNDS) await sleep(500);
      }

      console.log('\n========================================================================================');
      console.log('📋 COMPLETE MULTI-STAGE CERTIFICATION MATRIX SUMMARY');
      console.log('========================================================================================');
      console.log('Stage                     | Users | Reqs | Throughput | Non-AI p95 | AI p95   | Success | Isolation | Status');
      console.log('--------------------------|-------|------|------------|------------|----------|---------|-----------|-------');
      for (const s of stageResults) {
        const stagePad = s.label.padEnd(25).slice(0, 25);
        const usersPad = String(s.concurrency).padStart(5);
        const reqsPad = String(s.totalRequests).padStart(4);
        const rpsPad = `${s.rps} rps`.padStart(10);
        const nonAiPad = `${s.nonAi.p95} ms`.padStart(10);
        const aiPad = `${s.ai.p95} ms`.padStart(8);
        const succPad = `${s.successRate}%`.padStart(7);
        const isoPad = `${s.isolationFailures === 0 ? '0 leaks' : s.isolationFailures + ' FAIL'}`.padStart(9);
        const statusPad = s.passed ? ' ✅ PASS' : ' ❌ FAIL';
        console.log(`${stagePad} | ${usersPad} | ${reqsPad} | ${rpsPad} | ${nonAiPad} | ${aiPad} | ${succPad} | ${isoPad} |${statusPad}`);
      }
      console.log('========================================================================================\n');

    } else {
      // Single stage run (e.g. 100 users)
      const res = await runSingleStage(CONCURRENCY, `Single Stage Benchmark (${CONCURRENCY} Users)`);
      stageResults.push(res);
    }
  } finally {
    // Close local server if started
    if (localServer) {
      httpAgent.destroy();
      httpsAgent.destroy();
      await new Promise((resolve) => localServer.close(resolve));
    }
  }

  const allPassed = stageResults.every((s) => s.passed);

  if (allPassed) {
    console.log(`🎉 [SUCCESS] All executed load test stages passed acceptance criteria cleanly!\n`);
    process.exit(0);
  } else {
    console.error(`❌ [FAILURE] One or more load test stages did not meet acceptance criteria.\n`);
    process.exit(1);
  }
}

runLoadTestSuite().catch((err) => {
  console.error('Load test runner encountered unhandled error:', err);
  process.exit(1);
});

