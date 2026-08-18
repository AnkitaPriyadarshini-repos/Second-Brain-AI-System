/**
 * Second Brain AI System — Conversation Sequence Test Suite
 * Verifies the 6 required conversation sequence turns:
 * 1. "Hi"
 * 2. "What is artificial intelligence?"
 * 3. "Explain recursion in C++."
 * 4. "What is the capital of Japan?"
 * 5. "Tell me more about recursion."
 * 6. Unrelated question after recursion conversation.
 */

const assert = require('assert');
const AIEngine = require('../js/ai-engine');
const AIGatewayService = require('../services/AIGatewayService');

async function runConversationTests() {
  console.log('\n====================================================');
  console.log('💬 JUNO AI — CONVERSATION SEQUENCE TEST SUITE');
  console.log('====================================================\n');

  const engine = new AIEngine();
  const gateway = new AIGatewayService();
  const history = [];

  // Mock notes representing user's vault
  const userVaultNotes = [
    { id: 'n1', title: 'Deep Learning & Neural Networks', content: 'Multi-layer neural networks extract hierarchical representations.', sourceType: 'note' },
    { id: 'n2', title: 'Distributed Systems & CAP Theorem', content: 'CAP theorem dictates availability vs consistency in network partitions.', sourceType: 'note' }
  ];

  // Turn 1: "Hi"
  console.log('Turn 1: Testing "Hi"');
  const res1 = engine.fallbackSynthesize('Hi', 'gemini-2.5-flash', '', null, history);
  assert.ok(res1.text.includes('Hi!'), 'Turn 1 must respond with natural greeting');
  assert.strictEqual(res1.grounded, false, 'Turn 1 must not be grounded in vault notes');
  assert.deepStrictEqual(res1.citations, [], 'Turn 1 citations must be empty');
  history.push({ role: 'user', content: 'Hi' });
  history.push({ role: 'assistant', content: res1.text });
  console.log('  ✅ [PASS] Turn 1: "Hi" handled naturally without fake citations');

  // Turn 2: "What is artificial intelligence?"
  console.log('\nTurn 2: Testing "What is artificial intelligence?"');
  const res2 = engine.fallbackSynthesize('What is artificial intelligence?', 'gemini-2.5-flash', '', null, history);
  assert.ok(res2.text.includes('Artificial Intelligence') || res2.text.includes('AI'), 'Turn 2 must explain AI');
  assert.strictEqual(res2.grounded, false, 'Turn 2 must be general AI knowledge');
  assert.deepStrictEqual(res2.citations, [], 'Turn 2 citations must be empty');
  history.push({ role: 'user', content: 'What is artificial intelligence?' });
  history.push({ role: 'assistant', content: res2.text });
  console.log('  ✅ [PASS] Turn 2: "What is artificial intelligence?" answered cleanly from general AI knowledge');

  // Turn 3: "Explain recursion in C++."
  console.log('\nTurn 3: Testing "Explain recursion in C++."');
  const res3 = engine.fallbackSynthesize('Explain recursion in C++.', 'gemini-2.5-flash', '', null, history);
  assert.ok(res3.text.includes('Recursion in C++') || res3.text.includes('recursion'), 'Turn 3 must explain C++ recursion');
  assert.ok(res3.text.includes('Base Case') || res3.text.includes('factorial'), 'Turn 3 must include base case and code');
  assert.strictEqual(res3.grounded, false, 'Turn 3 must be general AI knowledge');
  assert.deepStrictEqual(res3.citations, [], 'Turn 3 citations must be empty');
  history.push({ role: 'user', content: 'Explain recursion in C++.' });
  history.push({ role: 'assistant', content: res3.text });
  console.log('  ✅ [PASS] Turn 3: "Explain recursion in C++." provided detailed explanation and C++ code');

  // Turn 4: "What is the capital of Japan?" (Independent topic switch)
  console.log('\nTurn 4: Testing "What is the capital of Japan?" (Independent topic switch)');
  const res4 = engine.fallbackSynthesize('What is the capital of Japan?', 'gemini-2.5-flash', '', null, history);
  assert.ok(res4.text.includes('Tokyo'), 'Turn 4 must state Tokyo as the capital of Japan');
  assert.strictEqual(res4.text.includes('recursion'), false, 'Turn 4 must NOT bleed over recursion context');
  assert.strictEqual(res4.grounded, false, 'Turn 4 must be general AI knowledge');
  assert.deepStrictEqual(res4.citations, [], 'Turn 4 citations must be empty');
  history.push({ role: 'user', content: 'What is the capital of Japan?' });
  history.push({ role: 'assistant', content: res4.text });
  console.log('  ✅ [PASS] Turn 4: "What is the capital of Japan?" answered independently without topic bleed-over');

  // Turn 5: "Tell me more about recursion." (Follow-up to Turn 3 recursion)
  console.log('\nTurn 5: Testing "Tell me more about recursion." (Follow-up)');
  const res5 = engine.fallbackSynthesize('Tell me more about recursion.', 'gemini-2.5-flash', '', null, history);
  assert.ok(res5.text.includes('Stack') || res5.text.includes('Tail Recursion') || res5.text.includes('Deep-Dive'), 'Turn 5 must expand on recursion');
  assert.strictEqual(res5.text === res3.text, false, 'Turn 5 must NOT repeat the exact answer from Turn 3');
  assert.strictEqual(res5.grounded, false, 'Turn 5 must be general AI knowledge');
  history.push({ role: 'user', content: 'Tell me more about recursion.' });
  history.push({ role: 'assistant', content: res5.text });
  console.log('  ✅ [PASS] Turn 5: "Tell me more about recursion." expanded on advanced recursion without repeating Turn 3');

  // Turn 6: Unrelated question after recursion ("How does photosynthesis work?")
  console.log('\nTurn 6: Testing unrelated question after recursion ("How does photosynthesis work?")');
  const res6 = engine.fallbackSynthesize('How does photosynthesis work?', 'gemini-2.5-flash', '', null, history);
  assert.ok(res6.text.includes('Photosynthesis'), 'Turn 6 must explain Photosynthesis');
  assert.strictEqual(res6.text.includes('recursion'), false, 'Turn 6 must NOT bleed over recursion context');
  assert.strictEqual(res6.grounded, false, 'Turn 6 must be general AI knowledge');
  assert.deepStrictEqual(res6.citations, [], 'Turn 6 citations must be empty');
  console.log('  ✅ [PASS] Turn 6: Unrelated question answered independently without context bleed-over');

  // Test Gateway Grounding Threshold & Distinction
  console.log('\nTesting AI Gateway Grounding Distinction with Vault Notes:');
  
  // Unrelated query to vault notes -> should NOT generate citations
  const gwUnrelated = await gateway.processGatewayRequest({
    prompt: 'What is the capital of Japan?',
    contextNotes: userVaultNotes,
    userId: 'user_sequence_test'
  });
  assert.strictEqual(gwUnrelated.success, true);
  assert.deepStrictEqual(gwUnrelated.citations, [], 'Gateway must NOT cite unrelated notes');
  assert.strictEqual(gwUnrelated.verification.isGrounded, false, 'Unrelated query must not be grounded');
  console.log('  ✅ [PASS] AI Gateway correctly refrains from citing unrelated notes for general queries');

  // Relevant query to vault notes -> SHOULD generate citations
  const gwRelevant = await gateway.processGatewayRequest({
    prompt: 'What did I save about deep learning and neural networks?',
    contextNotes: userVaultNotes,
    userId: 'user_sequence_test'
  });
  assert.strictEqual(gwRelevant.success, true);
  assert.ok(gwRelevant.citations.length >= 1, 'Gateway MUST cite relevant notes when matched');
  assert.strictEqual(gwRelevant.citations[0].title, 'Deep Learning & Neural Networks');
  assert.strictEqual(gwRelevant.verification.isGrounded, true, 'Relevant query must be grounded');
  console.log('  ✅ [PASS] AI Gateway correctly cites user notes when relevant');

  console.log('\n====================================================');
  console.log('SUMMARY: ALL CONVERSATION SEQUENCE TESTS PASSED CLEANLY.');
  console.log('====================================================\n');
}

runConversationTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
