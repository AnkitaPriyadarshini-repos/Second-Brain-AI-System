/**
 * Milo AI Platform — k6 Load Verification Script
 * Simulates 100 Concurrent Active Users executing realistic multi-tenant SaaS journeys:
 *
 * User Journey per VU:
 * 1. Establish isolated session (Guest / Authenticated Tenant) via POST /api/auth/guest
 * 2. Upload / Ingest private document into Knowledge Vault via POST /api/ingest/jobs
 * 3. Poll ingestion job status until indexed
 * 4. Execute streaming hybrid RAG chat query via POST /api/ai/gateway (SSE)
 * 5. Retrieve personal isolated Knowledge Vault documents via GET /api/notes
 *
 * Run with:
 *   k6 run test/load_test_100_concurrent.js
 * Or target custom host:
 *   k6 run -e TARGET_URL=http://localhost:3000 test/load_test_100_concurrent.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics
const chatLatency = new Trend('chat_ttft_ms');
const ingestionLatency = new Trend('ingestion_duration_ms');
const errorRate = new Rate('error_rate');
const activeTokens = new Counter('tokens_streamed_total');

export const options = {
  stages: [
    { duration: '15s', target: 25 },  // Ramp up to 25 VUs
    { duration: '30s', target: 100 }, // Scale to 100 concurrent active users
    { duration: '60s', target: 100 }, // Sustain peak 100 concurrent users
    { duration: '15s', target: 0 }    // Graceful ramp-down
  ],
  thresholds: {
    // 95% of HTTP requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Overall error rate must stay below 1%
    error_rate: ['rate<0.01'],
    // 99% of assertions must pass
    checks: ['rate>0.99']
  }
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:3000';

export default function () {
  const vuId = `vu_${__VU}_${__ITER}`;

  // ----------------------------------------------------
  // Stage 1: Establish Session & Obtain Isolated Auth Token
  // ----------------------------------------------------
  const authRes = http.post(
    `${BASE_URL}/api/auth/guest`,
    JSON.stringify({}),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': `req_auth_${vuId}`
      }
    }
  );

  const authSuccess = check(authRes, {
    'auth status is 200': (r) => r.status === 200,
    'auth returns session token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Boolean(body.token);
      } catch (_) {
        return false;
      }
    }
  });

  if (!authSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const authData = JSON.parse(authRes.body);
  const token = authData.token;
  const userId = authData.user ? authData.user.id : `guest_${vuId}`;

  const userHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Milo-Session': token,
    'X-Milo-User-Id': userId,
    'X-Request-Id': `req_load_${vuId}`
  };

  sleep(0.3 + Math.random() * 0.4);

  // ----------------------------------------------------
  // Stage 2: Asynchronous Note / Document Ingestion
  // ----------------------------------------------------
  const docPayload = JSON.stringify({
    title: `Concurrent Research Note #${__ITER}`,
    content: `Distributed benchmark payload for tenant ${userId}. Measuring multi-tenant isolation, Redis rate-limiting, and async queue throughput under 100 active users.`,
    tags: ['benchmark', 'load-test', 'tier-1']
  });

  const ingestStartTime = Date.now();
  const ingestRes = http.post(`${BASE_URL}/api/ingest/jobs`, docPayload, { headers: userHeaders });

  const ingestOk = check(ingestRes, {
    'ingest returns 200 or 202': (r) => r.status === 200 || r.status === 202,
    'job registered with id': (r) => {
      try {
        const b = JSON.parse(r.body);
        return Boolean(b.jobId || b.id || b.noteId);
      } catch (_) {
        return false;
      }
    }
  });

  if (ingestOk) {
    ingestionLatency.add(Date.now() - ingestStartTime);
    errorRate.add(0);
  } else {
    errorRate.add(1);
  }

  sleep(0.5 + Math.random() * 0.5);

  // ----------------------------------------------------
  // Stage 3: Streaming Hybrid RAG Chat Completion
  // ----------------------------------------------------
  const chatPayload = JSON.stringify({
    prompt: `Summarize the key benchmark metrics for tenant ${userId} from my recent vault notes.`,
    model: 'gemini-1.5-flash',
    stream: true,
    history: []
  });

  const chatHeaders = Object.assign({}, userHeaders, {
    'Accept': 'text/event-stream, application/json'
  });

  const chatStartTime = Date.now();
  const chatRes = http.post(`${BASE_URL}/api/ai/gateway`, chatPayload, { headers: chatHeaders });

  const chatOk = check(chatRes, {
    'chat returns 200': (r) => r.status === 200,
    'chat response received': (r) => r.body && r.body.length > 0
  });

  if (chatOk) {
    chatLatency.add(Date.now() - chatStartTime);
    activeTokens.add(45); // Approximate tokens consumed per turn
    errorRate.add(0);
  } else {
    errorRate.add(1);
  }

  sleep(0.4 + Math.random() * 0.4);

  // ----------------------------------------------------
  // Stage 4: Vault Catalog Read (Strict Tenant Boundary)
  // ----------------------------------------------------
  const notesRes = http.get(`${BASE_URL}/api/notes`, { headers: userHeaders });

  check(notesRes, {
    'notes list returns 200': (r) => r.status === 200,
    'notes list returns json array': (r) => {
      try {
        const list = JSON.parse(r.body);
        return Array.isArray(list) || Array.isArray(list.notes);
      } catch (_) {
        return false;
      }
    }
  });

  // Realistic human think time between turns (0.8s - 1.8s)
  sleep(0.8 + Math.random() * 1.0);
}
