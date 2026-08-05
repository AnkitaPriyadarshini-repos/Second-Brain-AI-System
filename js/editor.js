// ============================================
// BlogSphere AI — Content Platform
// Module: Live Markdown Editor & Formatting Toolbar
// Author: Ankita Priyadarshini Pallai
// ============================================

class MarkdownEditor {
  constructor(textareaId, previewId) {
    this.textarea = document.getElementById(textareaId);
    this.preview = document.getElementById(previewId);
  }

  parseMarkdown(md) {
    if (!md) return '<p style="color: var(--text-muted);">Live preview will appear here...</p>';

    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```javascript([\s\S]*?)```/gim, '<pre><code class="language-js">$1</code></pre>')
      .replace(/```css([\s\S]*?)```/gim, '<pre><code class="language-css">$1</code></pre>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/<\/ul>\s*<ul>/gim, '')
      .replace(/\n\n/gim, '</p><p>');

    return `<p>${html}</p>`;
  }

  updatePreview() {
    if (!this.textarea || !this.preview) return;
    const md = this.textarea.value;
    this.preview.innerHTML = this.parseMarkdown(md);
  }

  insertFormat(prefix, suffix = '') {
    if (!this.textarea) return;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const text = this.textarea.value;

    const selectedText = text.substring(start, end) || 'Sample Text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    this.textarea.value = text.substring(0, start) + replacement + text.substring(end);
    this.textarea.focus();
    this.textarea.selectionStart = start + prefix.length;
    this.textarea.selectionEnd = start + prefix.length + selectedText.length;
    this.updatePreview();
  }

  exportMarkdown(filename = 'article.md') {
    if (!this.textarea) return;
    const blob = new Blob([this.textarea.value], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  exportHTML(filename = 'article.html') {
    if (!this.preview) return;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Exported Article</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    pre { background: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #00f2fe; margin: 1rem 0; padding-left: 1rem; color: #475569; }
  </style>
</head>
<body>
${this.preview.innerHTML}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.markdownEditor = new MarkdownEditor('editor-textarea', 'editor-preview');
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownEditor;
}
