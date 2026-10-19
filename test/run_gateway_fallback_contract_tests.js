/**
 * Regression Test Suite: AI Gateway Model Fallback & Contract Tests
 *
 * Verifies:
 * 1. Primary Success: Primary model (gemini-3.8-flash) responds with HTTP 200.
 * 2. Primary Failure -> Fallback Success: Primary returns 404/503 -> Fallback (gemini-3.5-flash-lite) succeeds with HTTP 200.
 * 3. Primary Timeout -> Fallback Success: Primary times out -> Fallback cleanly answers.
 * 4. Total Provider Failure: All models fail -> Safe HTTP 502 with sanitized modelAttempts.
 * 5. Secret Redaction: Upstream error messages containing sensitive tokens are redacted.
 */

const assert = require('assert');
const path = require('path');

console.log('====================================================');
console.log('🧪 GATEWAY MODEL CONTRACT & FALLBACK REGRESSION TESTS');
console.log('====================================================\n');

// Set test environment secrets
process.env.MILO_SESSION_SECRET = 'milo_test_secret_contract_99887766554433221100';
process.env.GEMINI_API_KEY = 'test_mock_gemini_key_for_contract_suite';

async function run() {
  // Dynamically import ESM gateway handler
  const gatewayModule = await import('../api/ai/gateway.js');
  const handler = gatewayModule.default;

  function createMockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; }
    };
  }

  const originalFetch = globalThis.fetch;

  try {
    // ------------------------------------------------------------------
    // Test 1: Primary Model Success
    // ------------------------------------------------------------------
    console.log('Suite 1: Primary Model Success (gemini-3.8-flash)');
    {
      const calls = [];
      globalThis.fetch = async (url, opts) => {
        calls.push({ url, method: opts?.method });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: { parts: [{ text: 'Primary model reasoning answer.' }] }
            }]
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          prompt: 'Solve this complex coding challenge step by step.',
          model: 'gemini-3.8-flash'
        }
      };
      const res = createMockRes();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200, 'Must return 200 OK');
      assert.strictEqual(res.body.success, true, 'success must be true');
      assert.strictEqual(res.body.model, 'gemini-3.8-flash', 'Model must be gemini-3.8-flash');
      assert.strictEqual(res.body.answer, 'Primary model reasoning answer.', 'Answer must match');
      assert.strictEqual(calls.length, 1, 'Only one provider call must be made');
      assert.ok(calls[0].url.includes('gemini-3.8-flash'), 'Target must be gemini-3.8-flash');
      console.log('  ✅ [PASS] Primary model succeeded directly with 200 OK');
    }

    // ------------------------------------------------------------------
    // Test 2: Primary Failure -> Fallback Success
    // ------------------------------------------------------------------
    console.log('\nSuite 2: Primary Failure (404) -> Fallback Success (gemini-3.5-flash-lite)');
    {
      const calls = [];
      globalThis.fetch = async (url, opts) => {
        calls.push({ url });
        if (url.includes('gemini-3.8-flash')) {
          // Simulate 404 on primary
          return {
            ok: false,
            status: 404,
            json: async () => ({
              error: { code: 404, message: 'models/gemini-3.8-flash is not found' }
            })
          };
        }
        // Fallback succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: { parts: [{ text: 'Fallback model response.' }] }
            }]
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          prompt: 'Architect a distributed streaming pipeline.',
          model: 'gemini-3.8-flash'
        }
      };
      const res = createMockRes();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200, 'Must return 200 OK after fallback');
      assert.strictEqual(res.body.success, true, 'success must be true');
      assert.strictEqual(res.body.model, 'gemini-3.5-flash-lite', 'Model must be fallback gemini-3.5-flash-lite');
      assert.strictEqual(res.body.answer, 'Fallback model response.', 'Answer must match fallback output');
      assert.ok(calls.length >= 2, 'Must have attempted primary then fallback');
      assert.ok(calls[0].url.includes('gemini-3.8-flash'), 'First call was primary');
      assert.ok(calls[1].url.includes('gemini-3.5-flash-lite'), 'Second call was fallback');
      console.log('  ✅ [PASS] Caught primary 404 error and cleanly recovered via fallback');
    }

    // ------------------------------------------------------------------
    // Test 3: Primary Timeout -> Fallback Success
    // ------------------------------------------------------------------
    console.log('\nSuite 3: Primary Timeout -> Fallback Success');
    {
      const calls = [];
      let primaryAttempted = false;
      globalThis.fetch = async (url, opts) => {
        calls.push({ url });
        if (!primaryAttempted && url.includes('gemini-3.8-flash')) {
          primaryAttempted = true;
          // Return 504 Gateway Timeout or throw AbortError
          return {
            ok: false,
            status: 504,
            json: async () => ({ error: { code: 504, message: 'Upstream deadline exceeded' } })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: { parts: [{ text: 'Response after primary timeout.' }] }
            }]
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          prompt: 'Explain Paxos vs Raft consensus.',
          model: 'gemini-3.8-flash'
        }
      };
      const res = createMockRes();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200, 'Must return 200 OK');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.answer, 'Response after primary timeout.');
      console.log('  ✅ [PASS] Handled primary timeout and recovered via fallback model');
    }

    // ------------------------------------------------------------------
    // Test 4: Primary 503 Overload -> Fallback Success
    // ------------------------------------------------------------------
    console.log('\nSuite 4: Primary HTTP 503 Overload -> Fallback Success');
    {
      const calls = [];
      globalThis.fetch = async (url) => {
        calls.push({ url });
        if (url.includes('gemini-3.8-flash')) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: { code: 503, message: 'Primary model overloaded' } })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{
              content: { parts: [{ text: 'Response from fallback after primary 503.' }] }
            }]
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          prompt: 'Calculate cryptographic hash collision resistance.',
          model: 'gemini-3.8-flash'
        }
      };
      const res = createMockRes();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 200, 'Must return 200 OK after primary 503 fallback');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.model, 'gemini-3.5-flash-lite');
      assert.strictEqual(res.body.answer, 'Response from fallback after primary 503.');
      console.log('  ✅ [PASS] Caught primary 503 and cleanly recovered via fallback model');
    }

    // ------------------------------------------------------------------
    // Test 5: Total Provider Failure (All Models Fail)
    // ------------------------------------------------------------------
    console.log('\nSuite 5: Total Provider Failure (Safe Error Surface & No Crashes)');
    {
      globalThis.fetch = async (url) => {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            error: {
              code: 503,
              message: 'The model is overloaded. Key AIzaSyDUMMYKEY12345678901234567890123456 failed.'
            }
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          prompt: 'Write an algorithm for graph traversal.',
          model: 'gemini-3.8-flash'
        }
      };
      const res = createMockRes();
      await handler(req, res);

      assert.strictEqual(res.statusCode, 502, 'Must return 502 Bad Gateway when all upstream models fail');
      assert.strictEqual(res.body.success, false, 'success must be false');
      assert.ok(res.body.error, 'Must provide user-friendly error message');
      assert.ok(Array.isArray(res.body.modelAttempts), 'modelAttempts array must be provided');
      assert.ok(res.body.modelAttempts.length >= 2, 'Must record multiple model attempts');

      // Verify Secret Redaction
      const serializedAttempts = JSON.stringify(res.body.modelAttempts);
      assert.ok(!serializedAttempts.includes('AIzaSyDUMMYKEY12345678901234567890123456'), 'Secrets must be redacted');
      assert.ok(serializedAttempts.includes('[REDACTED]'), 'Must replace long sensitive tokens with [REDACTED]');
      console.log('  ✅ [PASS] Total provider failure safely returned 502 with redacted modelAttempts');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL GATEWAY CONTRACT & FALLBACK TESTS PASSED');
    console.log('====================================================');

  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
