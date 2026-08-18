/*
 * Second Brain AI — production chat controller
 *
 * Production goals:
 *  - one reliable composer path (click + Enter)
 *  - grounded local-note retrieval passed to the gateway correctly
 *  - instant greetings and graceful offline/fallback behaviour
 *  - stable, compact workspace layout with no page-jump on send
 *  - keyboard and accessibility support
 */
(function () {
  'use strict';

  let busy = false;
  let wired = false;
  const clean = (value) => String(value == null ? '' : value).trim();
  const STOP_WORDS = new Set(
    'a an and are as at be by can could do for from how i if in is it me my of on or please tell that the this to was what when where who why will with you your about saved save note notes'.split(' ')
  );

  function getHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('juno_chat_history') || '[]');
      return Array.isArray(history) ? history.slice(-20) : [];
    } catch (_) {
      return [];
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

  function tokenize(text) {
    return clean(text).toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  }

  /** Return actual note objects so the gateway can perform field-weighted RAG. */
  function retrieveNotes(query) {
    try {
      if (typeof Store === 'undefined' || typeof Store.getNotes !== 'function') {
        return { contextNotes: [], citations: [] };
      }

      const notes = Store.getNotes();
      if (!Array.isArray(notes) || !notes.length) {
        return { contextNotes: [], citations: [] };
      }

      const queryTokens = [...new Set(tokenize(query).filter((token) => !STOP_WORDS.has(token)))];
      const normalizedQuery = clean(query).toLowerCase();
      if (!queryTokens.length) return { contextNotes: [], citations: [] };

      const scored = notes.map((note) => {
        const title = clean(note.title);
        const summary = clean(note.summary);
        const content = clean(note.content);
        const tags = Array.isArray(note.tags) ? note.tags.join(' ') : clean(note.tags);
        const haystack = `${title} ${summary} ${content} ${tags}`.toLowerCase();
        let score = 0;

        if (normalizedQuery.length >= 8 && haystack.includes(normalizedQuery)) score += 10;
        queryTokens.forEach((token) => {
          const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`\\b${safeToken}\\b`, 'i').test(haystack)) score += 1;
          if (title.toLowerCase().includes(token)) score += 4;
          if (tags.toLowerCase().includes(token)) score += 2;
        });
        return { note, score };
      })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      const citations = scored.map(({ note }) => ({
        id: note.id || note.title,
        title: clean(note.title) || 'Untitled note',
        date: note.dateStr || '',
        sourceType: note.sourceType || 'note'
      }));

      const contextNotes = scored.map(({ note }) => ({
        id: note.id,
        title: clean(note.title) || 'Untitled note',
        content: clean(note.content || note.summary).slice(0, 2400),
        summary: clean(note.summary),
        tags: Array.isArray(note.tags) ? note.tags : [],
        sourceType: note.sourceType || 'note'
      })).filter((note) => note.content || note.summary);

      return { contextNotes, citations };
    } catch (error) {
      console.warn('[Juno retrieval]', error);
      return { contextNotes: [], citations: [] };
    }
  }

  function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-message-bubble ${role === 'user' ? 'user-bubble' : 'assistant-bubble'}`;
    bubble.setAttribute('role', role === 'assistant' ? 'status' : 'article');

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

    requestAnimationFrame(() => {
      try { container.scrollTop = container.scrollHeight; } catch (_) {}
    });
    return bubble;
  }

  function replaceMessage(bubble, text) {
    if (!bubble) return;
    const content = bubble.querySelector('.chat-message-content') || bubble;
    content.innerHTML = typeof window.formatMarkdownText === 'function'
      ? window.formatMarkdownText(text)
      : clean(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setBusy(value) {
    busy = Boolean(value);
    const input = document.getElementById('rag-query-input');
    const button = document.getElementById('rag-submit-btn');
    if (input) input.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (button) {
      button.disabled = busy;
      button.setAttribute('aria-busy', busy ? 'true' : 'false');
      button.setAttribute('aria-label', busy ? 'Juno is thinking' : 'Send message');
      button.title = busy ? 'Juno is thinking…' : 'Send message';
    }
  }

  function showChat() {
    const hero = document.getElementById('chat-hero-view');
    const stream = document.getElementById('chat-container');
    if (hero) hero.style.display = 'none';
    if (stream) stream.style.display = 'flex';
  }

  function getGreeting(prompt) {
    const normalized = clean(prompt).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!/^(hi|hii|hiii|hello|hey|heyy|yo|sup|good morning|good afternoon|good evening)$/.test(normalized)) return null;
    if (normalized === 'good morning') return 'Good morning, Ankita. What are we working on?';
    if (normalized === 'good afternoon') return 'Good afternoon, Ankita. What can I help you with?';
    if (normalized === 'good evening') return 'Good evening, Ankita. What are you working on?';
    return 'Hi, Ankita — good to see you. What are we working on?';
  }

  function localFallback(prompt, retrieved) {
    if (retrieved.contextNotes.length) {
      const first = retrieved.contextNotes[0];
      const title = first.title || 'your notes';
      const excerpt = clean(first.content || first.summary).slice(0, 900);
      return `I found this in your Second Brain:\n\n**${title}**\n${excerpt}\n\nI couldn't reach the cloud model right now, so I'm showing the grounded source instead of inventing an answer.`;
    }
    return `I’m here. I couldn’t reach the generation service just now. Your local notes are still available through Search, Vault, and Knowledge Graph.`;
  }

  async function handleRAGQuery(query) {
    const prompt = clean(query);
    if (!prompt || busy) return false;

    showChat();
    setBusy(true);
    const startedAt = performance.now();
    appendMessage('user', prompt);
    const thinking = appendMessage('assistant', 'Thinking…');

    const greeting = getGreeting(prompt);
    if (greeting) {
      replaceMessage(thinking, greeting);
      saveTurn(prompt, greeting);
      setBusy(false);
      window.dispatchEvent(new CustomEvent('juno:answer', {
        detail: { success: true, local: true, latencyMs: Math.round(performance.now() - startedAt) }
      }));
      focusComposer();
      return true;
    }

    try {
      const retrieved = retrieveNotes(prompt);
      const response = await fetch('/api/ai/gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Client-Version': 'juno-2'
        },
        body: JSON.stringify({
          prompt,
          history: getHistory(),
          // IMPORTANT: the gateway expects note objects, not a formatted string.
          contextNotes: retrieved.contextNotes,
          citations: retrieved.citations
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.answer) {
        throw new Error(data.error || `AI request failed (HTTP ${response.status}).`);
      }

      let answer = clean(data.answer);
      if (Array.isArray(data.citations) && data.citations.length) {
        answer += `\n\n---\n**From your Second Brain:** ${data.citations.map((c) => c.title).join(' · ')}`;
      }
      replaceMessage(thinking, answer);
      saveTurn(prompt, answer);
      window.dispatchEvent(new CustomEvent('juno:answer', { detail: data }));
      return true;
    } catch (error) {
      console.error('[Juno chat]', error);
      const retrieved = retrieveNotes(prompt);
      const fallback = localFallback(prompt, retrieved);
      replaceMessage(thinking, fallback);
      if (typeof window.showToast === 'function') window.showToast('Cloud AI unavailable — local knowledge mode is still active.', 'warning');
      window.dispatchEvent(new CustomEvent('juno:answer', {
        detail: { success: false, fallback: true, error: error?.message || 'Gateway unavailable' }
      }));
      return false;
    } finally {
      setBusy(false);
      focusComposer();
    }
  }

  function focusComposer() {
    const input = document.getElementById('rag-query-input');
    if (input && !input.disabled) {
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    }
  }

  function clearComposer() {
    const input = document.getElementById('rag-query-input');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    focusComposer();
  }

  function createFallbackNewChat() {
    const container = document.getElementById('chat-container');
    if (container) container.innerHTML = '';
    const hero = document.getElementById('chat-hero-view');
    if (hero) hero.style.display = '';
    if (container) container.style.display = 'none';
    clearComposer();
  }

  function wireComposer() {
    const input = document.getElementById('rag-query-input');
    const button = document.getElementById('rag-submit-btn');
    if (!input || !button || wired) return Boolean(input && button);
    wired = true;

    // Never allow the browser's default form navigation to move the composer down the page.
    const form = input.closest('form');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const value = clean(input.value);
        if (value) input.value = '';
        handleRAGQuery(value);
      }, true);
    }

    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const value = clean(input.value);
      if (!value || busy) return;
      input.value = '';
      handleRAGQuery(value);
    }, true);

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      const value = clean(input.value);
      if (!value || busy) return;
      input.value = '';
      handleRAGQuery(value);
    }, true);

    input.addEventListener('input', () => {
      // Comfortable one-to-three line composer without layout jumps.
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
    });

    focusComposer();
    return true;
  }

  function hardenNavigation() {
    document.querySelectorAll('.sidebar-menu-item, .drawer-nav-item, .mobile-nav-btn').forEach((button) => {
      if (button.dataset.junoNavHardened === '1') return;
      button.dataset.junoNavHardened = '1';
      if (button.tagName === 'BUTTON') button.type = 'button';
      button.addEventListener('click', () => {
        // If an old cached bundle removed a handler, provide a safe navigation fallback.
        const view = button.getAttribute('data-view');
        if (!view) return;
        requestAnimationFrame(() => {
          if (typeof window.activateView === 'function') window.activateView(view);
        });
      });
    });

    const newChatButtons = document.querySelectorAll('[title="Start New Chat"]');
    newChatButtons.forEach((button) => {
      if (button.dataset.junoNewChat === '1') return;
      button.dataset.junoNewChat = '1';
      button.type = 'button';
      button.addEventListener('click', () => {
        if (typeof window.createNewChatThread === 'function') window.createNewChatThread();
        else createFallbackNewChat();
      });
    });
  }

  function polishInterface() {
    document.title = 'Juno — your notes, in context';

    document.querySelectorAll('h1,h2,h3,p,button').forEach((el) => {
      const text = clean(el.textContent);
      if (text === 'Talk to Your Second Brain like Jarvis') el.textContent = 'Your notes, in context.';
      if (text.includes('Ask questions out loud or via text. Answers are synthesized strictly from your saved notes')) {
        el.textContent = 'Ask about something you saved, or ask a normal question. Juno uses your notes when they help.';
      }
      if (text === 'Query RAG') el.textContent = 'Ask Juno';
      if (text === 'Talk to Jarvis') el.textContent = 'Use voice';
      if (text === 'Grounded Conversation Stream & Source Citations') el.textContent = 'Conversation';
    });

    const input = document.getElementById('rag-query-input');
    if (input) {
      input.placeholder = 'Ask anything — or ask about something you saved…';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('enterkeyhint', 'send');
    }

    const hero = document.getElementById('chat-hero-view');
    if (hero) hero.classList.add('juno-human-hero');

    const style = document.getElementById('juno-human-polish') || document.createElement('style');
    style.id = 'juno-human-polish';
    style.textContent = `
      :root {
        --juno-ink: #153A50;
        --juno-paper: #F5F9FC;
        --juno-surface: #FFFFFF;
        --juno-line: #D8E6EE;
        --juno-blue: #5B8094;
        --juno-action: #153A50;
      }

      html, body { min-height: 100%; }
      body { background: var(--juno-paper) !important; color: var(--juno-ink) !important; overflow-x: hidden; }
      .app-main-canvas { min-width: 0 !important; }
      .juno-human-hero { max-width: 1040px !important; margin: 0 auto !important; padding: 42px 28px 96px !important; min-height: calc(100vh - 72px) !important; box-sizing: border-box !important; }
      .juno-human-hero .claude-serif-headline { font-family: Inter, system-ui, sans-serif !important; font-size: clamp(36px, 5vw, 60px) !important; letter-spacing: -.045em !important; line-height: 1.04 !important; color: #153A50 !important; font-weight: 750 !important; }
      .juno-human-hero .claude-prompt-card { position: relative !important; z-index: 5 !important; border: 1px solid var(--juno-line) !important; background: rgba(255,255,255,.96) !important; box-shadow: 0 12px 36px rgba(21,58,80,.08) !important; border-radius: 20px !important; overflow: visible !important; }
      .juno-human-hero #rag-query-input { width: 100% !important; min-height: 54px !important; max-height: 132px !important; resize: none !important; color: #153A50 !important; background: transparent !important; outline: none !important; overflow-y: auto !important; }
      .juno-human-hero #rag-query-input::placeholder { color: #7893A3 !important; opacity: 1 !important; }
      .juno-human-hero #rag-submit-btn { position: relative !important; z-index: 20 !important; flex: 0 0 auto !important; width: 48px !important; height: 48px !important; min-width: 48px !important; min-height: 48px !important; border-radius: 14px !important; cursor: pointer !important; transform: none !important; }
      .juno-human-hero #rag-submit-btn:disabled { opacity: .55 !important; cursor: wait !important; }
      .juno-human-hero .sample-query-btn, .juno-human-hero .quick-query-btn { background: #fff !important; border: 1px solid var(--juno-line) !important; color: #36576A !important; box-shadow: none !important; }
      .juno-human-hero .sample-query-btn:hover, .juno-human-hero .quick-query-btn:hover { border-color: #7198AF !important; color: #153A50 !important; transform: translateY(-1px); }
      #chat-container { width: min(920px, 100%) !important; max-height: calc(100vh - 150px) !important; overflow-y: auto !important; overflow-x: hidden !important; margin: 0 auto !important; padding: 24px 10px 110px !important; scroll-behavior: smooth !important; box-sizing: border-box !important; }
      .chat-message-bubble { max-width: 820px !important; border-radius: 16px !important; box-shadow: none !important; margin: 8px 0 !important; }
      .assistant-bubble { background: rgba(255,255,255,.96) !important; border: 1px solid var(--juno-line) !important; color: #17394C !important; }
      .user-bubble { background: #153A50 !important; color: #fff !important; }
      .chat-message-content { line-height: 1.65 !important; overflow-wrap: anywhere !important; }
      .pwa-desktop-banner { border-radius: 14px !important; }
      .sidebar-menu-item, .drawer-nav-item, .mobile-nav-btn { touch-action: manipulation !important; }
      @media (max-width: 720px) {
        .juno-human-hero { padding: 28px 14px 88px !important; }
        .juno-human-hero #rag-submit-btn { width: 44px !important; height: 44px !important; min-width: 44px !important; min-height: 44px !important; }
        #chat-container { padding-left: 4px !important; padding-right: 4px !important; }
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);

    wireComposer();
    hardenNavigation();
  }

  window.handleRAGQuery = handleRAGQuery;
  window.submitRAGQuery = function (event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const input = document.getElementById('rag-query-input');
    const prompt = input ? clean(input.value) : '';
    if (input && prompt) input.value = '';
    return handleRAGQuery(prompt);
  };
  window.sendMessage = window.submitRAGQuery;
  window.junoResetChat = createFallbackNewChat;

  function boot() {
    polishInterface();
    // A second pass handles markup injected by older UI modules after DOM ready.
    setTimeout(() => { wireComposer(); hardenNavigation(); }, 100);
    setTimeout(() => { wireComposer(); hardenNavigation(); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
