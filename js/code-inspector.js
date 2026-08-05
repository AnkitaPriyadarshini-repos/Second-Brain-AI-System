/**
 * ==========================================================================
 * LIVE CODE SYNTAX INSPECTOR ENGINE (PINTEREST PREMIUM FEATURE)
 * Interactive IDE Terminal displaying live DOM structure, code & syntax highlighting
 * ==========================================================================
 */

(function () {
  'use strict';

  const CodeInspectorEngine = {
    activeTab: 'html',

    snippets: {
      html: `<section class="hero-container">
  <div class="leaves-set">
    <div class="leaf"><img src="leaf_01.png" class="leaf-item" /></div>
    <div class="leaf"><img src="leaf_02.png" class="leaf-item" /></div>
    <div class="leaf"><img src="leaf_03.png" class="leaf-item" /></div>
    <div class="leaf"><img src="leaf_04.png" class="leaf-item" /></div>
  </div>
  <div class="juno-hub-card">
    <h2 class="hub-title">Juno AI</h2>
    <div class="input-box">
      <input type="text" placeholder="Ask Juno AI anything..." />
    </div>
    <button id="submit-btn" class="primary-gold-btn">Ask Juno AI</button>
  </div>
</section>`,

      css: `.hero-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-gold-glass);
  backdrop-filter: blur(35px);
}

.juno-hub-card {
  width: 440px;
  height: 440px;
  border-radius: 50%;
  box-shadow: 0 25px 65px rgba(180, 130, 40, 0.22);
}`,

      js: `// Second Brain RAG & Synthesis Engine
function submitJunoQuery(prompt) {
  const citations = RAGEngine.searchVault(prompt);
  const synthesis = AIEngine.generateResponse(prompt, citations);
  Store.addMessageToActiveThread({ role: 'assistant', text: synthesis });
}`
    },

    init: function () {
      this.bindEvents();
    },

    bindEvents: function () {},

    openInspector: function () {
      let modal = document.getElementById('code-inspector-modal');
      if (!modal) {
        this.createModal();
        modal = document.getElementById('code-inspector-modal');
      }
      this.renderSnippet(this.activeTab);
      modal.classList.add('active');
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    },

    closeInspector: function () {
      const modal = document.getElementById('code-inspector-modal');
      if (modal) modal.classList.remove('active');
    },

    setTab: function (tabName) {
      this.activeTab = tabName;
      document.querySelectorAll('.inspector-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });
      this.renderSnippet(tabName);
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    },

    renderSnippet: function (tabName) {
      const codeEl = document.getElementById('inspector-code-block');
      if (!codeEl) return;
      const raw = this.snippets[tabName] || '';
      codeEl.innerHTML = this.highlightSyntax(raw, tabName);
    },

    highlightSyntax: function (codeStr, lang) {
      const lines = codeStr.split('\n');
      return lines.map((line, idx) => {
        let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (lang === 'html') {
          escaped = escaped
            .replace(/&lt;(\/?[a-z0-9]+)/gi, '&lt;<span class="syntax-tag">$1</span>')
            .replace(/(class|type|placeholder|id|src)=/gi, '<span class="syntax-attr">$1</span>=')
            .replace(/"([^"]*)"/g, '"<span class="syntax-val">$1</span>"');
        } else if (lang === 'css') {
          escaped = escaped
            .replace(/(\.[a-z0-9_-]+|\:[a-z0-9_-]+)/gi, '<span class="syntax-selector">$1</span>')
            .replace(/([a-z-]+):/gi, '<span class="syntax-prop">$1</span>:')
            .replace(/(rgba?\([^)]+\)|var\([^)]+\)|#[0-9a-fA-F]+)/gi, '<span class="syntax-val">$1</span>');
        } else {
          escaped = escaped
            .replace(/(const|let|var|function|return)/g, '<span class="syntax-kw">$1</span>')
            .replace(/('.*?'|".*?")/g, '<span class="syntax-val">$1</span>');
        }

        return `<div class="code-line"><span class="line-num">${idx + 9}</span><span class="line-content">${escaped}</span></div>`;
      }).join('');
    },

    copyCode: function () {
      const raw = this.snippets[this.activeTab] || '';
      navigator.clipboard.writeText(raw);
      if (typeof showToast === 'function') showToast('📋 Code copied to clipboard!');
    },

    createModal: function () {
      const modal = document.createElement('div');
      modal.id = 'code-inspector-modal';
      modal.className = 'modal-backdrop';
      modal.onclick = (e) => { if (e.target === modal) this.closeInspector(); };

      modal.innerHTML = `
        <div class="modal-card code-inspector-card">
          <div class="inspector-header">
            <div class="inspector-window-controls">
              <span class="win-dot dot-red"></span>
              <span class="win-dot dot-yellow"></span>
              <span class="win-dot dot-green"></span>
              <span class="inspector-title">👨‍💻 Live DOM Code Inspector — Second Brain AI</span>
            </div>
            <div class="inspector-tabs">
              <button class="inspector-tab-btn active" data-tab="html" onclick="CodeInspectorEngine.setTab('html')">index.html</button>
              <button class="inspector-tab-btn" data-tab="css" onclick="CodeInspectorEngine.setTab('css')">style.css</button>
              <button class="inspector-tab-btn" data-tab="js" onclick="CodeInspectorEngine.setTab('js')">rag-engine.js</button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="CodeInspectorEngine.copyCode()">📋 Copy</button>
              <button class="inspector-close-btn" onclick="CodeInspectorEngine.closeInspector()">✕</button>
            </div>
          </div>
          <div class="inspector-body">
            <pre id="inspector-code-block" class="inspector-code-block"></pre>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }
  };

  if (typeof window !== 'undefined') {
    window.CodeInspectorEngine = CodeInspectorEngine;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => CodeInspectorEngine.init());
    } else {
      CodeInspectorEngine.init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CodeInspectorEngine;
  }
})();
