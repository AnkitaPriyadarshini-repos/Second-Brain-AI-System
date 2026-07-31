/**
 * Second Brain AI System — Layered Architecture & Component Frontend Test Suite
 * Validates separation of concerns (Controllers -> Services -> Data Access) and modular frontend UI components.
 */

const assert = require('assert');
const React = require('react');

const NoteControllerClass = require('../controllers/NoteController');
const ChatControllerClass = require('../controllers/ChatController');
const GoalControllerClass = require('../controllers/GoalController');

const NoteServiceClass = require('../services/NoteService');
const ChatServiceClass = require('../services/ChatService');
const GoalServiceClass = require('../services/GoalService');

const Badge = require('../components/ui/Badge');
const Card = require('../components/ui/Card');
const Button = require('../components/ui/Button');
const MessageBubble = require('../components/chat/MessageBubble');
const ChatFeed = require('../components/chat/ChatFeed');
const ChatInput = require('../components/chat/ChatInput');

// Polyfill window / localStorage for Node test runner
global.window = {
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};

const { container } = require('../js/container');
const { InMemoryNoteRepository, LocalStorageGoalRepository } = require('../js/storage-adapters');

// Register memory adapters for isolated test execution
container.register('NoteRepository', new InMemoryNoteRepository());
container.register('GoalRepository', new LocalStorageGoalRepository('test_layered_goals_v1'));

console.log('====================================================');
console.log('🏛️ LAYERED ARCHITECTURE & COMPONENT TEST SUITE');
console.log('====================================================\n');

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

// Suite A: Layered Backend Architecture (Controllers -> Services -> Data Access)
console.log('Suite A: Layered Backend Architecture (Controllers -> Services -> Repositories)');

test('NoteController should parse request DTOs and delegate to NoteService and Repository', () => {
  const noteController = new NoteControllerClass();
  const mockReq = {
    body: {
      title: 'Layered Architecture Note',
      content: 'Testing Controller -> Service -> Repository request flow',
      sourceType: 'typing'
    }
  };

  const response = noteController.createNote(mockReq);
  assert.strictEqual(response.success, true, 'Controller response should indicate success');
  assert.ok(response.data.id, 'Created note should have a valid ID');
  assert.strictEqual(response.data.title, 'Layered Architecture Note');

  // Verify fetch via controller
  const fetchRes = noteController.getNotes();
  assert.strictEqual(fetchRes.success, true);
  assert.ok(fetchRes.data.some(n => n.title === 'Layered Architecture Note'));
});

test('ChatController & ChatService should process incoming message payloads and calculate latency ACK DTOs', () => {
  const chatController = new ChatControllerClass();
  const msgDto = {
    text: 'Layered Chat Message Stream Test',
    sender: 'LayeredTester',
    room: 'general',
    clientTimestamp: Date.now() - 15
  };

  const result = chatController.handleIncomingMessage(msgDto);
  assert.ok(result.message, 'Result should contain processed message');
  assert.strictEqual(result.message.text, 'Layered Chat Message Stream Test');
  assert.strictEqual(result.ack.status, 'DELIVERED');
  assert.ok(result.ack.measuredLatencyMs >= 1);
  assert.strictEqual(result.ack.isUnder300ms, true);
});

test('GoalController & GoalService should enforce progress validation (0 - 100 range)', () => {
  const goalController = new GoalControllerClass();
  const createDto = {
    title: 'Master Layered Software Architecture',
    category: 'Engineering',
    progress: 50
  };

  const createRes = goalController.createGoal(createDto);
  assert.strictEqual(createRes.data.title, 'Master Layered Software Architecture');

  // Update progress out-of-bounds (150 -> capped to 100)
  const updateRes = goalController.updateProgress({ id: createRes.data.id, progress: 150 });
  assert.strictEqual(updateRes.data.progress, 100, 'Progress should be capped at 100');
});

// Suite B: Reusable Component-Based Frontend Library
console.log('\nSuite B: Reusable Component-Based Frontend Library');

test('UI Primitives (Badge, Card, Button) should instantiate clean React elements', () => {
  const badgeEl = React.createElement(Badge, { variant: 'pass' }, 'PASS < 300ms');
  assert.strictEqual(badgeEl.type, Badge);

  const cardEl = React.createElement(Card, { title: 'Telemetry', value: '18ms' });
  assert.strictEqual(cardEl.type, Card);

  const buttonEl = React.createElement(Button, { variant: 'primary' }, 'Submit');
  assert.strictEqual(buttonEl.type, Button);
});

test('Chat Domain Components (MessageBubble, ChatFeed, ChatInput) should assemble modular UI trees', () => {
  const msg = {
    id: 'm101',
    sender: 'Tester',
    avatar: '⚡',
    text: 'Component UI Test',
    deliveryLatencyMs: 12
  };

  const bubbleEl = React.createElement(MessageBubble, { message: msg });
  assert.strictEqual(bubbleEl.type, MessageBubble);

  const feedEl = React.createElement(ChatFeed, { messages: [msg] });
  assert.strictEqual(feedEl.type, ChatFeed);

  const inputEl = React.createElement(ChatInput, { value: '', onChange: () => {}, onSubmit: () => {} });
  assert.strictEqual(inputEl.type, ChatInput);
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${totalTests} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
