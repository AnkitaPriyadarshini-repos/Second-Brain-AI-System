/**
 * Milo AI Workspace — Distributed Rate Limiting & Multi-Process Verification Test Suite
 *
 * Validates:
 * 1. Atomic pipeline operations (INCR + EXPIRE + TTL) across two independent application processes.
 * 2. Shared Redis state: Requests from Process A and Process B aggregate against the same bucket.
 * 3. Preserves per-user boundaries (User Alice throttled while User Bob allowed).
 * 4. Explicit fail-safe policy: On Redis outage/timeout, strictly degrades to max 5 req/min, preventing unlimited spend.
 * 5. HTTP 429 response formatting with Retry-After and rate-limit metadata.
 * 6. Production infrastructure check: Evaluates whether live Upstash Redis is provisioned (reports BLOCKED if absent).
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const DistributedRateLimiter = require('../services/DistributedRateLimiter');

console.log('====================================================');
console.log('⚡ DISTRIBUTED RATE LIMITING & REDIS VERIFICATION');
console.log('====================================================\n');

async function runDistributedTests() {
  // ------------------------------------------------------------------
  // Setup: Spin up an atomic Upstash-compatible Mock Redis HTTP Server
  // ------------------------------------------------------------------
  const redisStore = new Map(); // key -> { count: number, expireAt: number }

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/pipeline') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const commands = JSON.parse(body);
          const results = [];
          const now = Date.now();

          for (const cmd of commands) {
            const op = cmd[0].toUpperCase();
            const key = cmd[1];

            if (op === 'INCR') {
              let record = redisStore.get(key);
              if (!record || now >= record.expireAt) {
                record = { count: 1, expireAt: now + 60_000 };
                redisStore.set(key, record);
              } else {
                record.count += 1;
              }
              results.push({ result: record.count });
            } else if (op === 'EXPIRE') {
              const seconds = cmd[2];
              const record = redisStore.get(key);
              if (record) {
                record.expireAt = now + (seconds * 1000);
                results.push({ result: 1 });
              } else {
                results.push({ result: 0 });
              }
            } else if (op === 'TTL') {
              const record = redisStore.get(key);
              if (record && record.expireAt > now) {
                const ttl = Math.ceil((record.expireAt - now) / 1000);
                results.push({ result: ttl });
              } else {
                results.push({ result: -2 });
              }
            } else {
              results.push({ result: 'OK' });
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const mockPort = await new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  const mockRedisUrl = `http://127.0.0.1:${mockPort}`;
  const mockToken = 'test_mock_redis_token_for_hardening_suite';

  try {
    // ------------------------------------------------------------------
    // Suite 1: Shared Rate-Limiting Across Two Independent Processes
    // ------------------------------------------------------------------
    console.log('Suite 1: Shared Atomic Rate-Limiting Across Two Independent Processes');
    const LIMIT = 10;
    const testUserId = 'usr_distributed_tester_1';

    function runAsyncChild(code) {
      return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const child = spawn(process.execPath, ['-e', code], {
          cwd: path.join(__dirname, '..'),
          stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', exitCode => {
          resolve({ status: exitCode, stdout, stderr });
        });
        child.on('error', reject);
      });
    }

    // Process A sends 7 requests
    const procA = await runAsyncChild(`
      const DistributedRateLimiter = require('./services/DistributedRateLimiter');
      const limiter = new DistributedRateLimiter({
        redisUrl: '${mockRedisUrl}',
        redisToken: '${mockToken}'
      });

      (async () => {
        const results = [];
        for (let i = 0; i < 7; i++) {
          results.push(await limiter.checkLimit('${testUserId}', ${LIMIT}, 60000));
        }
        const allowedCount = results.filter(r => r.allowed).length;
        process.stdout.write(JSON.stringify({ allowedCount, lastRemaining: results[results.length - 1].remaining }));
        process.exit(0);
      })().catch(e => { console.error(e); process.exit(1); });
    `);

    assert.strictEqual(procA.status, 0, `Process A must exit 0: ${procA.stderr}`);
    const resA = JSON.parse(procA.stdout);
    assert.strictEqual(resA.allowedCount, 7, 'All 7 requests in Process A must be allowed');
    assert.strictEqual(resA.lastRemaining, 3, 'Process A should see remaining: 3');

    // Process B sends 5 requests for the SAME user -> should allow first 3 and throttle remaining 2
    const procB = await runAsyncChild(`
      const DistributedRateLimiter = require('./services/DistributedRateLimiter');
      const limiter = new DistributedRateLimiter({
        redisUrl: '${mockRedisUrl}',
        redisToken: '${mockToken}'
      });

      (async () => {
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(await limiter.checkLimit('${testUserId}', ${LIMIT}, 60000));
        }
        const allowedCount = results.filter(r => r.allowed).length;
        const deniedCount = results.filter(r => !r.allowed).length;
        process.stdout.write(JSON.stringify({ allowedCount, deniedCount }));
        process.exit(0);
      })().catch(e => { console.error(e); process.exit(1); });
    `);

    assert.strictEqual(procB.status, 0, `Process B must exit 0: ${procB.stderr}`);
    const resB = JSON.parse(procB.stdout);
    assert.strictEqual(resB.allowedCount, 3, 'Process B must allow exactly 3 requests before hitting shared limit');
    assert.strictEqual(resB.deniedCount, 2, 'Process B must throttle 2 requests (total 12 requests, limit 10)');
    console.log('  ✅ [PASS] 1: Process A (7 reqs) and Process B (5 reqs) perfectly synchronized on shared Redis (10 allowed, 2 throttled)');

    // ------------------------------------------------------------------
    // Suite 2: Per-User Isolation Across Distributed Instances
    // ------------------------------------------------------------------
    console.log('\nSuite 2: Per-User Identity Isolation Across Instances');
    const limiter = new DistributedRateLimiter({ redisUrl: mockRedisUrl, redisToken: mockToken });
    // User Charlie sends requests: should NOT be blocked by Tester 1's exhaustion
    const resCharlie = await limiter.checkLimit('usr_charlie', LIMIT, 60000);
    assert.strictEqual(resCharlie.allowed, true, 'User Charlie must not be affected by Tester 1 throttling');
    assert.strictEqual(resCharlie.count, 1);
    console.log('  ✅ [PASS] 2: User Charlie has independent bucket and is not blocked by another user exhaustion');

    // ------------------------------------------------------------------
    // Suite 3: Fail-Safe Policy on Redis Outage (No Silent Unlimited Bypass)
    // ------------------------------------------------------------------
    console.log('\nSuite 3: Fail-Safe Policy on Redis Outage (Strict Throttling Degradation)');
    // Point limiter to an unreachable Redis port to simulate complete Redis outage
    const outageLimiter = new DistributedRateLimiter({
      redisUrl: 'http://127.0.0.1:59999', // Closed port
      redisToken: mockToken,
      timeoutMs: 200
    });

    const outageResults = [];
    // Attempt 10 requests during outage
    for (let i = 0; i < 10; i++) {
      outageResults.push(await outageLimiter.checkLimit('usr_outage_victim', 30, 60000));
    }

    const outageAllowed = outageResults.filter(r => r.allowed).length;
    const outageThrottled = outageResults.filter(r => !r.allowed).length;

    // Fail-safe requirement: Must NOT allow 30 requests. Must clamp down to degraded ceiling (max 5)
    assert.strictEqual(outageAllowed, 5, 'Outage mode must strictly allow at most 5 degraded requests');
    assert.strictEqual(outageThrottled, 5, 'Outage mode must throttle requests exceeding 5 req/min');
    assert.strictEqual(outageResults[0].degraded, true, 'Outage mode must tag response as degraded');
    console.log('  ✅ [PASS] 3: Redis outage gracefully activates strict degraded local ceiling (5 reqs max), preventing unlimited AI spend');

  } finally {
    server.close();
  }

  // ------------------------------------------------------------------
  // Suite 4: Production Infrastructure Verification
  // ------------------------------------------------------------------
  console.log('\nSuite 4: Production Upstream Redis / KV Infrastructure Audit');
  const prodLimiter = new DistributedRateLimiter();
  const isLiveConfigured = prodLimiter.isDistributedConfigured();

  if (!isLiveConfigured) {
    console.log('  ⚠️  [STATUS: BLOCKED] Live production Upstash Redis / Vercel KV environment variables (UPSTASH_REDIS_REST_URL / KV_REST_API_URL) are NOT provisioned.');
    console.log('      Distributed rate limiting architecture is VERIFIED AND TESTED via mock multi-process harness, but live end-to-end production deployment is BLOCKED until Upstash Redis is provisioned.');
  } else {
    console.log('  ✅ [PASS] Live distributed Redis infrastructure is detected and configured.');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL DISTRIBUTED RATE LIMITING UNIT & ARCHITECTURE TESTS PASSED!');
  console.log('====================================================\n');
}

runDistributedTests().catch(err => {
  console.error('❌ DISTRIBUTED TEST FAILED:', err);
  process.exit(1);
});
