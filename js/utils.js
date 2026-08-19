// ============================================
// Second Brain AI — Utility Engine
// ============================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const iconEl = document.createElement('div');
  iconEl.className = 'toast-icon';
  iconEl.textContent = icon;
  const messageEl = document.createElement('div');
  messageEl.className = 'toast-message';
  messageEl.textContent = String(message || '');
  toast.append(iconEl, messageEl);
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownText(mdText) {
  if (!mdText) return '';

  let html = escapeHTML(mdText);

  html = html.replace(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = (lang || 'text').trim() || 'text';
    const canvasBtn = /html|xml|svg|js|javascript|css|jsx|tsx|web/i.test(cleanLang)
      ? '<button class="code-copy-btn canvas-run-btn" onclick="window.runInCanvasFromBlock(this)" type="button">🚀 Run in Canvas</button>'
      : '';
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang-label">${cleanLang}</span><div class="code-header-actions">${canvasBtn}<button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)" type="button">📋 Copy Code</button></div></div><pre class="code-block-content"><code class="language-${cleanLang}">${code.trim()}</code></pre></div>`;
  });

  html = html.replace(/\[cite:\s*([^\]]+)\]/g, '<span class="inline-citation-chip">📄 $1</span>');
  html = html.replace(/\[([^\]]{1,120})\]/g, (match, label) => {
    if (/^(source|citation|ref|note|paper|doc)\b/i.test(label.trim())) {
      return `<span class="inline-citation-chip">📄 ${label}</span>`;
    }
    return match;
  });
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/📅\s*\*\*([^*]+)\*\*/g, '<div class="date-callout-card"><span class="date-icon">📅</span><span>$1</span></div>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*[-*] (.*$)/gim, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
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
// Production chat loader — parser-blocking, no first-message race
// ------------------------------------------------------------
(function installProductionChatLoader() {
  const SRC = 'js/production-chat.js?v=5.0';

  function installCaptureGuards() {
    let dispatching = false;

    function getInput() {
      return document.getElementById('rag-query-input');
    }

    async function dispatch(input, event) {
      if (dispatching) return true;
      const prompt = String(input?.value || '').trim();
      if (!prompt) return false;

      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();

      dispatching = true;
      try {
        if (typeof window.handleRAGQuery !== 'function') {
          throw new Error('Juno chat controller did not load.');
        }

        const accepted = await Promise.resolve(window.handleRAGQuery(prompt));
        if (accepted !== false && input) {
          input.value = '';
          input.style.height = 'auto';
        }
        return accepted !== false;
      } catch (error) {
        console.error('[Juno submit guard]', error);
        if (typeof window.showToast === 'function') {
          window.showToast('Juno could not start. Your message is still in the composer.', 'error');
        }
        return false;
      } finally {
        dispatching = false;
      }
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      const target = event.target;
      if (!target || target.id !== 'rag-query-input') return;
      void dispatch(target, event);
    }, true);

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!form || form.id !== 'rag-query-form') return;
      void dispatch(getInput(), event);
    }, true);

    window.submitRAGQuery = function (event) {
      return dispatch(getInput(), event);
    };
    window.junoChatReady = () => typeof window.handleRAGQuery === 'function';
  }

  if (typeof window.handleRAGQuery !== 'function' && document.readyState === 'loading') {
    document.write(`<script src="${SRC}"><\/script>`);
  }

  if (typeof window.handleRAGQuery !== 'function' && document.readyState !== 'loading') {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = false;
    document.head.appendChild(script);
  }

  installCaptureGuards();
})();
