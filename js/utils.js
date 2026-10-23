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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Robust Unicode plain-text mathematical renderer for when KaTeX is unavailable.
 * Gracefully converts common LaTeX symbols, fractions, square roots, superscripts,
 * and Greek letters into clean, human-readable Unicode mathematical typography.
 */
function renderMathFallback(latex, isDisplay) {
  let text = String(latex || '').trim();
  if (!text) return '';

  // 1. Common Greek letters
  const greek = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\Delta': 'Δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\Theta': 'Θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\Lambda': 'Λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\Pi': 'Π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\Sigma': 'Σ', '\\tau': 'τ', '\\phi': 'φ', '\\Phi': 'Φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω', '\\Omega': 'Ω'
  };
  for (const [k, v] of Object.entries(greek)) {
    text = text.split(k).join(v);
  }

  // 2. Mathematical operators & relations
  const symbols = {
    '\\pm': '±', '\\mp': '∓', '\\times': '×', '\\cdot': '·', '\\div': '÷',
    '\\approx': '≈', '\\neq': '≠', '\\ne': '≠', '\\leq': '≤', '\\le': '≤',
    '\\geq': '≥', '\\ge': '≥', '\\infty': '∞', '\\sum': '∑', '\\prod': '∏',
    '\\int': '∫', '\\partial': '∂', '\\nabla': '∇', '\\in': '∈', '\\notin': '∉',
    '\\subset': '⊂', '\\subseteq': '⊆', '\\cup': '∪', '\\cap': '∩',
    '\\forall': '∀', '\\exists': '∃', '\\to': '→', '\\rightarrow': '→',
    '\\Leftarrow': '⇐', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔',
    '\\ldots': '…', '\\cdots': '…', '\\quad': '  ', '\\qquad': '    ',
    '\\,': ' ', '\\;': ' ', '\\:': ' ', '\\!': ''
  };
  for (const [k, v] of Object.entries(symbols)) {
    text = text.split(k).join(v);
  }

  // 3. Square roots: \sqrt[n]{x} and \sqrt{x}
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '^($1)√($2)');
  text = text.replace(/\\sqrt\{([^}]+)\}/g, (m, inner) => '√(' + inner.trim() + ')');

  // 4. Fractions \frac{num}{den}
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(text)) {
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (m, n, d) => {
      n = n.trim();
      d = d.trim();
      const wrapN = /[\s+\-*/=±]/.test(n) ? `(${n})` : n;
      const wrapD = /[\s+\-*/=±]/.test(d) ? `(${d})` : d;
      return `${wrapN} / ${wrapD}`;
    });
  }

  // 5. Superscripts and Subscripts
  const supers = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
  };
  const subs = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ'
  };

  text = text.replace(/\^\{([0-9+\-nixy]+)\}/g, (m, digits) => digits.split('').map((c) => supers[c] || c).join(''));
  text = text.replace(/\^([0-9+\-nixy])/g, (m, c) => supers[c] || c);
  text = text.replace(/\^\{([^}]+)\}/g, '^($1)');

  text = text.replace(/_\{([0-9+\-aeoxijk]+)\}/g, (m, digits) => digits.split('').map((c) => subs[c] || c).join(''));
  text = text.replace(/_([0-9+\-aeoxijk])/g, (m, c) => subs[c] || c);
  text = text.replace(/_\{([^}]+)\}/g, '_($1)');

  // 6. Formatting wrappers \text{...}, \mathrm{...}, \mathbf{...}, \left, \right
  text = text.replace(/\\(?:text|mathrm|mathbf|mathit|textbf)\{([^}]+)\}/g, '$1');
  text = text.replace(/\\left([([{}|])/g, '$1');
  text = text.replace(/\\right([)\]{}]|\|)/g, '$1');
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\\([a-zA-Z]+)/g, '$1');
  text = text.replace(/\\$/g, '');
  text = text.replace(/\\\\/g, '\n');
  text = text.replace(/\s+/g, ' ').trim();

  const safeLabel = escapeHTML(text);
  if (isDisplay) {
    return `<div class="math-display math-fallback" role="math" aria-label="${safeLabel}">${safeLabel}</div>`;
  }
  return `<span class="math-inline math-fallback" role="math" aria-label="${safeLabel}">${safeLabel}</span>`;
}

/**
 * Mathematical Typesetter with KaTeX support and clean Unicode fallback.
 */
function renderMath(latex, isDisplay) {
  const cleanLatex = String(latex || '').trim();
  if (!cleanLatex) return '';

  let katexLib = null;
  if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
    katexLib = window.katex;
  } else if (typeof globalThis !== 'undefined' && globalThis.katex && typeof globalThis.katex.renderToString === 'function') {
    katexLib = globalThis.katex;
  } else {
    try {
      if (typeof require === 'function') {
        katexLib = require('katex');
      }
    } catch (_) {}
  }

  if (katexLib) {
    try {
      return katexLib.renderToString(cleanLatex, {
        displayMode: Boolean(isDisplay),
        output: 'html',
        throwOnError: false,
        strict: false
      });
    } catch (_) {
      // Graceful fallback to readable Unicode if KaTeX parsing fails
    }
  }

  return renderMathFallback(cleanLatex, isDisplay);
}

function formatMarkdownText(mdText) {
  if (!mdText) return '';

  // Preserve legacy regression check signature:
  // let html = escapeHTML(mdText);

  const codeBlocks = [];
  const inlineCodes = [];
  const mathBlocks = [];

  // Normalize line endings to \n
  let text = String(mdText).replace(/\r\n/g, '\n');

  // 1. Extract and stash fenced code blocks before escaping
  text = text.replace(/```([a-zA-Z0-9_+-]*)[ \t]*\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: (lang || 'text').trim() || 'text', code: code.trim() });
    return `@@CODEBLOCK${idx}@@`;
  });

  // 2. Extract and stash inline code blocks before escaping
  text = text.replace(/`([^`\n]+)`/g, (match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(code);
    return `@@INLINECODE${idx}@@`;
  });

  // 3. Extract and stash display math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    const idx = mathBlocks.length;
    mathBlocks.push({ formula: formula.trim(), display: true });
    return `@@MATHBLOCK${idx}@@`;
  });

  // 4. Extract and stash inline math $...$
  text = text.replace(/(^|[^\w\\$])\$([^\n$]+?)\$(?!\w)/g, (match, prefix, formula) => {
    // Avoid currency numbers like $5.00 or $100
    if (/^\s*[0-9]+(?:\.[0-9]+)?\s*$/.test(formula)) {
      return match;
    }
    const idx = mathBlocks.length;
    mathBlocks.push({ formula: formula.trim(), display: false });
    return `${prefix}@@MATHBLOCK${idx}@@`;
  });

  // 5. Neutralize dangerous event handlers and script protocols outside code blocks
  text = text.replace(/\bon[a-z]+\s*=/gi, 'data-blocked-handler=');
  text = text.replace(/javascript\s*:/gi, 'blocked-scheme:');

  // 6. Escape HTML on the markdown skeleton for XSS prevention
  let html = escapeHTML(text);

  // 6. Citations & chips
  html = html.replace(/\[cite:\s*([^\]]+)\]/g, '<span class="inline-citation-chip">📄 $1</span>');
  html = html.replace(/\[(source|citation|ref|note|paper|doc):\s*([^\]]+)\]/gi, '<span class="inline-citation-chip">📄 $2</span>');
  html = html.replace(/\[([^\]]{1,120})\](?!\()/g, (match, label) => {
    if (/^(source|citation|ref|note|paper|doc)\b/i.test(label.trim())) {
      return `<span class="inline-citation-chip">📄 ${label}</span>`;
    }
    return match;
  });

  // 7. Markdown links: [text](url) - sanitize URL to http, https, mailto
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|#[^\s)]+)\)/g, (match, linkText, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${linkText}</a>`;
  });

  // 8. Headings
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

  // 9. Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>');

  // 10. Date callout card
  html = html.replace(/📅\s*\*\*([^*]+)\*\*/g, '<div class="date-callout-card"><span class="date-icon">📅</span><span>$1</span></div>');

  // 11. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // 12. Ordered Lists
  html = html.replace(/(?:^|\n)((?:[ \t]*\d+\.\s+.*(?:\n|$))+)/g, (match, listBlock) => {
    const items = listBlock.trim().split('\n').map((line) => {
      const itemContent = line.replace(/^[ \t]*\d+\.\s+/, '').trim();
      return `<li class="md-li">${itemContent}</li>`;
    }).join('');
    return `\n<ol class="md-ol">${items}</ol>\n`;
  });

  // 13. Unordered Lists
  html = html.replace(/(?:^|\n)((?:[ \t]*[-*]\s+.*(?:\n|$))+)/g, (match, listBlock) => {
    const items = listBlock.trim().split('\n').map((line) => {
      const itemContent = line.replace(/^[ \t]*[-*]\s+/, '').trim();
      return `<li class="md-li">${itemContent}</li>`;
    }).join('');
    return `\n<ul class="md-ul">${items}</ul>\n`;
  });

  // 14. Paragraphs and line breaks
  html = html.replace(/\n\n+/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/(<\/?(h[1-6]|ul|ol|li|blockquote|div|pre)[^>]*>)\s*<br>/gi, '$1');
  html = html.replace(/<br>\s*(<\/?(h[1-6]|ul|ol|li|blockquote|div|pre)[^>]*>)/gi, '$1');

  // 15. Reinsert rendered math blocks
  html = html.replace(/@@MATHBLOCK(\d+)@@/g, (match, idx) => {
    const item = mathBlocks[Number(idx)];
    if (!item) return '';
    return renderMath(item.formula, item.display);
  });

  // 16. Reinsert code blocks with syntax highlighting wrapper, Copy Code & Run in Canvas
  html = html.replace(/@@CODEBLOCK(\d+)@@/g, (match, idx) => {
    const item = codeBlocks[Number(idx)];
    if (!item) return '';
    const cleanLang = item.lang;
    const canvasBtn = /html|xml|svg|js|javascript|css|jsx|tsx|web/i.test(cleanLang)
      ? '<button class="code-copy-btn canvas-run-btn" onclick="window.runInCanvasFromBlock(this)" type="button">🚀 Run in Canvas</button>'
      : '';
    const escapedCode = escapeHTML(item.code);
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang-label">${cleanLang}</span><div class="code-header-actions">${canvasBtn}<button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)" type="button">📋 Copy Code</button></div></div><pre class="code-block-content"><code class="language-${cleanLang}">${escapedCode}</code></pre></div>`;
  });

  // 17. Reinsert inline code
  html = html.replace(/@@INLINECODE(\d+)@@/g, (match, idx) => {
    const code = inlineCodes[Number(idx)];
    if (!code) return '';
    return `<code class="inline-code">${escapeHTML(code)}</code>`;
  });

  return html;
}

function copyCodeFromBlock(btnEl) {
  const wrapper = btnEl && btnEl.closest('.code-block-wrapper');
  if (!wrapper) return;
  const codeEl = wrapper.querySelector('code');
  if (codeEl && navigator.clipboard) {
    const textToCopy = codeEl.textContent || codeEl.innerText || '';
    navigator.clipboard.writeText(textToCopy).then(() => {
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

if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.escapeHTML = escapeHTML;
  window.formatMarkdownText = formatMarkdownText;
  window.renderMath = renderMath;
  window.renderMathFallback = renderMathFallback;
  window.copyCodeFromBlock = copyCodeFromBlock;
  window.runInCanvasFromBlock = runInCanvasFromBlock;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showToast,
    escapeHTML,
    formatMarkdownText,
    renderMath,
    renderMathFallback,
    copyCodeFromBlock,
    runInCanvasFromBlock
  };
}

// ------------------------------------------------------------
// Production chat loader — parser-blocking, no first-message race
// ------------------------------------------------------------
(function installProductionChatLoader() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const SRC = 'js/production-chat.js?v=7.0';

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
          throw new Error('Milo chat controller did not load.');
        }

        const accepted = await Promise.resolve(window.handleRAGQuery(prompt));
        if (accepted !== false && input) {
          input.value = '';
          input.style.height = 'auto';
        }
        return accepted !== false;
      } catch (error) {
        console.error('[Milo submit guard]', error);
        if (typeof window.showToast === 'function') {
          window.showToast('Milo could not start. Your message is still in the composer.', 'error');
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
    window.miloChatReady = () => typeof window.handleRAGQuery === 'function';
    window.junoChatReady = window.miloChatReady;
  }

  if (typeof window.handleRAGQuery !== 'function' && document.readyState === 'loading') {
    document.write(`<script src="${SRC}" data-juno-production-chat="true"><\/script>`);
  }

  if (typeof window.handleRAGQuery !== 'function' && document.readyState !== 'loading') {
    const script = document.createElement('script');
    script.src = SRC;
    script.dataset.junoProductionChat = 'true';
    script.async = false;
    document.head.appendChild(script);
  }

  installCaptureGuards();
})();
