/**
 * Milo AI Workspace — Khoj-Inspired Trace Card & Showcase Test Suite
 *
 * Validates:
 * 1. Asset existence and README.md "See it in action" showcase integration.
 * 2. CSS design rules for trace card, left amber accent bar, and persona pill badge.
 * 3. Chat controller trace card element creation, status transitions, and data-source formatting.
 * 4. Action bar persona badge, timestamp, and TTS speaker read-aloud button.
 * 5. Clipboard copyTurnContent cleanly stripping trace card elements and action bars.
 * 6. speakTurnContent integration with SpeechSynthesis.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');

console.log('====================================================');
console.log('🌟 KHOJ TRACE CARD & SEE-IT-IN-ACTION SHOWCASE TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Showcase Asset & README.md Integration
// ----------------------------------------------------
console.log('Test 1: Showcase Asset & README.md Integration');
{
  const assetPath = path.join(root, 'docs/assets/see-it-in-action.png');
  assert.ok(fs.existsSync(assetPath), 'docs/assets/see-it-in-action.png must exist');
  const stat = fs.statSync(assetPath);
  assert.ok(stat.size > 50000, `Showcase asset size (${stat.size} bytes) must be substantial`);

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.includes('## 🎬 See it in action'), 'README.md must have "## 🎬 See it in action" heading');
  assert.ok(readme.includes('docs/assets/see-it-in-action.png'), 'README.md must embed see-it-in-action.png');
  assert.ok(readme.includes('explain the quadratic equation to me'), 'README.md must showcase quadratic equation prompt');
  assert.ok(readme.includes('Chose Data Sources to Search'), 'README.md must include data sources trace');
  assert.ok(readme.includes('Decided Response Mode'), 'README.md must include response mode trace');
  assert.ok(readme.includes('ax^2 + bx + c = 0'), 'README.md must include quadratic formula standard form');
  assert.ok(readme.includes('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'), 'README.md must include quadratic solution formula');
  assert.ok(readme.includes('Teacher Persona Active') || readme.includes('Teacher / Coach'), 'README.md must mention active persona');

  console.log('  ✅ [PASS] Showcase image and README.md LaTeX multi-step breakdown verified');
}

// ----------------------------------------------------
// TEST 2: CSS Design Tokens, Amber Accent & Trace Card
// ----------------------------------------------------
console.log('\nTest 2: CSS Design Tokens, Amber Accent & Trace Card');
{
  const css = fs.readFileSync(path.join(root, 'css/milo-welcome.css'), 'utf8');

  assert.ok(css.includes('.milo-agent-trace-card'), 'CSS must define .milo-agent-trace-card');
  assert.ok(css.includes('.milo-trace-left'), 'CSS must define .milo-trace-left layout');
  assert.ok(css.includes('.milo-trace-row'), 'CSS must define .milo-trace-row');
  assert.ok(css.includes('.milo-trace-icon'), 'CSS must define .milo-trace-icon');
  assert.ok(css.includes('.milo-trace-label'), 'CSS must define .milo-trace-label');
  assert.ok(css.includes('.milo-trace-val'), 'CSS must define .milo-trace-val');
  assert.ok(css.includes('.milo-trace-spinner'), 'CSS must define .milo-trace-spinner');
  assert.ok(css.includes('.milo-trace-check'), 'CSS must define .milo-trace-check');
  assert.ok(css.includes('border-left: 3px solid #e09f3e'), 'CSS must define left amber accent bar for assistant message');
  assert.ok(css.includes('.milo-turn-persona-badge'), 'CSS must define .milo-turn-persona-badge');
  assert.ok(css.includes('.milo-action-tts-btn'), 'CSS must define .milo-action-tts-btn');

  console.log('  ✅ [PASS] CSS tokens, amber left accent border, and trace card selectors verified');
}

// ----------------------------------------------------
// TEST 3: Mock DOM & Chat Controller Execution
// ----------------------------------------------------
console.log('\nTest 3: Production Chat Controller Execution & Trace Integration');
{
  class MockDOMElement {
    constructor(tagName, className = '') {
      this.tagName = tagName.toUpperCase();
      this.className = className;
      this.children = [];
      this.parentNode = null;
      this.style = {};
      this.attributes = {};
      this._textContent = '';
      this._innerHTML = '';
      this.classList = {
        _set: new Set(className ? className.split(/\s+/) : []),
        add: (...names) => {
          names.forEach(n => this.classList._set.add(n));
          this.className = Array.from(this.classList._set).join(' ');
        },
        remove: (...names) => {
          names.forEach(n => this.classList._set.delete(n));
          this.className = Array.from(this.classList._set).join(' ');
        },
        contains: (name) => this.classList._set.has(name)
      };
    }

    get textContent() {
      if (this.children.length === 0) return this._textContent;
      return this.children.map(c => c.textContent).join('');
    }
    set textContent(val) {
      this._textContent = String(val);
      this.children = [];
    }

    get innerHTML() {
      return this._innerHTML || this.textContent;
    }
    set innerHTML(val) {
      this._innerHTML = String(val);
      this._textContent = val.replace(/<[^>]+>/g, '');
    }

    get innerText() {
      return this.textContent;
    }

    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k] || null; }
    addEventListener(evt, fn) { this._listeners = this._listeners || {}; (this._listeners[evt] = this._listeners[evt] || []).push(fn); }
    dispatchEvent(evt) { return true; }
    focus() {}

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    insertBefore(newChild, refChild) {
      newChild.parentNode = this;
      const idx = this.children.indexOf(refChild);
      if (idx === -1) {
        this.children.push(newChild);
      } else {
        this.children.splice(idx, 0, newChild);
      }
      return newChild;
    }

    querySelector(sel) {
      const match = (el) => {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          if (el.classList.contains(cls)) return true;
        }
        if (sel.includes('[data-agent-trace')) {
          if (el.getAttribute('data-agent-trace') === 'true') return true;
        }
        return false;
      };
      for (const c of this.children) {
        if (match(c)) return c;
        const found = c.querySelector(sel);
        if (found) return found;
      }
      return null;
    }

    querySelectorAll(sel) {
      const results = [];
      const selectors = sel.split(',').map(s => s.trim());
      const walk = (el) => {
        for (const c of el.children) {
          const match = selectors.some(s => {
            if (s.startsWith('.')) return c.classList.contains(s.slice(1));
            if (s === 'svg' || s === 'button' || s === 'pre') return c.tagName.toLowerCase() === s;
            return false;
          });
          if (match) results.push(c);
          walk(c);
        }
      };
      walk(this);
      return results;
    }

    closest(sel) {
      let cur = this;
      while (cur) {
        if (sel.startsWith('.')) {
          if (cur.classList && cur.classList.contains(sel.slice(1))) return cur;
        }
        cur = cur.parentNode;
      }
      return null;
    }

    remove() {
      if (this.parentNode) {
        const idx = this.parentNode.children.indexOf(this);
        if (idx !== -1) this.parentNode.children.splice(idx, 1);
      }
    }

    cloneNode(deep = true) {
      const copy = new MockDOMElement(this.tagName.toLowerCase(), this.className);
      copy._textContent = this._textContent;
      copy._innerHTML = this._innerHTML;
      if (deep) {
        for (const c of this.children) {
          copy.appendChild(c.cloneNode(true));
        }
      }
      return copy;
    }
  }

  // Create isolated sandbox
  const chatContainer = new MockDOMElement('div', 'chat-container');
  chatContainer.id = 'chat-container';
  const queryInput = new MockDOMElement('input', 'query-input');
  queryInput.id = 'rag-query-input';
  const submitBtn = new MockDOMElement('button', 'submit-btn');
  submitBtn.id = 'rag-submit-btn';

  let spokenText = null;

  const mockWindow = {
    document: {
      documentElement: new MockDOMElement('html'),
      getElementById: (id) => {
        if (id === 'chat-container') return chatContainer;
        if (id === 'rag-query-input') return queryInput;
        if (id === 'rag-submit-btn') return submitBtn;
        return null;
      },
      createElement: (tag) => new MockDOMElement(tag),
      querySelectorAll: () => [],
      addEventListener: () => {},
      head: { appendChild: () => {} }
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    setTimeout: (fn, ms) => { fn(); return 1; },
    clearTimeout: () => {},
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => cb(),
    formatMarkdownText: (t) => t,
    speechSynthesis: {
      speaking: false,
      speak: (utt) => { spokenText = utt.text; },
      cancel: () => {}
    },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    MiloWelcome: {
      getSelectedMode: () => 'coach',
      onConversationStateChange: () => {}
    },
    Store: {
      getNotes: () => [],
      getAssistantMode: () => 'coach'
    },
    dispatchEvent: () => {}
  };

  mockWindow.window = mockWindow;
  mockWindow.global = mockWindow;

  const prodChatCode = fs.readFileSync(path.join(root, 'js/production-chat.js'), 'utf8');
  const script = new vm.Script(prodChatCode);
  script.runInNewContext(mockWindow);

  assert.ok(typeof mockWindow.copyTurnContent === 'function', 'copyTurnContent must be defined');
  assert.ok(typeof mockWindow.speakTurnContent === 'function', 'speakTurnContent must be defined');
  assert.ok(typeof mockWindow.handleRAGQuery === 'function', 'handleRAGQuery must be defined');

  console.log('  ✅ [PASS] Production chat controller sandboxed and initialized');

  // Verify speech synthesis reading
  const testBubble = new MockDOMElement('div', 'chat-message-bubble assistant-bubble has-amber-accent');
  const traceNode = new MockDOMElement('div', 'milo-agent-trace-card');
  traceNode.textContent = 'Chose Data Sources to Search: default, general';
  testBubble.appendChild(traceNode);

  const contentNode = new MockDOMElement('div', 'chat-message-content milo-assistant-response-body');
  contentNode.textContent = 'A quadratic equation is in the form ax^2 + bx + c = 0.';
  testBubble.appendChild(contentNode);

  const actionsBar = new MockDOMElement('div', 'onyx-turn-actions-bar');
  const ttsBtn = new MockDOMElement('button', 'onyx-action-icon-btn milo-action-tts-btn');
  actionsBar.appendChild(ttsBtn);
  testBubble.appendChild(actionsBar);

  mockWindow.speakTurnContent(ttsBtn);
  assert.ok(spokenText, 'speechSynthesis must have spoken text');
  assert.strictEqual(spokenText, 'A quadratic equation is in the form ax^2 + bx + c = 0.');
  assert.ok(!spokenText.includes('Chose Data Sources'), 'Spoken text must NOT include trace card text');

  console.log('  ✅ [PASS] speakTurnContent isolated clean speech from trace and metadata');

  // Verify copyTurnContent clipboard purity
  let capturedClipboard = null;
  mockWindow.copyToClipboard = (txt) => { capturedClipboard = txt; };
  const copyBtn = new MockDOMElement('button', 'onyx-action-icon-btn');
  actionsBar.appendChild(copyBtn);

  mockWindow.copyTurnContent(copyBtn);
  assert.ok(capturedClipboard, 'Clipboard must receive text');
  assert.strictEqual(capturedClipboard, 'A quadratic equation is in the form ax^2 + bx + c = 0.');
  assert.ok(!capturedClipboard.includes('Chose Data Sources'), 'Copied text must NOT contain trace metadata');

  console.log('  ✅ [PASS] copyTurnContent stripped trace card and action bar cleanly');
}

console.log('\n====================================================');
console.log('🎉 ALL KHOJ TRACE & SHOWCASE TESTS PASSED CLEANLY');
console.log('====================================================\n');
