/**
 * Comprehensive Regression Test Suite: Chat Answer Quality, Mathematical Formatting,
 * Memory Relevance, and Model Routing.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 CHAT ANSWER QUALITY & RETRIEVAL REGRESSION TESTS');
console.log('====================================================\n');

// Set mock environment
process.env.MILO_SESSION_SECRET = 'milo_test_session_secret_for_answer_quality_32ch';
process.env.GEMINI_API_KEY = 'test_mock_gemini_key_for_regression_suite';

async function main() {
  const root = path.join(__dirname, '..');
  const utils = require(path.join(root, 'js/utils.js'));
  const HybridRetrievalEngine = require(path.join(root, 'js/hybrid-retrieval.js'));
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

  // ------------------------------------------------------------------
  // SUITE 1: General-Knowledge Isolation
  // ------------------------------------------------------------------
  console.log('Suite 1: General-Knowledge Isolation');
  {
    const hybrid = new HybridRetrievalEngine();
    const unrelatedNotes = [
      {
        id: 'note_dl_1',
        title: 'Deep Learning & Transformer Attention Mechanisms',
        summary: 'Transformers use multi-head self-attention to process tokens in parallel.',
        content: 'The attention equation Softmax(Q K^T / sqrt(d_k)) computes weight matrices across tokens. Dense layers transform projections.',
        tags: ['AI', 'Transformers', 'Deep Learning'],
        sourceType: 'note'
      },
      {
        id: 'note_dl_2',
        title: 'Deep Learning & Transformer Attention Mechanisms Part 2',
        summary: 'Positional encodings provide sequence order to attention layers.',
        content: 'Without recurrence, equation calculations require sinusoidal or learned positional vectors.',
        tags: ['AI', 'Transformers'],
        sourceType: 'note'
      },
      {
        id: 'note_dl_3',
        title: 'Deep Learning & Transformer Attention Mechanisms Part 3',
        summary: 'Layer normalization and residual connections stabilize deep transformer stacks.',
        content: 'Each sub-layer output is LayerNorm(x + Sublayer(x)). The linear equation avoids vanishing gradients.',
        tags: ['Deep Learning', 'Architecture'],
        sourceType: 'note'
      }
    ];

    const generalQuery = 'What is a quadratic equation in maths?';
    const retrievalResult = hybrid.search(generalQuery, unrelatedNotes);

    assert.strictEqual(retrievalResult.contextNotes.length, 0, 'Unrelated notes must NOT be selected for general math query');
    assert.strictEqual(retrievalResult.citations.length, 0, 'Citations must be empty for unrelated query');
    assert.strictEqual(retrievalResult.isGrounded, false, 'isGrounded must be false');

    // Test Gateway isolation
    let capturedSystemPrompt = '';
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      capturedSystemPrompt = parsedBody.systemInstruction?.parts?.[0]?.text || '';
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'A quadratic equation is a polynomial equation of degree 2: ax^2 + bx + c = 0.' }] }
          }]
        })
      };
    };

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: generalQuery,
        // Simulate client mistakenly passing unvetted notes AND unrelated legacy context
        contextNotes: unrelatedNotes,
        context: 'Legacy memory text: Deep Learning & Transformer Attention Mechanisms Softmax(Q K^T / sqrt(d_k))',
        citations: [{ id: 'note_dl_1', title: 'Deep Learning & Transformer Attention Mechanisms' }]
      }
    };
    const res = createMockRes();
    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.grounded, false, 'Gateway must NOT flag general math question as grounded in unrelated notes');
    assert.deepStrictEqual(res.body.citations, [], 'Gateway citations must be filtered out when unrelated');
    assert.ok(capturedSystemPrompt.includes('No private memory was retrieved for this request'), 'Prompt must not include unrelated notes');
    assert.ok(!capturedSystemPrompt.includes('Transformer Attention'), 'Prompt must not leak transformer notes');
    assert.ok(!capturedSystemPrompt.includes('Legacy memory text'), 'Prompt must not leak legacy context text');

    // Test unrelated legacy context ALONE (no contextNotes)
    const legacyOnlyReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: generalQuery,
        context: 'Legacy memory text: Deep Learning & Transformer Attention Mechanisms Softmax(Q K^T / sqrt(d_k))',
        citations: [{ id: 'note_dl_1', title: 'Deep Learning & Transformer Attention Mechanisms' }]
      }
    };
    const legacyOnlyRes = createMockRes();
    await handler(legacyOnlyReq, legacyOnlyRes);

    globalThis.fetch = oldFetch;

    assert.strictEqual(legacyOnlyRes.statusCode, 200);
    assert.strictEqual(legacyOnlyRes.body.grounded, false, 'Legacy-only unrelated memory must not be marked grounded');
    assert.deepStrictEqual(legacyOnlyRes.body.citations, [], 'Legacy-only citations must be empty');
    assert.ok(capturedSystemPrompt.includes('No private memory was retrieved for this request'), 'Prompt must not include legacy text');
    assert.ok(!capturedSystemPrompt.includes('Legacy memory text'), 'Prompt must not leak legacy context text');

    // 1C: "Do you remember what a quadratic equation is?" with unrelated Transformer notes in legacy context
    let prompt1C = '';
    globalThis.fetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      prompt1C = parsedBody.systemInstruction?.parts?.[0]?.text || '';
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'A quadratic equation is ax^2 + bx + c = 0.' }] } }]
        })
      };
    };
    const req1C = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: 'Do you remember what a quadratic equation is?',
        context: 'Title: Deep Learning & Transformer Attention Mechanisms\nContent: Softmax(Q K^T / sqrt(d_k)) computes token attention.',
        model: 'auto'
      }
    };
    const res1C = createMockRes();
    await handler(req1C, res1C);
    assert.strictEqual(res1C.statusCode, 200);
    assert.strictEqual(res1C.body.grounded, false);
    assert.ok(prompt1C.includes('No private memory was retrieved for this request'), 'Conversational "remember" query must NOT inject unrelated notes');
    assert.ok(!prompt1C.includes('Transformer Attention'), 'Must not leak transformer note in prompt');

    // 1D: Multi-entry legacy context: query about saved quadratic-equation notes must retrieve ONLY the matching entry
    let prompt1D = '';
    globalThis.fetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      prompt1D = parsedBody.systemInstruction?.parts?.[0]?.text || '';
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Based on your saved notes, the quadratic formula is x = (-b +- sqrt(b^2 - 4ac)) / (2a).' }] } }]
        })
      };
    };
    const multiEntryLegacyContext = [
      'Title: Quadratic Equations and Formula\nSummary: Standard polynomial form ax^2 + bx + c = 0.\nContent: Solutions are obtained by factoring, completing the square, or using the quadratic formula: x = (-b +- sqrt(b^2 - 4ac)) / (2a).',
      'Title: Deep Learning & Transformer Attention Mechanisms\nSummary: Multi-head attention across tokens.\nContent: Softmax(Q K^T / sqrt(d_k)) calculates attention weights.'
    ].join('\n\n---\n\n');

    const req1D = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: 'What did I save about quadratic equations?',
        context: multiEntryLegacyContext,
        model: 'auto'
      }
    };
    const res1D = createMockRes();
    await handler(req1D, res1D);
    assert.strictEqual(res1D.statusCode, 200);
    assert.ok(prompt1D.includes('Quadratic Equations and Formula'), 'Matching quadratic entry must be injected');
    assert.ok(!prompt1D.includes('Transformer Attention'), 'Unrelated Transformer entry must be excluded');

    // 1E: Generic query mentioning "notes" must not bypass the relevance gate
    let prompt1E = '';
    globalThis.fetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      prompt1E = parsedBody.systemInstruction?.parts?.[0]?.text || '';
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'A quadratic equation is of degree 2.' }] } }]
        })
      };
    };
    const req1E = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: 'Take note: explain quadratic equations for my math class',
        context: 'Title: Deep Learning & Transformer Attention Mechanisms\nContent: Softmax attention calculations.',
        model: 'auto'
      }
    };
    const res1E = createMockRes();
    await handler(req1E, res1E);
    globalThis.fetch = oldFetch;
    assert.strictEqual(res1E.statusCode, 200);
    assert.strictEqual(res1E.body.grounded, false);
    assert.ok(prompt1E.includes('No private memory was retrieved for this request'), 'Generic query mentioning "note" must NOT bypass relevance gate');
    assert.ok(!prompt1E.includes('Transformer Attention'), 'Must not leak transformer note');

    console.log('  ✅ [PASS] General math question excluded unrelated transformer notes, legacy context, and fake citations');
  }

  // ------------------------------------------------------------------
  // SUITE 2: Relevant Memory
  // ------------------------------------------------------------------
  console.log('\nSuite 2: Relevant Memory Retrieval & Citation Preservation');
  {
    const hybrid = new HybridRetrievalEngine();
    const vaultNotes = [
      {
        id: 'note_trans_1',
        title: 'Deep Learning & Transformer Attention Mechanisms',
        summary: 'Transformers use multi-head self-attention to process tokens in parallel.',
        content: 'The attention equation Softmax(Q K^T / sqrt(d_k)) computes weight matrices across tokens.',
        tags: ['AI', 'Transformers', 'Deep Learning'],
        sourceType: 'note'
      },
      {
        id: 'note_rec_2',
        title: 'Pasta Dough Recipe',
        summary: 'Semolina flour and egg proportions for fresh pasta.',
        content: 'Mix 200g semolina flour with 2 eggs and knead for 10 minutes.',
        tags: ['Cooking', 'Food'],
        sourceType: 'note'
      }
    ];

    const noteQuery = 'What did I save about transformer attention?';
    const retrievalResult = hybrid.search(noteQuery, vaultNotes);

    assert.ok(retrievalResult.contextNotes.length >= 1, 'Relevant transformer note must be retrieved');
    assert.strictEqual(retrievalResult.contextNotes[0].title, 'Deep Learning & Transformer Attention Mechanisms');
    assert.strictEqual(retrievalResult.isGrounded, true, 'isGrounded must be true for matching query');
    assert.ok(retrievalResult.citations.some(c => c.title.includes('Transformer Attention')));
    assert.ok(!retrievalResult.citations.some(c => c.title.includes('Pasta Dough')), 'Unrelated recipe note must be excluded');

    // Test Gateway grounding
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: 'Based on your saved notes, transformers use multi-head self-attention.' }] }
          }]
        })
      };
    };

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        prompt: noteQuery,
        contextNotes: retrievalResult.contextNotes,
        citations: retrievalResult.citations
      }
    };
    const res = createMockRes();
    await handler(req, res);
    globalThis.fetch = oldFetch;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.grounded, true, 'Gateway must confirm grounded state');
    assert.ok(res.body.citations.length >= 1, 'Gateway must preserve relevant citations');
    assert.strictEqual(res.body.citations[0].title, 'Deep Learning & Transformer Attention Mechanisms');

    console.log('  ✅ [PASS] Relevant memory retrieved, cited, and confirmed by gateway');
  }

  // ------------------------------------------------------------------
  // SUITE 3: Markdown and Math Rendering
  // ------------------------------------------------------------------
  console.log('\nSuite 3: Markdown and Mathematical Typesetting');
  {
    const sampleAssistantResponse = `# Quadratic Equation
A quadratic equation is a second-order polynomial in variable $x$:
$$ax^2 + bx + c = 0$$
where $a \\neq 0$.

The quadratic formula gives the solutions:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Key properties:
- The discriminant is $\\Delta = b^2 - 4ac$.
- Root conditions:
  1. If $\\Delta > 0$, there are two real roots.
  2. If $\\Delta = 0$, there is one repeated root.
  3. If $\\Delta < 0$, there are two complex roots.

\`\`\`python
def solve(a, b, c):
    d = (b**2 - 4*a*c) ** 0.5
    return (-b + d) / (2*a), (-b - d) / (2*a)
\`\`\`
Visit [MathWorld](https://mathworld.wolfram.com/QuadraticEquation.html) for details.`;

    // Test 3A: KaTeX / Full Math Formatting
    const rendered = utils.formatMarkdownText(sampleAssistantResponse);

    // Verify Headings, lists, code fences
    assert.ok(rendered.includes('<h1 class="md-h1">Quadratic Equation</h1>'), 'H1 heading must be rendered');
    assert.ok(rendered.includes('<ul class="md-ul">'), 'Unordered list must be rendered');
    assert.ok(rendered.includes('<ol class="md-ol">'), 'Ordered list must be rendered');
    assert.ok(rendered.includes('<pre class="code-block-content"><code class="language-python">'), 'Python code fence must be rendered');
    assert.ok(rendered.includes('📋 Copy Code'), 'Code copy button must exist');
    assert.ok(rendered.includes('<a href="https://mathworld.wolfram.com/QuadraticEquation.html"'), 'Markdown link must be rendered');

    // Verify Math Rendering: No raw $$ delimiters or raw control sequences
    assert.ok(!rendered.includes('$$ax^2'), 'Raw $$ display delimiters must NOT appear');
    assert.ok(!rendered.includes('\\frac{'), 'Raw \\frac commands must NOT appear');
    assert.ok(!rendered.includes('\\sqrt{'), 'Raw \\sqrt commands must NOT appear');
    assert.ok(!rendered.includes('\\pm'), 'Raw \\pm commands must NOT appear');
    assert.ok(!rendered.includes('\\Delta'), 'Raw \\Delta commands must NOT appear');
    assert.ok(rendered.includes('math') || rendered.includes('katex'), 'Math must be typeset');

    // Test 3B: Plain-Text Fallback without KaTeX
    const fallbackFormula = utils.renderMathFallback('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);
    assert.ok(fallbackFormula.includes('x = (-b ± √(b² - 4ac)) / 2a') || fallbackFormula.includes('±'), 'Fallback must produce readable Unicode formula');
    assert.ok(!fallbackFormula.includes('\\frac'), 'Fallback must not have raw \\frac');
    assert.ok(!fallbackFormula.includes('\\pm'), 'Fallback must not have raw \\pm');
    assert.ok(fallbackFormula.includes('math-display math-fallback'), 'Display math wrapper must be applied');

    const inlineFallback = utils.renderMathFallback('x^2', false);
    assert.ok(inlineFallback.includes('x²'), 'Inline exponent must convert to superscript');

    const discFallback = utils.renderMathFallback('\\Delta = b^2 - 4ac', false);
    assert.ok(discFallback.includes('Δ = b² - 4ac'), 'Discriminant must render Greek Delta and superscript');

    // Test 3C: XSS Sanitization
    const maliciousPayload = '<script>alert("xss")</script><svg onload="alert(1)"><img src=x onerror="alert(2)">';
    const sanitizedRender = utils.formatMarkdownText(maliciousPayload);
    assert.ok(!sanitizedRender.includes('<script>'), 'Raw script tags must NOT be present');
    assert.ok(!sanitizedRender.includes('onload='), 'Inline event handlers must be sanitized');
    assert.ok(!sanitizedRender.includes('onerror='), 'Image event handlers must be sanitized');
    // Test 3D: Backslash Handling & Terminal Continuation Normalization
    const textWithTerminalBS = 'Quadratic equation formula: \\\n$$ax^2 + bx + c = 0$$\nwatch the output \\';
    const renderedBS = utils.formatMarkdownText(textWithTerminalBS);
    assert.ok(renderedBS.includes('<br>'), 'Terminal continuation backslash must normalize to <br>');
    assert.ok(!renderedBS.includes('watch the output \\'), 'Trailing backslash at end of text must not remain raw');

    const textWithDoubleBS = 'File path: C:\\\\System32\\\\drivers';
    const renderedDBS = utils.formatMarkdownText(textWithDoubleBS);
    assert.ok(renderedDBS.includes('C:\\System32\\drivers'), 'Double backslash should resolve as single backslash');

    // Test 3E: Incomplete / Malformed Formulas Fallback
    const unclosedRoot = utils.renderMathFallback('x = \\sqrt{', false);
    assert.ok(unclosedRoot.includes('x = √'), 'Malformed unclosed \\sqrt{ must yield clean Unicode √');
    assert.ok(!unclosedRoot.includes('\\sqrt'), 'No raw \\sqrt');

    const incompleteFrac = utils.renderMathFallback('y = \\frac{1}{}', true);
    assert.ok(incompleteFrac.includes('y = 1') || incompleteFrac.includes('1'), 'Incomplete \\frac{1}{} must render numerator safely');
    assert.ok(!incompleteFrac.includes('\\frac'), 'No raw \\frac');

    console.log('  ✅ [PASS] Markdown, KaTeX & Unicode fallback math, backslash normalization, and XSS sanitization verified');
  }

  // ------------------------------------------------------------------
  // SUITE 4: Upstream Model Routing
  // ------------------------------------------------------------------
  console.log('\nSuite 4: Model Routing & Upstream Verification');
  {
    const requestedModels = [
      { requested: 'gemini-3.1-flash-lite', expectedUpstream: 'gemini-3.1-flash-lite' },
      { requested: 'gemini-3.8-flash', expectedUpstream: 'gemini-3.8-flash' },
      { requested: 'gemini-3.6-flash', expectedUpstream: 'gemini-3.6-flash' },
      { requested: 'gemini-3.5-flash-lite', expectedUpstream: 'gemini-3.5-flash-lite' },
      { requested: 'gemini-2.5-flash', expectedUpstream: 'gemini-3.5-flash-lite' } // Migrated from restricted 2.5 to unrestricted 3.5
    ];

    for (const { requested, expectedUpstream } of requestedModels) {
      let interceptedUrl = '';
      const oldFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        interceptedUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: `Answer from ${expectedUpstream}` }] } }]
          })
        };
      };

      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { prompt: `Routing test for ${requested}`, model: requested }
      };
      const res = createMockRes();
      await handler(req, res);
      globalThis.fetch = oldFetch;

      assert.strictEqual(res.statusCode, 200);
      assert.ok(interceptedUrl.includes(`/models/${expectedUpstream}:generateContent`),
        `Selecting ${requested} must target upstream URL ${expectedUpstream}, got ${interceptedUrl}`);
      assert.strictEqual(res.body.model, expectedUpstream);
    }

    console.log('  ✅ [PASS] Model selection accurately routes to exact upstream Google Gemini endpoints');
  }

  // ------------------------------------------------------------------
  // SUITE 5: Deduplicated Fallback, Bounded Retries & Thinking Budget
  // ------------------------------------------------------------------
  console.log('\nSuite 5: Deduplicated Fallbacks, Bounded Retries & Thinking Config');
  {
    // Test 5A: Thinking Config passed to models that support it
    let capturedThinkingConfig = null;
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      capturedThinkingConfig = parsedBody.generationConfig?.thinkingConfig;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Calculated response.' }] } }]
        })
      };
    };

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { prompt: 'Calculate the roots of 2x^2 + 4x - 6 = 0 step by step.', model: 'gemini-3.8-flash' }
    };
    const res = createMockRes();
    await handler(req, res);
    globalThis.fetch = oldFetch;

    assert.ok(capturedThinkingConfig, 'thinkingConfig must be passed to gemini-3.8-flash');
    assert.strictEqual(typeof capturedThinkingConfig.thinkingBudget, 'number', 'thinkingBudget must be a finite integer');
    assert.ok(capturedThinkingConfig.thinkingBudget >= 0, 'thinkingBudget must be non-negative');

    // Test 5B: Deduplicated Fallback Chain (Never retry same model under alias)
    const attemptedModels = [];
    globalThis.fetch = async (url) => {
      const match = url.match(/\/models\/([^:]+):generateContent/);
      if (match) attemptedModels.push(match[1]);
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 503, message: 'Service Unavailable' } })
      };
    };

    const failReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { prompt: 'Test outage fallback chain', model: 'gemini-3.8-flash' }
    };
    const failRes = createMockRes();
    await handler(failReq, failRes);
    globalThis.fetch = oldFetch;

    assert.strictEqual(failRes.statusCode, 502, 'Total failure must return HTTP 502');
    assert.ok(attemptedModels.length >= 2, 'Fallback must have attempted multiple tiers');

    // Verify all attempted models in the fallback chain were distinct (no duplicate models!)
    const uniqueAttempted = new Set(attemptedModels);
    assert.strictEqual(attemptedModels.length, uniqueAttempted.size,
      `Fallback chain must not attempt duplicate models: ${JSON.stringify(attemptedModels)}`);
    assert.ok(!attemptedModels.includes('gemini-2.5-flash'), 'Fallback chain must not depend on restricted gemini-2.5-flash');
    assert.ok(!attemptedModels.includes('gemini-2.5-pro'), 'Fallback chain must not depend on restricted gemini-2.5-pro');

    // Test 5C: Simple question in long chat history (>= 10 turns) using production payload (model: 'auto')
    const longHistory = [];
    for (let i = 0; i < 10; i++) {
      longHistory.push({ role: i % 2 === 0 ? 'user' : 'model', content: `Message turn ${i + 1}` });
    }
    let capturedSimpleModelUrl = '';
    let capturedSimpleThinkingConfig = null;
    globalThis.fetch = async (url, opts) => {
      capturedSimpleModelUrl = url;
      const parsedBody = JSON.parse(opts.body);
      capturedSimpleThinkingConfig = parsedBody.generationConfig?.thinkingConfig;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Paris is the capital of France.' }] } }]
        })
      };
    };

    const autoSimpleReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { prompt: 'What is the capital of France?', model: 'auto', history: longHistory }
    };
    const autoSimpleRes = createMockRes();
    await handler(autoSimpleReq, autoSimpleRes);

    assert.strictEqual(autoSimpleRes.statusCode, 200);
    assert.ok(capturedSimpleModelUrl.includes('/models/gemini-3.5-flash-lite:generateContent'),
      `Production default auto model with simple prompt must route to gemini-3.5-flash-lite, got: ${capturedSimpleModelUrl}`);
    assert.strictEqual(capturedSimpleThinkingConfig?.thinkingBudget, 0, 'Simple question thinking budget must be minimal (0)');

    // Test 5D: Explicit manual model selection must be honored over auto classifier
    let capturedManualModelUrl = '';
    globalThis.fetch = async (url) => {
      capturedManualModelUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Answer from manually chosen model.' }] } }]
        })
      };
    };

    const manualReq = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { prompt: 'What is the capital of France?', model: 'gemini-3.8-flash', history: longHistory }
    };
    const manualRes = createMockRes();
    await handler(manualReq, manualRes);
    globalThis.fetch = oldFetch;

    assert.strictEqual(manualRes.statusCode, 200);
    assert.ok(capturedManualModelUrl.includes('/models/gemini-3.8-flash:generateContent'),
      `Explicit manual selection of gemini-3.8-flash must be honored, got: ${capturedManualModelUrl}`);

    console.log('  ✅ [PASS] Auto routing, explicit manual model selection, and deduplicated 3.x fallbacks verified');
  }

  // ------------------------------------------------------------------
  // SUITE 6: Action Toolbar SVG Sanitation & Real Production Clipboard Test
  // ------------------------------------------------------------------
  console.log('\nSuite 6: Action Toolbar & SVG Artifact Isolation (Production Controller)');
  {
    const vm = require('vm');
    const chatScript = fs.readFileSync(path.join(root, 'js/production-chat.js'), 'utf8');

    // DOM harness: MockNode supporting realistic DOM manipulation
    class MockNode {
      constructor(tag = 'div', className = '') {
        this.tagName = tag.toUpperCase();
        this.className = className;
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
        this.innerHTML = '';
      }
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      }
      closest(sel) {
        let curr = this;
        while (curr) {
          const classList = (curr.className || '').split(/\s+/);
          const matchClass = sel.startsWith('.') ? classList.includes(sel.slice(1)) : false;
          const matchTag = curr.tagName.toLowerCase() === sel.toLowerCase();
          if (matchClass || matchTag) return curr;
          curr = curr.parentNode;
        }
        return null;
      }
      querySelector(sel) {
        if (sel.includes('.chat-message-content') || sel.includes('.chat-text')) {
          return this.children.find(c => c.className.includes('chat-message-content')) || null;
        }
        if (sel.includes('.onyx-turn-actions-bar')) {
          return this.children.find(c => c.className.includes('onyx-turn-actions-bar')) || null;
        }
        return null;
      }
      querySelectorAll(sel) {
        const found = [];
        const selectors = sel.split(',').map(s => s.trim());
        const walk = (node) => {
          for (const c of node.children) {
            const classList = (c.className || '').split(/\s+/);
            const matchesClass = selectors.some(s => s.startsWith('.') && classList.includes(s.slice(1)));
            const matchesTag = selectors.some(s => s.toUpperCase() === c.tagName);
            if (matchesClass || matchesTag) {
              found.push(c);
            }
            walk(c);
          }
        };
        walk(this);
        return found;
      }
      remove() {
        if (this.parentNode) {
          const idx = this.parentNode.children.indexOf(this);
          if (idx !== -1) this.parentNode.children.splice(idx, 1);
        }
      }
      cloneNode(deep) {
        const copy = new MockNode(this.tagName.toLowerCase(), this.className);
        copy.textContent = this.textContent;
        copy.innerHTML = this.innerHTML;
        if (deep) {
          for (const c of this.children) {
            copy.appendChild(c.cloneNode(true));
          }
        }
        return copy;
      }
      get innerText() {
        if (this.children.length === 0) return this.textContent;
        const direct = this.textContent ? [this.textContent] : [];
        const childTexts = this.children.map(c => c.innerText).filter(Boolean);
        return [...direct, ...childTexts].join(' ').trim();
      }
    }

    let capturedClipboardText = '';
    let capturedShareData = null;

    const mockCtx = {
      window: {},
      location: { href: 'https://second-brain-ai-system.vercel.app' },
      document: {
        readyState: 'loading',
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null
      },
      navigator: {
        clipboard: {
          writeText: (txt) => {
            capturedClipboardText = txt;
            return Promise.resolve();
          }
        },
        share: (data) => {
          capturedShareData = data;
          return Promise.resolve();
        },
        canShare: () => true
      },
      localStorage: { getItem: () => null, setItem: () => {} },
      setTimeout: () => {}
    };
    mockCtx.window = mockCtx;
    vm.createContext(mockCtx);
    vm.runInContext(chatScript, mockCtx);

    const copyTurnContent = mockCtx.window.copyTurnContent;
    const shareTurnContent = mockCtx.window.shareTurnContent;

    assert.strictEqual(typeof copyTurnContent, 'function', 'window.copyTurnContent must be loaded from production-chat.js');
    assert.strictEqual(typeof shareTurnContent, 'function', 'window.shareTurnContent must be loaded from production-chat.js');

    const bubble = new MockNode('div', 'chat-message-bubble assistant-bubble');
    const content = new MockNode('div', 'chat-message-content');
    const p = new MockNode('p');
    p.textContent = 'A quadratic equation has the form ax^2 + bx + c = 0.';
    content.appendChild(p);

    // Code block with code-header-actions
    const codeWrapper = new MockNode('div', 'code-block-wrapper');
    const codeHeader = new MockNode('div', 'code-block-header');
    const codeActions = new MockNode('div', 'code-header-actions');
    const copyCodeBtn = new MockNode('button', 'code-copy-btn');
    copyCodeBtn.textContent = '📋 Copy Code';
    codeActions.appendChild(copyCodeBtn);
    codeHeader.appendChild(codeActions);
    codeWrapper.appendChild(codeHeader);

    const pre = new MockNode('pre', 'code-block-content');
    const code = new MockNode('code', 'language-python');
    code.textContent = 'x = (-b + d) / (2*a)';
    pre.appendChild(code);
    codeWrapper.appendChild(pre);
    content.appendChild(codeWrapper);
    bubble.appendChild(content);

    // Sibling action toolbar containing 5 buttons with SVGs and text labels
    const actions = new MockNode('div', 'onyx-turn-actions-bar');
    const actionNames = ['Copy', 'Share', 'Good', 'Poor', 'Regenerate'];
    for (const name of actionNames) {
      const btn = new MockNode('button', 'onyx-action-icon-btn');
      const svg = new MockNode('svg');
      svg.textContent = 'svg'; // SVG serialization artifact
      btn.appendChild(svg);
      const label = new MockNode('span', 'sr-only');
      label.textContent = name;
      btn.appendChild(label);
      actions.appendChild(btn);
    }
    bubble.appendChild(actions);

    const copyBtn = actions.children[0];
    const shareBtn = actions.children[1];

    // Execute actual window.copyTurnContent from production-chat.js
    copyTurnContent(copyBtn);

    assert.ok(capturedClipboardText.includes('ax^2 + bx + c = 0.'), 'Copied text must include equation');
    assert.ok(capturedClipboardText.includes('x = (-b + d) / (2*a)'), 'Copied text must include code');
    assert.ok(!capturedClipboardText.includes('svg'), 'Copied text must NOT contain "svg"');
    assert.ok(!capturedClipboardText.includes('svgsvgsvgsvgsvg'), 'Copied text must NOT contain repeated "svg"');
    assert.ok(!capturedClipboardText.includes('📋 Copy Code'), 'Copied text must NOT contain code-header-actions buttons');
    assert.ok(!capturedClipboardText.includes('Copy'), 'Copied text must NOT contain toolbar button labels');

    // Execute actual window.shareTurnContent from production-chat.js
    shareTurnContent(shareBtn);
    assert.ok(capturedShareData, 'navigator.share must be called');
    assert.ok(capturedShareData.text.includes('ax^2 + bx + c = 0.'), 'Share text must include answer');
    assert.ok(!capturedShareData.text.includes('svg'), 'Share text must NOT contain "svg"');
    assert.ok(!capturedShareData.text.includes('📋 Copy Code'), 'Share text must NOT contain button labels');

    console.log('  ✅ [PASS] Production window.copyTurnContent and window.shareTurnContent verified cleanly');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL CHAT ANSWER QUALITY REGRESSION TESTS PASSED CLEANLY');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Regression test failed:', err);
  process.exit(1);
});
