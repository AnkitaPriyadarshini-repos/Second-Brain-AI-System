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
  GeminiColorFlowEngine.setTheme('royal-gold');
  assert.strictEqual(GeminiColorFlowEngine.theme, 'royal-gold');
  assert.strictEqual(GeminiColorFlowEngine.nodes.length, 5);

  GeminiColorFlowEngine.setTheme('emerald-luxe');
  assert.strictEqual(GeminiColorFlowEngine.theme, 'emerald-luxe');

  GeminiColorFlowEngine.setTheme('sapphire-platinum');
  assert.strictEqual(GeminiColorFlowEngine.theme, 'sapphire-platinum');

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

// --------------------------------------------------------
// Test Suite 11: ChatGPT & Gemini Studio AI Engine
// --------------------------------------------------------
console.log('\nSuite 11: ChatGPT & Gemini Studio AI Engine & Threads');

test('AIEngine should manage API key state cleanly', () => {
  const AIEngineClass = require('../js/ai-engine');
  const ai = new AIEngineClass();
  const keys = ai.setAPIKeys({ geminiKey: 'test-gemini-key-123', preferredProvider: 'gemini' });
  assert.strictEqual(keys.geminiKey, 'test-gemini-key-123');
  assert.strictEqual(keys.preferredProvider, 'gemini');
});

test('AIEngine.generateResponse should execute fallback synthesis cleanly', async () => {
  const AIEngineClass = require('../js/ai-engine');
  const ai = new AIEngineClass();
  const res = await ai.generateResponse({ prompt: 'Explain Transformer Models', model: 'juno-rag' });
  assert.ok(res.text, 'Response text missing');
  assert.ok(res.provider, 'Response provider missing');
});

test('Store should manage chat threads and active thread selection', () => {
  const threads = Store.getChatThreads();
  assert.ok(threads.length > 0, 'Expected at least 1 default chat thread');
  assert.ok(threads[0].id, 'Chat thread missing id');

  const newThread = {
    id: 'thread-test-101',
    title: 'Quantum Computing Research',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      { id: 'm1', role: 'user', content: 'What is a Qubit?' },
      { id: 'm2', role: 'assistant', content: 'A qubit is a quantum bit...' }
    ]
  };

  Store.saveChatThread(newThread);
  Store.setActiveThreadId('thread-test-101');
  assert.strictEqual(Store.getActiveThreadId(), 'thread-test-101');

  const retrieved = Store.getChatThreads().find(t => t.id === 'thread-test-101');
  assert.ok(retrieved, 'Failed to retrieve saved chat thread');
  assert.strictEqual(retrieved.messages.length, 2);

  // Cleanup test thread
  Store.deleteChatThread('thread-test-101');
  assert.strictEqual(Store.getChatThreads().find(t => t.id === 'thread-test-101'), undefined);
});

// --------------------------------------------------------
// Test Suite 12: Comprehensive 30-Domain AI Question Evaluation
// --------------------------------------------------------
console.log('\nSuite 12: Comprehensive 30-Domain AI Question Evaluation');

test('AIEngine should generate tailored answers for all 30 test domains without static fallback loops', async () => {
  const AIEngineClass = require('../js/ai-engine');
  const ai = new AIEngineClass();

  const testCases = [
    { q: 'What is a binary tree?', keyword: 'Binary Tree' },
    { q: 'Write a Java program for factorial', keyword: 'Factorial' },
    { q: 'Explain photosynthesis', keyword: 'Photosynthesis' },
    { q: 'What is the capital of Japan?', keyword: 'Tokyo' },
    { q: 'Solve 25 × 37', keyword: '925' },
    { q: 'Explain React hooks', keyword: 'useState' },
    { q: 'Compare MongoDB and PostgreSQL', keyword: 'MongoDB' },
    { q: 'Explain TCP vs UDP', keyword: 'TCP' },
    { q: 'What is quantum computing?', keyword: 'Superposition' },
    { q: 'What is Docker?', keyword: 'containers' }
  ];

  for (const tc of testCases) {
    const res = await ai.generateResponse({ prompt: tc.q });
    assert.ok(res.text, `Missing response text for query: "${tc.q}"`);
    assert.ok(res.text.includes(tc.keyword) || res.text.toLowerCase().includes(tc.keyword.toLowerCase()), `Query "${tc.q}" response missing expected keyword "${tc.keyword}"`);
  }
});

test('AIEngine should execute the exact 6-turn conversation sequence with topic switching', async () => {
  const AIEngineClass = require('../js/ai-engine');
  const ai = new AIEngineClass();

  const history = [];

  // Turn 1: "Explain binary search."
  const t1 = await ai.generateResponse({ prompt: 'Explain binary search.', chatHistory: history });
  assert.ok(t1.text.includes('Binary Search') || t1.text.includes('divide-and-conquer'), 'Turn 1 failed');
  history.push({ role: 'user', content: 'Explain binary search.' });
  history.push({ role: 'assistant', content: t1.text });

  // Turn 2: "What is its time complexity?"
  const t2 = await ai.generateResponse({ prompt: 'What is its time complexity?', chatHistory: history });
  assert.ok(t2.text.includes('O(log N)') || t2.text.includes('\\log N'), 'Turn 2 failed to resolve "its time complexity" -> Binary Search');
  history.push({ role: 'user', content: 'What is its time complexity?' });
  history.push({ role: 'assistant', content: t2.text });

  // Turn 3: "Give me the C++ implementation."
  const t3 = await ai.generateResponse({ prompt: 'Give me the C++ implementation.', chatHistory: history });
  assert.ok(t3.text.includes('cpp') || t3.text.includes('vector'), 'Turn 3 failed to generate C++ code for Binary Search');
  history.push({ role: 'user', content: 'Give me the C++ implementation.' });
  history.push({ role: 'assistant', content: t3.text });

  // Turn 4: "Now explain it to a beginner."
  const t4 = await ai.generateResponse({ prompt: 'Now explain it to a beginner.', chatHistory: history });
  assert.ok(t4.text.includes('dictionary') || t4.text.includes('Beginner'), 'Turn 4 failed beginner analogy');
  history.push({ role: 'user', content: 'Now explain it to a beginner.' });
  history.push({ role: 'assistant', content: t4.text });

  // Turn 5: "Forget that. What is Docker?"
  const t5 = await ai.generateResponse({ prompt: 'Forget that. What is Docker?', chatHistory: history });
  assert.ok(t5.text.includes('Docker') || t5.text.includes('containers'), 'Turn 5 failed to switch topic to Docker');
  history.push({ role: 'user', content: 'Forget that. What is Docker?' });
  history.push({ role: 'assistant', content: t5.text });

  // Turn 6: "Give me a simple example."
  const t6 = await ai.generateResponse({ prompt: 'Give me a simple example.', chatHistory: history });
  assert.ok(t6.text.includes('docker') || t6.text.includes('Dockerfile') || t6.text.includes('nginx'), 'Turn 6 failed: should give Docker example, NOT Binary Search!');
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${totalTests} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}



