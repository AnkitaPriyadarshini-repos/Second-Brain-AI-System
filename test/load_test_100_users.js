/**
 * Second Brain AI System — 100+ Concurrent User HTTP Network Load Test Suite
 * Executes 100 concurrent HTTP requests against real Express API server endpoints (/api/notes, /api/chat/history, /api/ai/gateway).
 * Measures HTTP status codes, round-trip network latency (p50, p95), throughput (req/sec), and error rate.
 * Uses HTTP Keep-Alive connection pooling.
 * Strictly asserts exit code 1 if thresholds are not met.
 */

const http = require('http');
const express = require('express');

const NoteControllerClass = require('../controllers/NoteController');
const ChatControllerClass = require('../controllers/ChatController');
const AIGatewayControllerClass = require('../controllers/AIGatewayController');

// HTTP Keep-Alive Agent for high-throughput connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 200,
  keepAliveMsecs: 1000
});

function createTestServer(port) {
  const app = express();
  app.use(express.json());

  const noteController = new NoteControllerClass();
  const chatController = new ChatControllerClass();
  const aiGatewayController = new AIGatewayControllerClass();

  app.get('/api/notes', (req, res) => noteController.getNotes(req, res));
  app.get('/api/chat/history', (req, res) => chatController.getHistory(req, res));
  app.post('/api/ai/gateway', (req, res) => aiGatewayController.handleQuery(req, res));

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(port, () => resolve(server));
  });
}

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const reqOptions = {
      ...options,
      agent: httpAgent
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - t0;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ duration, statusCode: res.statusCode, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - t0;
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runLoadTest() {
  process.env.NODE_ENV = 'test';

  console.log('====================================================');
  console.log('⚡ SECOND BRAIN AI — 100 CONCURRENT HTTP LOAD TEST SUITE');
  console.log('====================================================\n');

  const PORT = process.env.TEST_PORT || 3099;
  const targetHost = process.env.TARGET_HOST || '127.0.0.1';
  const server = await createTestServer(PORT);

  const CONCURRENT_USERS = 100;
  const REQUESTS_PER_USER = 3;
  const TOTAL_EXPECTED = CONCURRENT_USERS * REQUESTS_PER_USER;

  const latencies = [];
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  console.log(`🚀 Launching 100 concurrent HTTP network user tasks targeting http://${targetHost}:${PORT}...`);

  const userTasks = Array.from({ length: CONCURRENT_USERS }, async (_, userIdIdx) => {
    const userId = `usr_loadtest_${userIdIdx + 1}`;
    // Micro-stagger (2ms per user) to simulate realistic user arrival spread
    await sleep(userIdIdx * 2);

    for (let reqIdx = 0; reqIdx < REQUESTS_PER_USER; reqIdx++) {
      try {
        let res;
        const headers = { 'x-user-id': userId };
        if (reqIdx === 0) {
          res = await makeHttpRequest({
            hostname: targetHost,
            port: PORT,
            path: '/api/notes',
            method: 'GET',
            headers
          });
        } else if (reqIdx === 1) {
          res = await makeHttpRequest({
            hostname: targetHost,
            port: PORT,
            path: '/api/chat/history',
            method: 'GET',
            headers
          });
        } else {
          res = await makeHttpRequest({
            hostname: targetHost,
            port: PORT,
            path: '/api/ai/gateway',
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' }
          }, {
            prompt: `HTTP load test query from synthetic user ${userId}`,
            model: 'second-brain-hybrid',
            userId
          });
        }

        latencies.push(res.duration);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }
  });

  await Promise.all(userTasks);

  // Shutdown test HTTP server & agent
  httpAgent.destroy();
  await new Promise((resolve) => server.close(resolve));

  const totalTimeMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  const throughput = ((successCount / totalTimeMs) * 1000).toFixed(1);
  const successRate = ((successCount / TOTAL_EXPECTED) * 100).toFixed(1);

  console.log('\n====================================================');
  console.log('📊 REAL HTTP BENCHMARK LOAD TEST RESULTS');
  console.log('====================================================');
  console.log(`• Concurrent HTTP Users  : ${CONCURRENT_USERS}`);
  console.log(`• HTTP Transactions      : ${latencies.length} / ${TOTAL_EXPECTED}`);
  console.log(`• Total Duration         : ${totalTimeMs} ms`);
  console.log(`• p50 Latency            : ${p50} ms`);
  console.log(`• p95 Latency            : ${p95} ms`);
  console.log(`• Avg Request Latency    : ${avgLatency} ms`);
  console.log(`• Throughput             : ${throughput} req/sec`);
  console.log(`• Success Rate           : ${successRate}% (${successCount} succeeded, ${errorCount} failed)`);
  console.log('====================================================\n');

  if (parseFloat(successRate) >= 95 && p95 < 500) {
    console.log('✅ [PASS] 100+ User HTTP Network Load Test Passed clean benchmark requirements!\n');
    process.exit(0);
  } else {
    console.error(`❌ [FAIL] Benchmark failed: Success rate ${successRate}% (target >=95%) or p95 ${p95}ms (target <500ms)\n`);
    process.exit(1);
  }
}

runLoadTest().catch(err => {
  console.error('Load test execution failed:', err);
  process.exit(1);
});
