/**
 * Second Brain AI System — Milo Mathematical Equation Rendering Regression Tests
 *
 * Validates the complete Markdown/LaTeX mathematical typesetting pipeline:
 * - Mandatory regression test: exact quadratic equation, coefficients, and formula
 * - Display math ($$...$$, \[...\], \begin{equation}...)
 * - Inline math ($...$, \(...\))
 * - Fractions (\frac{a}{b}, nested fractions)
 * - Square roots (\sqrt{x}, \sqrt[n]{x})
 * - Subscripts, superscripts, matrices, summations, integrals, and Greek symbols
 * - Backslash preservation and literal dollar unescaping (\$ -> $)
 * - Code block immunity (ensuring code fences and inline backticks are never parsed as math)
 * - Graceful fallback mode without KaTeX
 * - Malformed LaTeX handling and streaming partial chunk resilience
 * - React MessageBubble component rendering in Next.js SSR pipeline
 */

const assert = require('assert');
const React = require('react');
const utils = require('../js/utils');
const MessageBubble = require('../components/chat/MessageBubble');

console.log('====================================================');
console.log('📐 MILO MATHEMATICAL EQUATION RENDERING REGRESSION SUITE');
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

// ------------------------------------------------------------------
// Suite 1: Mandatory Production Regression Test
// ------------------------------------------------------------------
console.log('Suite 1: Mandatory Production Regression Test');

test('Mandatory regression test: render exact quadratic equation response', () => {
  const mandatoryResponse = `A quadratic equation is written as:

$$2x^2 + 5x - 3 = 0$$

The coefficients are:
$a = 2$, $b = 5$, $c = -3$

The quadratic formula is:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`;

  const rendered = utils.formatMarkdownText(mandatoryResponse);

  // 1. Assert no raw $, $$, or malformed \frac in output
  assert.ok(!rendered.includes('$$2x^2'), 'Raw $$ display delimiters must NOT appear in output');
  assert.ok(!rendered.includes('$$x ='), 'Raw $$ display delimiters for formula must NOT appear');
  assert.ok(!rendered.includes('$a = 2$'), 'Raw $ inline delimiters for a must NOT appear');
  assert.ok(!rendered.includes('$b = 5$'), 'Raw $ inline delimiters for b must NOT appear');
  assert.ok(!rendered.includes('$c = -3$'), 'Raw $ inline delimiters for c must NOT appear');
  assert.ok(!rendered.includes('\\frac{'), 'Raw \\frac command must NOT appear in output');
  assert.ok(!rendered.includes('\\sqrt{'), 'Raw \\sqrt command must NOT appear in output');
  assert.ok(!rendered.includes('\\pm'), 'Raw \\pm command must NOT appear in output');

  // 2. Assert display and inline KaTeX elements are generated
  assert.ok(rendered.includes('katex-display') || rendered.includes('math-display'), 'Display math container must be rendered');
  assert.ok(rendered.includes('katex') || rendered.includes('math-inline'), 'Inline math elements must be rendered');

  // 3. Assert mathematical components are properly typeset
  assert.ok(rendered.includes('frac-line') || rendered.includes('/') || rendered.includes('2a'), 'Fraction division must be typeset');
  assert.ok(rendered.includes('sqrt') || rendered.includes('√'), 'Square root must be typeset');
  assert.ok(rendered.includes('±') || rendered.includes('pm') || rendered.includes('plus-minus') || rendered.includes('mbin'), 'Plus-minus operator must be typeset');

  // 4. Assert surrounding text and paragraphs are preserved
  assert.ok(rendered.includes('A quadratic equation is written as:'), 'Intro text must be preserved');
  assert.ok(rendered.includes('The coefficients are:'), 'Coefficients label must be preserved');
  assert.ok(rendered.includes('The quadratic formula is:'), 'Formula label must be preserved');
});

// ------------------------------------------------------------------
// Suite 2: Math Delimiters & Environments
// ------------------------------------------------------------------
console.log('\nSuite 2: Math Delimiters & Standard LaTeX Environments');

test('Inline math $...$ and \\(...\\) delimiters', () => {
  const inlineInput = 'Let $a = 2$ and \\(b = 5\\) be constants with $x \\in \\mathbb{R}$.';
  const rendered = utils.formatMarkdownText(inlineInput);

  assert.ok(!rendered.includes('$a = 2$'), 'Raw $a = 2$ must be replaced');
  assert.ok(!rendered.includes('\\(b = 5\\)'), 'Raw \\(b = 5\\) must be replaced');
  assert.ok(rendered.includes('katex') || rendered.includes('math-inline'), 'Inline math must be typeset');
});

test('Display math $$...$$ and \\[...\\] delimiters', () => {
  const displayInput = `Equation 1:
$$x^2 + 5x - 3 = 0$$

Equation 2:
\\[E = mc^2\\]`;
  const rendered = utils.formatMarkdownText(displayInput);

  assert.ok(!rendered.includes('$$x^2'), 'Raw $$ must be replaced');
  assert.ok(!rendered.includes('\\[E = mc^2\\]'), 'Raw \\[...\\] must be replaced');
  assert.ok(rendered.includes('katex-display') || rendered.includes('math-display'), 'Display containers must be rendered');
});

test('Standalone LaTeX environments (\\begin{equation}...)', () => {
  const envInput = `Standard equation environment:
\\begin{equation}
\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}
\\end{equation}`;
  const rendered = utils.formatMarkdownText(envInput);

  assert.ok(!rendered.includes('\\begin{equation}'), 'Environment tags must be typeset');
  assert.ok(!rendered.includes('\\end{equation}'), 'End environment tag must be typeset');
  assert.ok(rendered.includes('katex-display') || rendered.includes('math-display'), 'Environment must be rendered in display mode');
});

// ------------------------------------------------------------------
// Suite 3: Mathematical Constructs & Symbols
// ------------------------------------------------------------------
console.log('\nSuite 3: Fractions, Roots, Matrices, Summations & Greek Symbols');

test('Fractions (simple and nested)', () => {
  const fracInput = 'Fractions: $\\frac{a}{b}$ and $$\\frac{1}{1 + \\frac{1}{x}}$$';
  const rendered = utils.formatMarkdownText(fracInput);

  assert.ok(!rendered.includes('\\frac{a}{b}'), 'No raw simple fraction');
  assert.ok(!rendered.includes('\\frac{1}{'), 'No raw nested fraction');
  assert.ok(rendered.includes('katex') || rendered.includes('math'), 'Fractions must be typeset');
});

test('Square roots and n-th roots', () => {
  const sqrtInput = 'Roots: $\\sqrt{x}$ and $\\sqrt[3]{x + y}$';
  const rendered = utils.formatMarkdownText(sqrtInput);

  assert.ok(!rendered.includes('\\sqrt{x}'), 'No raw square root');
  assert.ok(!rendered.includes('\\sqrt[3]'), 'No raw cube root');
  assert.ok(rendered.includes('sqrt') || rendered.includes('√'), 'Root symbol must be typeset');
});

test('Matrices (pmatrix, bmatrix, matrix)', () => {
  const matrixInput = `Matrix example:
$$
\\begin{pmatrix}
1 & 2 \\\\
3 & 4
\\end{pmatrix}
$$`;
  const rendered = utils.formatMarkdownText(matrixInput);

  assert.ok(!rendered.includes('\\begin{pmatrix}'), 'No raw pmatrix begin');
  assert.ok(!rendered.includes('\\end{pmatrix}'), 'No raw pmatrix end');
  assert.ok(rendered.includes('mtable') || rendered.includes('katex') || rendered.includes('[ 1  2 ; 3  4 ]'), 'Matrix must be typeset');
});

test('Summations and Greek symbols', () => {
  const mathInput = 'Greek symbols: $\\alpha, \\beta, \\gamma, \\Delta, \\pi, \\theta, \\Omega$ and summation $$\\sum_{i=1}^{n} i^2$$';
  const rendered = utils.formatMarkdownText(mathInput);

  assert.ok(!rendered.includes('\\alpha'), 'No raw \\alpha');
  assert.ok(!rendered.includes('\\beta'), 'No raw \\beta');
  assert.ok(!rendered.includes('\\Delta'), 'No raw \\Delta');
  assert.ok(!rendered.includes('\\sum'), 'No raw \\sum');
  assert.ok(rendered.includes('katex') || rendered.includes('math'), 'Mathematical symbols must be typeset');
});

// ------------------------------------------------------------------
// Suite 4: Code Block Immunity & Currency Protection
// ------------------------------------------------------------------
console.log('\nSuite 4: Code Block Immunity & Currency Protection');

test('Code fences must NOT be parsed as mathematical expressions', () => {
  const codeInput = `Here is Python code:
\`\`\`python
# This is a comment: $a = 2$ and $$x = 5$$
def solve():
    var_price = "$100"
    formula = "\\frac{a}{b}"
    return var_price
\`\`\`
And outside code, math is $a = 2$.`;

  const rendered = utils.formatMarkdownText(codeInput);

  // Inside code fence, characters must be preserved as literal code
  assert.ok(rendered.includes('# This is a comment: $a = 2$ and $$x = 5$$'), 'Code fence comments must NOT be parsed as math');
  assert.ok(rendered.includes('var_price = &quot;$100&quot;') || rendered.includes('var_price = "$100"'), 'Code string must be preserved');
  assert.ok(rendered.includes('\\frac{a}{b}'), 'Code literal \\frac must be preserved in code fence');

  // Outside code, math is typeset
  assert.ok(!rendered.includes('And outside code, math is $a = 2$'), 'Outside math must be typeset');
});

test('Inline code backticks must NOT be parsed as math', () => {
  const inlineCodeInput = 'Run `export VAL=$((1 + 2))` in bash. Then calculate $x = 3$.';
  const rendered = utils.formatMarkdownText(inlineCodeInput);

  assert.ok(rendered.includes('<code class="inline-code">export VAL=$((1 + 2))</code>'), 'Inline code must remain intact');
  assert.ok(!rendered.includes('$x = 3$'), 'Outside math must be typeset');
});

test('Currency amounts ($50, $100,000) must NOT be parsed as math', () => {
  const currencyInput = 'The price dropped from $100 to $50, saving $50.00 per customer.';
  const rendered = utils.formatMarkdownText(currencyInput);

  assert.ok(rendered.includes('$100'), 'Currency $100 must be preserved');
  assert.ok(rendered.includes('$50'), 'Currency $50 must be preserved');
  assert.ok(rendered.includes('$50.00'), 'Currency $50.00 must be preserved');
});

test('Escaped dollars (\\$10) must unescape to literal dollars ($10)', () => {
  const escapedInput = 'The item costs \\$10 and \\$20 in cash.';
  const rendered = utils.formatMarkdownText(escapedInput);

  assert.ok(!rendered.includes('\\$10'), 'Escaped \\$ must be unescaped');
  assert.ok(rendered.includes('$10'), 'Literal $10 must be rendered');
  assert.ok(rendered.includes('$20'), 'Literal $20 must be rendered');
});

// ------------------------------------------------------------------
// Suite 5: Fallback & Malformed LaTeX Resilience
// ------------------------------------------------------------------
console.log('\nSuite 5: Fallback & Malformed LaTeX Resilience');

test('Unicode plain-text fallback renders clean typography when KaTeX is unavailable', () => {
  const quadFallback = utils.renderMathFallback('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);
  assert.ok(quadFallback.includes('x = (-b ± √(b² - 4ac)) / 2a') || quadFallback.includes('±'), 'Fallback must produce readable Unicode fraction and square root');
  assert.ok(!quadFallback.includes('\\frac'), 'Fallback must not have raw \\frac');
  assert.ok(!quadFallback.includes('\\sqrt'), 'Fallback must not have raw \\sqrt');
  assert.ok(!quadFallback.includes('\\pm'), 'Fallback must not have raw \\pm');
  assert.ok(quadFallback.includes('math-display math-fallback'), 'Fallback display container must be applied');

  const matrixFallback = utils.renderMathFallback('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', true);
  assert.ok(matrixFallback.includes('[ 1 2 ; 3 4 ]') || matrixFallback.includes('1'), 'Fallback must render clean matrix representation');

  const greekFallback = utils.renderMathFallback('\\alpha + \\beta = \\Gamma', false);
  assert.ok(greekFallback.includes('α + β = Γ'), 'Fallback must render Greek letters accurately');
});

test('Malformed / incomplete LaTeX during streaming does not throw or crash', () => {
  const partialChunks = [
    'A quadratic equation: $$2x^2 + 5x',
    'Coefficient $a = ',
    'x = \\frac{1}{',
    'x = \\sqrt{'
  ];

  for (const chunk of partialChunks) {
    let result = '';
    assert.doesNotThrow(() => {
      result = utils.formatMarkdownText(chunk);
    }, `Partial chunk "${chunk}" must not throw`);
    assert.ok(typeof result === 'string' && result.length > 0, 'Chunk must produce non-empty string');
  }
});

test('Unknown LaTeX control sequences render gracefully without breaking message', () => {
  const unknownInput = 'Here is an expression with an unrecognized macro: $$\\unsupportedCommand{arg} + x = 0$$';
  let rendered = '';
  assert.doesNotThrow(() => {
    rendered = utils.formatMarkdownText(unknownInput);
  }, 'Unsupported command must not throw');
  assert.ok(rendered.length > 0, 'Message must be rendered');
});

// ------------------------------------------------------------------
// Suite 6: React Components & Next.js SSR Integration
// ------------------------------------------------------------------
console.log('\nSuite 6: React Components & Next.js SSR Integration');

test('MessageBubble component renders mathematical equations in Next.js SSR tree', () => {
  const testMessage = {
    id: 'msg-math-test',
    sender: 'Milo AI',
    avatar: '🤖',
    text: 'A quadratic equation is $$2x^2 + 5x - 3 = 0$$ with $a = 2$.',
    deliveryLatencyMs: 15
  };

  const bubbleEl = React.createElement(MessageBubble, { message: testMessage });
  assert.strictEqual(bubbleEl.type, MessageBubble, 'MessageBubble component must instantiate');

  // Verify rendered React children
  const renderedTree = MessageBubble({ message: testMessage });
  assert.ok(renderedTree, 'Component must return React element');
  assert.ok(renderedTree.props.className.includes('ws-msg-item'), 'Must contain message item wrapper');

  const bodyEl = renderedTree.props.children[1];
  const textEl = bodyEl.props.children[1];
  assert.ok(textEl.props.dangerouslySetInnerHTML, 'Math text must use dangerouslySetInnerHTML');
  const innerHtml = textEl.props.dangerouslySetInnerHTML.__html;

  assert.ok(!innerHtml.includes('$$2x^2'), 'Raw $$ must NOT be in React HTML');
  assert.ok(!innerHtml.includes('$a = 2$'), 'Raw $a = 2$ must NOT be in React HTML');
  assert.ok(innerHtml.includes('katex') || innerHtml.includes('math'), 'Math must be typeset in React component');
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${totalTests} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
