// ============================================
// BlogSphere AI — Content Platform
// Module: Utility Engine & Toast Notifications
// Author: Ankita Priyadarshini Pallai
// ============================================

// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
    </div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownText(mdText) {
  if (!mdText) return '';
  let html = mdText;

  // 1. Code blocks with syntax highlighting & copy/canvas header
  html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = lang.trim() || 'html';
    const rawCode = code.trim();
    const escapedCode = escapeHTML(rawCode);
    const isExecutable = /html|xml|svg|js|javascript|css|jsx|tsx|web/i.test(cleanLang) || rawCode.includes('<html') || rawCode.includes('<div') || rawCode.includes('function');

    const canvasBtn = isExecutable ? `<button class="code-copy-btn canvas-run-btn" onclick="window.runInCanvasFromBlock(this)" style="background: linear-gradient(135deg, #00f2fe, #00f2fe); color: #2c1d00; font-weight: 800; border: none; border-radius: 8px; padding: 3px 8px; margin-right: 6px; cursor: pointer;">🚀 Run in Canvas</button>` : '';

    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang-label">${cleanLang}</span>
        <div class="code-header-actions">
          ${canvasBtn}
          <button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)">📋 Copy Code</button>
        </div>
      </div>
      <pre class="code-block-content"><code class="language-${cleanLang}">${escapedCode}</code></pre>
    </div>`;
  });

  // 2. Citation chips [cite: label] or [label]
  html = html.replace(/\[cite:\s*([^\]]+)\]/g, '<span class="inline-citation-chip">📄 $1</span>');
  html = html.replace(/\[(jalandhar[^+\]]*(\+\d+)?)\]/gi, '<span class="inline-citation-chip">📄 $1</span>');

  // 3. Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 4. Headings
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3" style="font-size: 16px; font-weight: 700; color: #e3e3e3; margin: 14px 0 8px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2" style="font-size: 18px; font-weight: 700; color: #e3e3e3; margin: 16px 0 10px 0;">$1</h2>');

  // 5. Date Callout Box (📅 date highlights)
  html = html.replace(/📅\s*\*\*([^*]+)\*\*/g, '<div class="date-callout-card"><span class="date-icon">📅</span><span>$1</span></div>');

  // 6. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #ffffff; font-weight: 700;">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 7. Bullet lists
  html = html.replace(/^\s*• (.*$)/gim, '<li class="md-li" style="margin-bottom: 4px;">• $1</li>');
  html = html.replace(/^\s*[-*] (.*$)/gim, '<li class="md-li" style="margin-bottom: 4px;">• $1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul" style="list-style: none; padding-left: 0; margin: 8px 0;">$&</ul>');

  // 8. Paragraph line breaks
  html = html.replace(/\n\n/g, '<br><br>');

  return html;
}

function copyCodeFromBlock(btnEl) {
  const wrapper = btnEl.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (codeEl) {
    const text = codeEl.textContent;
    navigator.clipboard.writeText(text);
    btnEl.textContent = '✓ Copied!';
    setTimeout(() => { btnEl.textContent = '📋 Copy Code'; }, 2000);
  }
}

function runInCanvasFromBlock(btnEl) {
  const wrapper = btnEl.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (codeEl && typeof window.runInCanvas === 'function') {
    window.runInCanvas(codeEl.textContent);
  }
}

window.showToast = showToast;
window.escapeHTML = escapeHTML;
window.formatMarkdownText = formatMarkdownText;
window.copyCodeFromBlock = copyCodeFromBlock;
window.runInCanvasFromBlock = runInCanvasFromBlock;

// ------------------------------------------------------------
// Production chat bridge
// The static Juno homepage is loaded before the Next/Express demo
// chat components. This bridge is the canonical text-chat path for
// the deployed site: composer -> Vercel function -> Gemini -> UI.
// ------------------------------------------------------------
(function installProductionChatBridge() {
  function ensureChatContainer() {
    const container = document.getElementById('chat-container');
    if (!container) throw new Error('Chat container is missing from the page.');
    return container;
  }

  function scrollChat(container) {
    try {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } catch (_) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function appendMessage(role, text, options = {}) {
    const container = ensureChatContainer();
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    if (options.id) wrapper.id = options.id;

    const content = document.createElement('div');
    content.className = 'chat-message-content';
    if (options.html) {
      content.innerHTML = options.html;
    } else if (role === 'assistant' && typeof window.formatMarkdownText === 'function') {
      content.innerHTML = window.formatMarkdownText(text);
    } else {
      content.textContent = text;
    }

    wrapper.appendChild(content);
    container.appendChild(wrapper);
    scrollChat(container);
    return wrapper;
  }

  function replaceMessage(wrapper, role, text) {
    if (!wrapper) return;
    wrapper.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    const content = wrapper.querySelector('.chat-message-content') || wrapper;
    if (role === 'assistant' && typeof window.formatMarkdownText === 'function') {
      content.innerHTML = window.formatMarkdownText(text);
    } else {
      content.textContent = text;
    }
  }

  function setChatView() {
    const hero = document.getElementById('chat-hero-view');
    const stream = document.getElementById('chat-container');
    if (hero) hero.style.display = 'none';
    if (stream) {
      stream.style.display = 'flex';
      stream.style.flexDirection = 'column';
    }
  }

  async function handleRAGQuery(query) {
    const prompt = String(query || '').trim();
    if (!prompt) return;

    setChatView();
    const userMessage = appendMessage('user', prompt);
    const thinkingMessage = appendMessage('assistant', 'Thinking…', {
      id: `juno-thinking-${Date.now()}`
    });
    const startedAt = Date.now();

    try {
      const history = [];
      const response = await fetch('/api/ai/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'gemini-2.5-flash',
          history
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.answer) {
        throw new Error(data.error || `AI request failed (HTTP ${response.status}).`);
      }

      replaceMessage(thinkingMessage, 'assistant', data.answer);

      // Keep a lightweight local conversation copy for refresh/reuse.
      try {
        const saved = JSON.parse(localStorage.getItem('juno_chat_history') || '[]');
        saved.push(
          { role: 'user', content: prompt, timestamp: Date.now() },
          { role: 'model', content: data.answer, timestamp: Date.now() }
        );
        localStorage.setItem('juno_chat_history', JSON.stringify(saved.slice(-40)));
      } catch (_) {}

      if (typeof window.showToast === 'function' && Date.now() - startedAt > 15000) {
        window.showToast('Juno AI responded successfully.', 'success');
      }
    } catch (error) {
      replaceMessage(
        thinkingMessage,
        'assistant',
        `I couldn't complete that request. ${error.message || 'Please try again.'}`
      );
      if (typeof window.showToast === 'function') {
        window.showToast('AI request failed. Please try again.', 'error');
      }
      console.error('[Juno chat]', error);
    } finally {
      window.isAIProcessing = false;
      window.aiProcessingStartTime = 0;
    }
  }

  window.handleRAGQuery = handleRAGQuery;
  window.appendChatMessage = function(role, text) {
    setChatView();
    return appendMessage(role === 'ai' ? 'assistant' : role, text);
  };
})();
