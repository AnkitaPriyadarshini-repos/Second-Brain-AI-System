/**
 * Second Brain AI System — Automated Test Suite
 * Validates 100 Pre-seeded Notes, NLP, RAG, Resurfacing, and Store Synchronization
 */

const assert = require('assert');
const NLPEngine = require('../js/nlp-engine');
const RAGEngine = require('../js/rag-engine');
const ResurfacingEngine = require('../js/resurfacing-engine');

console.log('====================================================');
console.log('🧠 SECOND BRAIN AI SYSTEM — AUTOMATED SUITE');
console.log('====================================================\n');

// Polyfill minimal window/localStorage environment for Node test runner
global.window = {
  localStorage: {
    _data: {},
    getItem: function (k) { return this._data[k] || null; },
    setItem: function (k, v) { this._data[k] = v; },
    removeItem: function (k) { delete this._data[k]; }
  },
  dispatchEvent: function () { }
};

const Store = require('../js/store');

let passCount = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}\n${err.stack}`);
  }
}

// --------------------------------------------------------
// Test Suite 1: Data Store & 100 Notes Pre-Seeding
// --------------------------------------------------------
console.log('Suite 1: Data Store & 100 Notes Pre-Seeding');

test('Store should be initialized with exactly 100 pre-seeded notes', () => {
  const notes = Store.getNotes();
  assert.strictEqual(notes.length, 100, `Expected 100 notes, got ${notes.length}`);
});

test('Each pre-seeded note must have complete schema (id, title, content, summary, sourceType, dateStr, tags, entities)', () => {
  const notes = Store.getNotes();
  for (const n of notes) {
    assert.ok(n.id, 'Note missing id');
    assert.ok(n.title, 'Note missing title');
    assert.ok(n.content, 'Note missing content');
    assert.ok(n.summary, 'Note missing summary');
    assert.ok(n.sourceType, 'Note missing sourceType');
    assert.ok(n.dateStr, 'Note missing dateStr');
    assert.ok(Array.isArray(n.tags), 'Note tags must be an array');
    assert.ok(n.entities, 'Note missing entities');
  }
});

// --------------------------------------------------------
// Test Suite 2: NLP Entity Extraction & Vectorizer
// --------------------------------------------------------
console.log('\nSuite 2: NLP Engine & Entity Extraction');

test('NLP Engine should extract entities (Dates, Tech, Concepts)', () => {
  const sample = "In January 2026, Sam Altman discussed Kafka and Deep Learning with OpenAI engineers in San Francisco.";
  const entities = NLPEngine.extractEntities(sample);
  assert.ok(entities.dates.length > 0, 'Failed to extract dates');
  assert.ok(entities.tech.includes('Kafka') || entities.tech.includes('OpenAI'), 'Failed to extract tech entities');
  assert.ok(entities.people.includes('Sam Altman'), 'Failed to extract people entity');
});

test('NLP Engine should compute Cosine Similarity accurately', () => {
  const vecA = NLPEngine.createTFVector("deep learning transformers neural networks");
  const vecB = NLPEngine.createTFVector("deep learning neural models attention");
  const vecC = NLPEngine.createTFVector("urban planning density bus transit");

  const simAB = NLPEngine.cosineSimilarity(vecA, vecB);
  const simAC = NLPEngine.cosineSimilarity(vecA, vecC);

  assert.ok(simAB > simAC, `Similarity AB (${simAB}) should be greater than AC (${simAC})`);
});

// --------------------------------------------------------
// Test Suite 3: Conversational Grounded RAG Engine
// --------------------------------------------------------
console.log('\nSuite 3: Grounded RAG Engine ("Talk to Jarvis")');

test('RAG Query "What did I save about deep learning last month?" should return grounded citations', () => {
  const notes = Store.getNotes();
  const response = RAGEngine.query("What did I save about deep learning last month?", notes);

  assert.ok(response.answer, 'Response answer missing');
  assert.ok(response.citations.length > 0, 'Citations list should not be empty');
  assert.strictEqual(response.isGrounded, true, 'Response must be flagged as grounded');
});

test('RAG Query should handle sample query "What were my thoughts on the startup idea I had in January?"', () => {
  const notes = Store.getNotes();
  const response = RAGEngine.query("What were my thoughts on the startup idea I had in January?", notes);
  assert.ok(response.answer.includes('startup') || response.citations.length > 0, 'RAG query failed on startup idea');
});

test('RAGEngine session history should support multi-turn follow-up queries', () => {
  RAGEngine.resetSession();
  const notes = Store.getNotes();
  
  // Turn 1
  RAGEngine.query("Tell me about urban planning", notes);
  assert.strictEqual(RAGEngine.sessionHistory.length, 1);

  // Turn 2: Follow-up
  const followUp = RAGEngine.query("What else did I save on this topic?", notes);
  assert.strictEqual(RAGEngine.sessionHistory.length, 2);
  assert.ok(followUp.citations.length > 0, 'Follow-up query failed to retrieve context');
});

// --------------------------------------------------------
// Test Suite 4: Proactive Resurfacing Engine
// --------------------------------------------------------
console.log('\nSuite 4: Proactive Resurfacing Digest');

test('Resurfacing Engine should generate 3-5 smart recommendations with explanation reason badges', () => {
  const notes = Store.getNotes();
  const recentActivity = ["kafka", "distributed systems", "microservices"];
  const digest = ResurfacingEngine.generateDigest(notes, recentActivity, []);

  assert.ok(digest.length >= 3 && digest.length <= 5, `Expected 3-5 digest recommendations, got ${digest.length}`);
  assert.ok(digest[0].reason, 'Resurfaced item missing reason text');
  assert.ok(digest[0].note, 'Resurfaced item missing note object');
});

// --------------------------------------------------------
// Test Suite 5: Store CRUD & Ingest Operations
// --------------------------------------------------------
console.log('\nSuite 5: Store CRUD & Multi-Surface Ingest');

test('Store.addNote should insert new note with auto-generated tags & summary', () => {
  const newNote = Store.addNote({
    title: "Test Ingest Note",
    content: "Kafka event streaming and microservice decoupling using distributed partitions.",
    sourceType: "typing"
  });

  assert.ok(newNote.id, 'New note missing id');
  assert.ok(newNote.tags.length > 0, 'New note missing auto-generated tags');
  assert.strictEqual(Store.getNotes()[0].id, newNote.id, 'New note was not prepended to store');
});

test('Store.togglePin should toggle pinned state on note', () => {
  const firstNote = Store.getNotes()[0];
  const originalPinState = firstNote.pinned;
  Store.togglePin(firstNote.id);
  assert.strictEqual(Store.getNotes()[0].pinned, !originalPinState, 'Pin state did not toggle');
});

// --------------------------------------------------------
// Test Suite 6: Audio Presets Module
// --------------------------------------------------------
console.log('\nSuite 6: Audio Presets Module');

test('AudioPresets should return valid voice presets', () => {
  const AudioPresets = require('../js/audio-presets');
  const presets = AudioPresets.getAllPresets();
  assert.ok(presets.length >= 3, 'Expected at least 3 audio voice presets');
  const brainPreset = AudioPresets.getPreset('brain');
  assert.strictEqual(brainPreset.rate, 1.05);
});

// --------------------------------------------------------
// Test Suite 7: Gemini Color Flow Engine
// --------------------------------------------------------
console.log('\nSuite 7: Gemini Dynamic Color Flow Engine');

test('GeminiColorFlowEngine should initialize with theme and speed controls', () => {
  const GeminiColorFlowEngine = require('../js/gemini-color-flow');
  GeminiColorFlowEngine.setTheme('gemini-light');
  assert.strictEqual(GeminiColorFlowEngine.theme, 'gemini-light');
  assert.strictEqual(GeminiColorFlowEngine.nodes.length, 6);

  GeminiColorFlowEngine.setSpeed('swift');
  assert.strictEqual(GeminiColorFlowEngine.speedPreset, 'swift');
  assert.strictEqual(GeminiColorFlowEngine.speedMultiplier, 1.3);
});

test('GeminiColorFlowEngine should handle reactive state transitions', () => {
  const GeminiColorFlowEngine = require('../js/gemini-color-flow');
  GeminiColorFlowEngine.triggerState('thinking', 0);
  assert.strictEqual(GeminiColorFlowEngine.currentState, 'thinking');
  assert.strictEqual(GeminiColorFlowEngine.stateIntensity, 3.0);
});

// --------------------------------------------------------
// Test Suite 8: Nexus AI Fairy Bot Engine
// --------------------------------------------------------
console.log('\nSuite 8: Nexus AI Fairy Bot Engine');

test('NexusBotEngine should manage states and dialogue speech bubbles', () => {
  const NexusBotEngine = require('../js/nexus-bot');
  NexusBotEngine.setState('listening');
  assert.strictEqual(NexusBotEngine.state, 'listening');

  NexusBotEngine.setState('thinking');
  assert.strictEqual(NexusBotEngine.state, 'thinking');
});

test('NexusBotEngine should consolidate memos and queries cleanly', () => {
  const NexusBotEngine = require('../js/nexus-bot');
  const dummyNotes = [
    { title: "Kafka Partitioning Note" },
    { title: "Deep Learning Transformers" }
  ];
  NexusBotEngine.consolidateMemos(dummyNotes);
  assert.strictEqual(NexusBotEngine.recentMemos.length, 2);
  assert.strictEqual(NexusBotEngine.recentMemos[0].title, "Kafka Partitioning Note");
});

test('NexusBotEngine should support dual avatar switching between Orb Robot and Fairy Bot', () => {
  const NexusBotEngine = require('../js/nexus-bot');
  NexusBotEngine.setAvatar('blue-bot');
  assert.strictEqual(NexusBotEngine.activeAvatar, 'blue-bot');

  NexusBotEngine.setAvatar('fairy');
  assert.strictEqual(NexusBotEngine.activeAvatar, 'fairy');
});

// --------------------------------------------------------
// Test Suite 9: Developer Telemetry & Engineering Specs HUD
// --------------------------------------------------------
console.log('\nSuite 9: Developer Telemetry & Human Engineering HUD');

test('DeveloperHUDEngine should calculate latency telemetry and track system specs', () => {
  const DeveloperHUDEngine = require('../js/developer-hud');
  const startTime = performance.now() - 15;
  const latency = DeveloperHUDEngine.recordQueryLatency(startTime);
  assert.ok(latency >= 1, 'Latency should be a positive number');
  assert.strictEqual(DeveloperHUDEngine.telemetry.buildVersion, 'v3.4-prod');
});

test('DeveloperHUDEngine should inspect raw note vector schema', () => {
  const DeveloperHUDEngine = require('../js/developer-hud');
  const dummyNote = {
    id: "note-101",
    title: "Distributed Raft Consensus",
    content: "Raft consensus algorithm uses leader election and log replication across distributed nodes."
  };
  const vectorInspection = DeveloperHUDEngine.inspectNoteVector(dummyNote);
  assert.ok(vectorInspection, 'Vector inspection missing');
  assert.ok(vectorInspection.tokenCount > 5, 'Token count should be greater than 5');
  assert.ok(vectorInspection.rawVectorJson.includes('raft'), 'Vector JSON missing key terms');
});

// --------------------------------------------------------
// Test Suite 10: Goal & Milestone Management Engine
// --------------------------------------------------------
console.log('\nSuite 10: Goal & Milestone Management Engine');

test('Store should manage default learning goals', () => {
  const goals = Store.getGoals();
  assert.ok(goals.length >= 3, `Expected at least 3 default goals, got ${goals.length}`);
  assert.ok(goals[0].id, 'Goal missing id');
  assert.ok(goals[0].title, 'Goal missing title');
  assert.ok(typeof goals[0].progress === 'number', 'Goal progress should be a number');
});

test('Store.addGoal should create a new goal with linked tags', () => {
  const newGoal = Store.addGoal({
    title: 'Master Quantum Computing Fundamentals',
    category: 'Physics & Computing',
    targetDate: '2027-01-15',
    description: 'Study qubits, superposition, quantum gates, and Shor algorithm.',
    linkedTags: ['Quantum', 'Physics', 'Qubits']
  });
  assert.ok(newGoal.id.startsWith('goal-'), 'Goal id format incorrect');
  assert.strictEqual(newGoal.title, 'Master Quantum Computing Fundamentals');
  assert.strictEqual(newGoal.progress, 0);

  const updatedGoals = Store.getGoals();
  assert.strictEqual(updatedGoals[0].id, newGoal.id);
});

test('Store.updateGoalProgress should update progress percentage accurately', () => {
  const goals = Store.getGoals();
  const targetId = goals[0].id;
  Store.updateGoalProgress(targetId, 90);

  const updated = Store.getGoals().find(g => g.id === targetId);
  assert.strictEqual(updated.progress, 90);
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${totalTests} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}


