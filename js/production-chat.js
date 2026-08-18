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
    } catch (_) {
      return [];
    }
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
          if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(haystack)) score += 1;
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
    if (role === 'assistant' && typeof window.formatMarkdownText === 'function') {
      content.innerHTML = window.formatMarkdownText(text);
    } else {
      content.textContent = text;
    }

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
    content.innerHTML = typeof window.formatMarkdownText === 'function'
      ? window.formatMarkdownText(text)
      : clean(text);
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

    // Keep greetings instant and human. They do not need an LLM round trip.
    const normalized = prompt.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (/^(hi|hii|hiii|hello|hey|heyy|yo|sup)$/.test(normalized)) {
      replaceMessage(thinking, 'Hi Ankita — good to see you. What are we working on?');
      saveTurn(prompt, 'Hi Ankita — good to see you. What are we working on?');
      setBusy(false);
      return true;
    }

    try {
      const retrieved = retrieveNotes(prompt);
      const response = await fetch('/api/ai/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          prompt,
          history: getHistory(),
          context: retrieved.context,
          citations: retrieved.citations
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.answer) {
        throw new Error(data.error || `AI request failed (HTTP ${response.status}).`);
      }

      let answer = data.answer;
      if (Array.isArray(data.citations) && data.citations.length && !/Sources?\s*$/i.test(answer)) {
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
      history.push(
        { role: 'user', content: prompt, timestamp: Date.now() },
        { role: 'model', content: answer, timestamp: Date.now() }
      );
      localStorage.setItem('juno_chat_history', JSON.stringify(history.slice(-40)));
    } catch (_) {}
  }

  // This file intentionally loads after app.js and becomes the single production
  // submit path. The previous app controller installed another submit handler later
  // in the boot sequence, which could bypass the real gateway.
  window.handleRAGQuery = handleRAGQuery;
  window.submitRAGQuery = function (event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    const input = document.getElementById('rag-query-input');
    const prompt = input ? input.value : '';
    if (input) input.value = '';
    handleRAGQuery(prompt);
    return false;
  };
  window.sendMessage = window.submitRAGQuery;
})();
