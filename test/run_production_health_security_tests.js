const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'ai', 'health.js'), 'utf8');

function invoke(env, method = 'GET') {
  const executable = source.replace('export default function handler', 'function handler');
  const handler = vm.runInNewContext(`${executable}\nhandler;`, { process: { env }, Date });
  const response = {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  handler({ method }, response);
  return response;
}

const notConfigured = invoke({ NODE_ENV: 'production', OTHER_SECRET_NAME: 'do-not-disclose' });
assert.strictEqual(notConfigured.statusCode, 503, 'readiness must fail while the provider key is missing');
assert.strictEqual(notConfigured.payload.configured, false);
assert.strictEqual(notConfigured.payload.ok, false);
assert.ok(!('keyDiagnostics' in notConfigured.payload), 'must not publish key diagnostics');
assert.ok(!('envKeys' in notConfigured.payload), 'must not publish environment variable names');
assert.ok(!('deploymentContext' in notConfigured.payload), 'must not publish deployment metadata');
assert.ok(!JSON.stringify(notConfigured.payload).includes('OTHER_SECRET_NAME'));

const secret = 'test-secret-that-must-not-be-returned';
const configured = invoke({ GEMINI_API_KEY: secret, VERCEL_GIT_COMMIT_SHA: 'private-sha' });
assert.strictEqual(configured.statusCode, 200);
assert.strictEqual(configured.payload.configured, true);
assert.strictEqual(configured.payload.ok, true);
assert.ok(!JSON.stringify(configured.payload).includes(secret), 'must never return the configured API key');
assert.ok(!JSON.stringify(configured.payload).includes('private-sha'), 'must not return deployment metadata');
assert.ok(!('keyDiagnostics' in configured.payload));

const wrongMethod = invoke({ GEMINI_API_KEY: secret }, 'POST');
assert.strictEqual(wrongMethod.statusCode, 405);
assert.strictEqual(wrongMethod.headers.Allow, 'GET');

console.log('PASS: public health endpoint provides readiness without exposing secrets or environment metadata.');
