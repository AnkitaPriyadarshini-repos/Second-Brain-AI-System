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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownText(mdText) {
  if (!mdText) return '';
  let html = mdText;

  // 1. Code blocks with syntax highlighting & copy header
  html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanLang = lang.trim() || 'code';
    const escapedCode = escapeHTML(code.trim());
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang-label">${cleanLang}</span>
        <button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)">📋 Copy Code</button>
      </div>
      <pre class="code-block-content"><code class="language-${cleanLang}">${escapedCode}</code></pre>
    </div>`;
  });

  // 2. Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 3. Headings
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');

  // 4. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 5. Bullet lists
  html = html.replace(/^\s*• (.*$)/gim, '<li class="md-li">• $1</li>');
  html = html.replace(/^\s*[-*] (.*$)/gim, '<li class="md-li">• $1</li>');
  html = html.replace(/(<li class="md-li">.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>');

  // 6. Paragraph line breaks
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

window.showToast = showToast;
window.escapeHTML = escapeHTML;
window.formatMarkdownText = formatMarkdownText;
window.copyCodeFromBlock = copyCodeFromBlock;

