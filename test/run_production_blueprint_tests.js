/**
 * Second Brain AI System — Production Blueprint Automated Test Suite
 * Validates Security Claims, Auth Services, Secure AI Gateway, Hybrid RAG Engine, Verification Agent, and View Aliases.
 */

const assert = require('assert');
const AuthService = require('../services/AuthService');
const AIGatewayService = require('../services/AIGatewayService');
const RAGEngine = require('../js/rag-engine');

let passCount = 0;
let failCount = 0;

function runTest(description, testFn) {
  try {
    testFn();
    console.log(`  ✅ [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

console.log('\n====================================================');
console.log('🛡️ SECOND BRAIN AI — PRODUCTION BLUEPRINT TEST SUITE');
console.log('====================================================\n');

// Suite 1: Authentication & Session Token Service
console.log('Suite 1: Authentication & User Session Management');
const authService = new AuthService();

runTest('AuthService register should create user and return session token', () => {
  const result = authService.register({
    email: 'engineer@secondbrain.ai',
    password: 'securepassword123',
    name: 'Lead Engineer'
  });
  assert.strictEqual(result.success, true);
  assert.ok(result.token);
  assert.strictEqual(result.user.email, 'engineer@secondbrain.ai');
});

runTest('AuthService login should authenticate user with valid credentials', () => {
  const result = authService.login({
    email: 'engineer@secondbrain.ai',
    password: 'securepassword123'
  });
  assert.strictEqual(result.success, true);
  assert.ok(result.token);
  assert.strictEqual(result.user.name, 'Lead Engineer');
});

runTest('AuthService verifySession should return user profile for active token', () => {
  const loginRes = authService.login({ email: 'engineer@secondbrain.ai', password: 'securepassword123' });
  const session = authService.verifySession(loginRes.token);
  assert.ok(session);
  assert.strictEqual(session.email, 'engineer@secondbrain.ai');
});

// Suite 2: Secure AI Gateway & Rate Limiting
console.log('\nSuite 2: Secure AI Gateway & Rate Limiting');
const aiGatewayService = new AIGatewayService();

runTest('AIGatewayService should process query with grounded citations and verification check', () => {
  const mockNotes = [
    { title: 'Distributed Systems & CAP Theorem', content: 'In a network partition, a distributed system must choose between Availability and Consistency.', sourceType: 'note' },
    { title: 'Raft Consensus Algorithm', content: 'Raft manages replicated logs through leader election, log replication, and safety guarantees.', sourceType: 'note' }
  ];

  const response = aiGatewayService.processGatewayRequest({
    prompt: 'What is CAP theorem?',
    contextNotes: mockNotes,
    model: 'second-brain-hybrid',
    userId: 'test_user_001'
  });

  assert.strictEqual(response.success, true);
  assert.strictEqual(response.citations.length, 2);
  assert.strictEqual(response.verification.isGrounded, true);
  assert.ok(response.verification.confidenceScore >= 0.9);
});

runTest('AIGatewayService rate limiter should restrict rapid abusive queries', () => {
  const userId = 'abusive_user_99';
  let rateLimited = false;
  for (let i = 0; i < 65; i++) {
    const res = aiGatewayService.processGatewayRequest({ prompt: 'test query', userId });
    if (res.error && res.error.includes('Rate limit')) {
      rateLimited = true;
      break;
    }
  }
  assert.strictEqual(rateLimited, true);
});

// Suite 3: Hybrid RAG Engine & Citation Formatting
console.log('\nSuite 3: Hybrid RAG Engine & Citations');

runTest('RAGEngine should execute query and return grounded answer with citations', () => {
  const sampleNotes = [
    { id: 'n1', title: 'Deep Learning & Neural Networks', summary: 'Multi-layer neural networks extract hierarchical features.', content: 'Deep Learning concepts...', tags: ['AI', 'DL'] }
  ];

  const result = RAGEngine.query('What is deep learning?', sampleNotes);
  assert.ok(result.answer);
  assert.strictEqual(result.isGrounded, true);
  assert.strictEqual(result.citations.length, 1);
  assert.strictEqual(result.citations[0].title, 'Deep Learning & Neural Networks');
});

// Suite 4: Database Persistence & Storage Service
console.log('\nSuite 4: Database Persistence & Storage Service');
const DatabaseService = require('../services/DatabaseService');

runTest('DatabaseService should persist and retrieve chat history across operations', () => {
  const db = new DatabaseService();
  const testMsg = {
    id: 'msg-test-100',
    sender: 'Test Researcher',
    text: 'Persistence verification query',
    room: 'test-room',
    timestamp: Date.now()
  };

  db.saveChatMessage(testMsg);
  const history = db.getChatHistory('test-room');
  assert.ok(history.length >= 1);
  assert.strictEqual(history[history.length - 1].id, 'msg-test-100');
  db.clearChatHistory('test-room');
});

// Summary
console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${passCount + failCount} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
