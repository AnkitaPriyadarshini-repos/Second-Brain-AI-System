/*
 * Second Brain AI — production chat controller
 * Keeps the browser UI thin and sends AI work to the protected Vercel gateway.
 * Also retrieves a small, relevant slice of the local vault so "Second Brain"
 * actually means the user's own notes are part of the answer.
 */
(function () {
  'use strict';

  let busy = false;
  const clean = (value) => String(value || '').trim();

  function getHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('juno_chat_history') || '[]');
      return Array.isArray(history) ? history.slice(-20) : [];
    } catch (_) { return []; }
  }

  function tokenize(text) {
    return clean(text).toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  }

  function retrieveNotes(query) {
    try {
      if (typeof Store === 'undefined' || typeof Store.getNotes !== 'function') return { context: '', citations: [] };
      const notes = Store.getNotes();
      if (!Array.isArray(notes) || !notes.length) return { context: '', citations: [] };

      const queryTokens = [...new Set(tokenize(query))];
      if (!queryTokens.length) return { context: '', citations: [] };

      const scored = notes.map((note) => {
        const title = clean(note.title);
        const summary = clean(note.summary);
        const content = clean(note.content);
        const tags = Array.isArray(note.tags) ? note.tags.join(' ') : '';
        const haystack = `${title} ${summary} ${content} ${tags}`.toLowerCase();
        let score = 0;
        queryTokens.forEach((token) => {
          const safe = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`\\b${safe}\\b`, 'i').test(haystack)) score += 1;
          if (title.toLowerCase().includes(token)) score += 2;
          if (tags.toLowerCase().includes(token)) score += 1.5;
        });
        return { note, score };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      const citations = scored.map(({ note }) => ({
        id: note.id || note.title,
        title: clean(note.title) || 'Untitled note',
        date: note.dateStr || '',
        sourceType: note.sourceType || 'note'
      }));

      const context = scored.map(({ note }, index) => {
        const body = clean(note.content || note.summary).slice(0, 2400);
        return `SOURCE ${index + 1}: ${clean(note.title) || 'Untitled note'}\n${body}`;
      }).join('\n\n');

      return { context: context.slice(0, 11000), citations };
    } catch (error) {
      console.warn('[Juno retrieval]', error);
      return { context: '', citations: [] };
    }
  }

  function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    if (!container) return null;
    const bubble = document.createElement('div');
    bubble.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    const content = document.createElement('div');
    content.className = 'chat-message-content';
    if (role === 'assistant' && typeof window.formatMarkdownText === 'function') content.innerHTML = window.formatMarkdownText(text);
    else content.textContent = text;
    bubble.appendChild(content);
    container.appendChild(bubble);
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    try { container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); } catch (_) { container.scrollTop = container.scrollHeight; }
    return bubble;
  }

  function replaceMessage(bubble, text) {
    if (!bubble) return;
    const content = bubble.querySelector('.chat-message-content') || bubble;
    content.innerHTML = typeof window.formatMarkdownText === 'function' ? window.formatMarkdownText(text) : clean(text);
  }

  function setBusy(value) {
    busy = value;
    const input = document.getElementById('rag-query-input');
    const button = document.getElementById('rag-submit-btn');
    if (input) input.disabled = value;
    if (button) {
      button.disabled = value;
      button.setAttribute('aria-busy', value ? 'true' : 'false');
      button.title = value ? 'Juno is thinking…' : 'Send message';
    }
  }

  function showChat() {
    const hero = document.getElementById('chat-hero-view');
    const stream = document.getElementById('chat-container');
    if (hero) hero.style.display = 'none';
    if (stream) stream.style.display = 'flex';
  }

  async function handleRAGQuery(query) {
    const prompt = clean(query);
    if (!prompt || busy) return false;
    showChat();
    setBusy(true);
    appendMessage('user', prompt);
    const thinking = appendMessage('assistant', 'Thinking…');

    const normalized = prompt.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (/^(hi|hii|hiii|hello|hey|heyy|yo|sup)$/.test(normalized)) {
      const greeting = 'Hi Ankita — good to see you. What are we working on?';
      replaceMessage(thinking, greeting);
      saveTurn(prompt, greeting);
      setBusy(false);
      return true;
    }

    try {
      const retrieved = retrieveNotes(prompt);
      const response = await fetch('/api/ai/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ prompt, history: getHistory(), context: retrieved.context, citations: retrieved.citations })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.answer) throw new Error(data.error || `AI request failed (HTTP ${response.status}).`);

      let answer = data.answer;
      if (Array.isArray(data.citations) && data.citations.length) {
        answer += `\n\n---\n**From your Second Brain:** ${data.citations.map((c) => c.title).join(' · ')}`;
      }
      replaceMessage(thinking, answer);
      saveTurn(prompt, answer);
      window.dispatchEvent(new CustomEvent('juno:answer', { detail: data }));
      return true;
    } catch (error) {
      const friendly = error?.message || 'Something went wrong while contacting the AI service.';
      replaceMessage(thinking, `I couldn't finish that just now. ${friendly}`);
      if (typeof window.showToast === 'function') window.showToast(friendly, 'error');
      console.error('[Juno chat]', error);
      return false;
    } finally {
      setBusy(false);
      const input = document.getElementById('rag-query-input');
      if (input) input.focus();
    }
  }

  function saveTurn(prompt, answer) {
    try {
      const history = getHistory();
      history.push({ role: 'user', content: prompt, timestamp: Date.now() }, { role: 'model', content: answer, timestamp: Date.now() });
      localStorage.setItem('juno_chat_history', JSON.stringify(history.slice(-40)));
    } catch (_) {}
  }

  function polishInterface() {
    document.title = 'Juno — your notes, in context';

    // Replace copy that reads like a generated product pitch with quieter, human language.
    document.querySelectorAll('h1,h2,h3,p,button').forEach((el) => {
      const text = clean(el.textContent);
      if (text === 'Talk to Your Second Brain like Jarvis') el.textContent = 'Your notes, in context.';
      if (text.includes('Ask questions out loud or via text. Answers are synthesized strictly from your saved notes')) {
        el.textContent = 'Ask about something you saved, or ask a normal question. Juno will use your notes when they help.';
      }
      if (text === 'Query RAG') el.textContent = 'Ask Juno';
      if (text === 'Talk to Jarvis') el.textContent = 'Use voice';
      if (text === 'Grounded Conversation Stream & Source Citations') el.textContent = 'Conversation';
    });

    const input = document.getElementById('rag-query-input');
    if (input) input.placeholder = 'Ask anything — or ask about something you saved…';

    const hero = document.getElementById('chat-hero-view');
    if (hero) hero.classList.add('juno-human-hero');

    const style = document.createElement('style');
    style.id = 'juno-human-polish';
    style.textContent = `
      :root { --juno-ink: #151515; --juno-paper: #f7f5f0; --juno-line: rgba(21,21,21,.12); --juno-accent: #6d5dfc; }
      body { background: var(--juno-paper) !important; color: var(--juno-ink); }
      .juno-human-hero { max-width: 980px !important; margin: 0 auto !important; padding: 56px 24px 72px !important; }
      .juno-human-hero .claude-brand-headline-wrapper { gap: 14px !important; }
      .juno-human-hero .claude-terracotta-icon { filter: none !important; font-size: 30px !important; }
      .juno-human-hero .claude-serif-headline { font-family: Inter, system-ui, sans-serif !important; font-size: clamp(34px, 5vw, 58px) !important; letter-spacing: -.045em !important; line-height: 1.02 !important; color: #171717 !important; font-weight: 700 !important; }
      .juno-human-hero .claude-prompt-card { border: 1px solid var(--juno-line) !important; background: rgba(255,255,255,.86) !important; box-shadow: 0 18px 50px rgba(20,20,20,.08) !important; border-radius: 22px !important; }
      .juno-human-hero .claude-pro-top-bar { display: none !important; }
      .juno-human-hero .claude-prompt-card textarea, .juno-human-hero #rag-query-input { color: #151515 !important; background: transparent !important; }
      .juno-human-hero .claude-prompt-card textarea::placeholder, .juno-human-hero #rag-query-input::placeholder { color: #777 !important; }
      .juno-human-hero .sample-query-btn, .juno-human-hero .quick-query-btn { background: #fff !important; border: 1px solid var(--juno-line) !important; color: #4a4a4a !important; box-shadow: none !important; }
      .juno-human-hero .sample-query-btn:hover, .juno-human-hero .quick-query-btn:hover { border-color: rgba(109,93,252,.45) !important; color: #3026a8 !important; transform: translateY(-1px); }
      .chat-message-bubble { max-width: 820px !important; border-radius: 16px !important; box-shadow: none !important; }
      .assistant-bubble { background: rgba(255,255,255,.94) !important; border: 1px solid var(--juno-line) !important; color: #202020 !important; }
      .user-bubble { background: #171717 !important; color: #fff !important; }
      .pwa-desktop-banner { border-radius: 16px !important; box-shadow: 0 10px 30px rgba(0,0,0,.08) !important; }
    `;
    document.head.appendChild(style);
  }

  // This file intentionally loads after app.js and becomes the single production submit path.
  window.handleRAGQuery = handleRAGQuery;
  window.submitRAGQuery = function (event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const input = document.getElementById('rag-query-input');
    const prompt = input ? input.value : '';
    if (input) input.value = '';
    handleRAGQuery(prompt);
    return false;
  };
  window.sendMessage = window.submitRAGQuery;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polishInterface, { once: true });
  else polishInterface();
})();
