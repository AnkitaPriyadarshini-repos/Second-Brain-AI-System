/**
 * Milo AI System — Unified CI Test Runner & Regression Pipeline
 * Runs all unit, integration, math, multi-tenant isolation, and RAG evaluation suites.
 */

const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

const SUITES = [
  { name: 'Unit & Core Store Suite', script: 'test/run_tests.js' },
  { name: 'WebSocket & Next.js SSR Suite', script: 'test/run_websocket_ssr_tests.js' },
  { name: 'DIP Repository Pattern Suite', script: 'test/run_dip_repository_tests.js' },
  { name: 'Layered Architecture Suite', script: 'test/run_layered_architecture_tests.js' },
  { name: 'Production Blueprint Suite', script: 'test/run_production_blueprint_tests.js' },
  { name: 'RAG Knowledge Vault Suite', script: 'test/run_rag_system_tests.js' },
  { name: 'Production Audit Suite', script: 'test/run_production_audit_tests.js' },
  { name: 'Production Chat Loader Suite', script: 'test/run_production_chat_loader_tests.js' },
  { name: 'Production Health & Security Suite', script: 'test/run_production_health_security_tests.js' },
  { name: 'Juno Gateway Regression Suite', script: 'test/run_juno_gateway_regression.js' },
  { name: 'Chat Incident Regression Suite', script: 'test/run_chat_incident_regression_tests.js' },
  { name: 'Context-Aware Workspace Suite', script: 'test/run_context_aware_workspace_tests.js' },
  { name: 'Media Coding Agent Suite', script: 'test/run_media_coding_agent_tests.js' },
  { name: 'Store Integrity Suite', script: 'test/run_store_integrity_tests.js' },
  { name: 'Robot & Clipboard Suite', script: 'test/run_robot_and_clipboard_tests.js' },
  { name: 'Session Security Suite', script: 'test/run_session_security_tests.js' },
  { name: 'Gateway Fallback Contract Suite', script: 'test/run_gateway_fallback_contract_tests.js' },
  { name: 'Browser Chat E2E Gate (Headless)', script: 'test/run_browser_chat_e2e_tests.js' },
  { name: 'Chat Answer Quality Suite', script: 'test/run_chat_answer_quality_regression_tests.js' },
  { name: 'Milo Welcome Screen Suite', script: 'test/run_milo_welcome_tests.js' },
  { name: 'Khoj Trace & Showcase Suite', script: 'test/run_khoj_trace_and_showcase_tests.js' },
  { name: 'Mathematical LaTeX Rendering Suite', script: 'test/run_math_rendering_regression_tests.js' },
  { name: 'Multi-Tenant Vault Isolation Suite', script: 'test/run_multi_tenant_isolation_tests.js' },
  { name: 'RAG Groundedness & Anti-Hallucination Suite', script: 'test/eval_rag_groundedness.js' }
];

console.log('========================================================================');
console.log('🚀 MILO CI REGRESSION PIPELINE EXECUTION');
console.log(`📋 Running ${SUITES.length} automated test suites...`);
console.log('========================================================================\n');

let passedCount = 0;
const failures = [];

for (const suite of SUITES) {
  process.stdout.write(`▶ Running: ${suite.name} (${suite.script})... `);
  const start = Date.now();
  try {
    execSync(`node ${suite.script}`, {
      cwd: root,
      stdio: 'pipe',
      timeout: 45000,
      env: { ...process.env, CI: 'true' }
    });
    const elapsed = Date.now() - start;
    console.log(`✅ PASS (${elapsed}ms)`);
    passedCount++;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`❌ FAIL (${elapsed}ms)`);
    console.error('\n--- STDOUT ---');
    console.error(err.stdout ? err.stdout.toString() : '');
    console.error('--- STDERR ---');
    console.error(err.stderr ? err.stderr.toString() : err.message);
    console.error('--------------\n');
    failures.push({ name: suite.name, script: suite.script, error: err.message });
  }
}

console.log('\n========================================================================');
console.log(`PIPELINE SUMMARY: ${passedCount} / ${SUITES.length} SUITES PASSED CLEANLY.`);
console.log('========================================================================');

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} suite(s) failed during CI pipeline execution.`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL 24 / 24 REGRESSION & EVALUATION GATES PASSED 100%.');
  process.exit(0);
}
