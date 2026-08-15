// ============================================
// Second Brain AI — Utility Engine & Chat Bridge
// Author: Ankita Priyadarshini Pallai
// ============================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div><div class="toast-message">${message}</div>`;
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
  let html = String(mdText);

  html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = lang.trim() || 'text';
    const escapedCode = escapeHTML(code.trim());
    const isExecutable = /html|xml|svg|js|javascript|css|jsx|tsx|web/i.test(cleanLang) || code.includes('<html') || code.includes('<div') || code.includes('function');
    const canvasBtn = isExecutable
      ? `<button class="code-copy-btn canvas-run-btn" onclick="window.runInCanvasFromBlock(this)" style="background:linear-gradient(135deg,#00f2fe,#00f2fe);color:#2c1d00;font-weight:800;border:none;border-radius:8px;padding:3px 8px;margin-right:6px;cursor:pointer;">🚀 Run in Canvas</button>`
      : '';
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang-label">${cleanLang}</span><div class="code-header-actions">${canvasBtn}<button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)">📋 Copy Code</button></div></div><pre class="code-block-content"><code class="language-${cleanLang}">${escapedCode}</code></pre></div>`;
  });

  html = html.replace(/\[cite:\s*([^\]]+)\]/g, '<span class="inline-citation-chip">📄 $1</span>');
  html = html.replace(/\[(jalandhar[^+\]]*(\+\d+)?)\]/gi, '<span class="inline-citation-chip">📄 $1</span>');
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3" style="font-size:16px;font-weight:700;color:#e3e3e3;margin:14px 0 8px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2" style="font-size:18px;font-weight:700;color:#e3e3e3;margin:16px 0 10px 0;">$1</h2>');
  html = html.replace(/📅\s*\*\*([^*]+)\*\*/g, '<div class="date-callout-card"><span class="date-icon">📅</span><span>$1</span></div>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#ffffff;font-weight:700;">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*• (.*$)/gim, '<li class="md-li" style="margin-bottom:4px;">• $1</li>');
  html = html.replace(/^\s*[-*] (.*$)/gim, '<li class="md-li" style="margin-bottom:4px;">• $1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul" style="list-style:none;padding-left:0;margin:8px 0;">$&</ul>');
  html = html.replace(/\n\n/g, '<br><br>');
  return html;
}

function copyCodeFromBlock(btnEl) {
  const wrapper = btnEl && btnEl.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (codeEl && navigator.clipboard) {
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
      btnEl.textContent = '✓ Copied!';
      setTimeout(() => { btnEl.textContent = '📋 Copy Code'; }, 2000);
    }).catch(() => {});
  }
}

function runInCanvasFromBlock(btnEl) {
  const wrapper = btnEl && btnEl.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (codeEl && typeof window.runInCanvas === 'function') window.runInCanvas(codeEl.textContent);
}

window.showToast = showToast;
window.escapeHTML = escapeHTML;
window.formatMarkdownText = formatMarkdownText;
window.copyCodeFromBlock = copyCodeFromBlock;
window.runInCanvasFromBlock = runInCanvasFromBlock;

// ------------------------------------------------------------
// Production chat bridge
// ------------------------------------------------------------
(function installProductionChatBridge() {
  let busy = false;

  function ensureChatContainer() {
    const container = document.getElementById('chat-container');
    if (!container) throw new Error('Chat container is missing from the page.');
    return container;
  }

  function scrollChat(container) {
    try { container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }
    catch (_) { container.scrollTop = container.scrollHeight; }
  }

  function appendMessage(role, text, options = {}) {
    const container = ensureChatContainer();
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    if (options.id) wrapper.id = options.id;
    const content = document.createElement('div');
    content.className = 'chat-message-content';
    if (options.html) content.innerHTML = options.html;
    else if (role === 'assistant' && typeof window.formatMarkdownText === 'function') content.innerHTML = window.formatMarkdownText(text);
    else content.textContent = text;
    wrapper.appendChild(content);
    container.appendChild(wrapper);
    scrollChat(container);
    return wrapper;
  }

  function replaceMessage(wrapper, role, text) {
    if (!wrapper) return;
    wrapper.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    const content = wrapper.querySelector('.chat-message-content') || wrapper;
    if (role === 'assistant' && typeof window.formatMarkdownText === 'function') content.innerHTML = window.formatMarkdownText(text);
    else content.textContent = text;
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

  function setComposerBusy(isBusy) {
    const input = document.getElementById('rag-query-input');
    const button = document.getElementById('rag-submit-btn');
    if (input) input.disabled = isBusy;
    if (button) {
      button.disabled = isBusy;
      button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
      button.title = isBusy ? 'Juno is thinking…' : 'Send message';
    }
  }

  function getLocalHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem('juno_chat_history') || '[]');
      return Array.isArray(saved) ? saved.slice(-20) : [];
    } catch (_) { return []; }
  }

  async function handleRAGQuery(query) {
    const prompt = String(query || '').trim();
    if (!prompt || busy) return;

    busy = true;
    window.isAIProcessing = true;
    window.aiProcessingStartTime = Date.now();
    setComposerBusy(true);
    setChatView();

    appendMessage('user', prompt);
    const thinkingMessage = appendMessage('assistant', 'Thinking…', { id: `juno-thinking-${Date.now()}` });

    try {
      const response = await fetch('/api/ai/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'gemini-2.5-flash',
          history: getLocalHistory()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.answer) {
        throw new Error(data.error || `AI request failed (HTTP ${response.status}).`);
      }

      replaceMessage(thinkingMessage, 'assistant', data.answer);

      try {
        const saved = getLocalHistory();
        saved.push(
          { role: 'user', content: prompt, timestamp: Date.now() },
          { role: 'model', content: data.answer, timestamp: Date.now() }
        );
        localStorage.setItem('juno_chat_history', JSON.stringify(saved.slice(-40)));
      } catch (_) {}
    } catch (error) {
      replaceMessage(thinkingMessage, 'assistant', `I couldn't complete that request. ${error.message || 'Please try again.'}`);
      showToast(error.message || 'AI request failed. Please try again.', 'error');
      console.error('[Juno chat]', error);
    } finally {
      busy = false;
      window.isAIProcessing = false;
      window.aiProcessingStartTime = 0;
      setComposerBusy(false);
      const input = document.getElementById('rag-query-input');
      if (input) input.focus();
    }
  }

  // IMPORTANT: index.html calls this exact function from both the form submit
  // and the Enter-key handler. This was the missing link in the previous fix.
  window.submitRAGQuery = function(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const input = document.getElementById('rag-query-input');
    const prompt = input ? input.value : '';
    if (!String(prompt || '').trim() || busy) return false;
    if (input) input.value = '';
    handleRAGQuery(prompt);
    return false;
  };

  window.handleRAGQuery = handleRAGQuery;
  window.appendChatMessage = function(role, text) {
    setChatView();
    return appendMessage(role === 'ai' ? 'assistant' : role, text);
  };
})();
