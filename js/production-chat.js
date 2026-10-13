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
      const history = JSON.parse(localStorage.getItem('milo_chat_history') || localStorage.getItem('juno_chat_history') || '[]');
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
      const serialized = JSON.stringify(history.slice(-40));
      localStorage.setItem('milo_chat_history', serialized);
      localStorage.setItem('juno_chat_history', serialized);
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

      // Use HybridRetrievalEngine (BM25 + TF-IDF Vector + RRF + Metadata Ranking) if present
      if (typeof HybridRetrievalEngine !== 'undefined') {
        const hybrid = new HybridRetrievalEngine();
        const res = hybrid.search(query, notes);
        if (res && (res.contextNotes.length || res.citations.length)) {
          return { contextNotes: res.contextNotes, citations: res.citations };
        }
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
      console.warn('[Milo retrieval]', error);
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
    let formatted = '';
    try {
      if (typeof window.formatMarkdownText === 'function') {
        formatted = window.formatMarkdownText(text);
      }
    } catch (_) {}
    if (!formatted) {
      formatted = clean(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    content.innerHTML = formatted;

    if (bubble.classList.contains('assistant-bubble') && !bubble.querySelector('.onyx-turn-actions-bar') && !text.startsWith('Thinking')) {
      const actions = document.createElement('div');
      actions.className = 'onyx-turn-actions-bar';
      actions.innerHTML = `
        <button class="onyx-action-icon-btn" onclick="window.OnyxInterface && window.OnyxInterface.copyCurrentTurn(this)" title="Copy">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="onyx-action-icon-btn" onclick="window.OnyxInterface && window.OnyxInterface.rateTurn(true)" title="Good response">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        </button>
        <button class="onyx-action-icon-btn" onclick="window.OnyxInterface && window.OnyxInterface.rateTurn(false)" title="Poor response">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
        </button>
        <button class="onyx-sources-btn" onclick="window.OnyxInterface && window.OnyxInterface.openSourcesDrawer()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Sources</span>
        </button>
      `;
      bubble.appendChild(actions);
    }
  }

  function setBusy(value) {
    busy = Boolean(value);
    window.isAIProcessing = busy;
    const input = document.getElementById('rag-query-input');
    const button = document.getElementById('rag-submit-btn');
    if (input) {
      input.setAttribute('aria-busy', busy ? 'true' : 'false');
      input.disabled = busy;
    }
    if (button) {
      button.disabled = busy;
      button.setAttribute('aria-busy', busy ? 'true' : 'false');
      button.setAttribute('aria-label', busy ? 'Milo is thinking' : 'Send message');
      button.title = busy ? 'Milo is thinking…' : 'Send message';
      button.innerHTML = busy
        ? '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    }
  }

  function showChat() {
    const hero = document.getElementById('chat-hero-view');
    const stream = document.getElementById('chat-container');
    const miloBar = document.getElementById('milo-chat-companion-bar');
    if (hero) {
      hero.style.display = 'none';
      hero.classList.add('hidden');
    }
    if (stream) stream.style.display = 'flex';
    if (miloBar) miloBar.style.display = 'flex';
  }

  function getGreeting(prompt) {
    const normalized = clean(prompt).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!/^(hi|hii|hiii|hello|hey|heyy|yo|sup|good morning|good afternoon|good evening)$/.test(normalized)) return null;
    if (normalized === 'good morning') return 'Good morning, User. What are we working on?';
    if (normalized === 'good afternoon') return 'Good afternoon, User. What can I help you with?';
    if (normalized === 'good evening') return 'Good evening, User. What are you working on?';
    return 'Hi, User — good to see you. What are we working on?';
  }

  function localFallback(prompt, retrieved) {
    if (retrieved.contextNotes && retrieved.contextNotes.length) {
      let output = `### 🔒 Grounded in your Second Brain (${retrieved.contextNotes.length} sources found)\n\n`;
      retrieved.contextNotes.slice(0, 3).forEach((n, i) => {
        const title = n.title || 'Untitled Note';
        const excerpt = clean(n.content || n.summary).slice(0, 450);
        output += `#### ${i + 1}. [${title}]\n${excerpt}\n\n`;
      });
      output += `---\n*The remote AI model was unreachable. Milo retrieved your exact grounded knowledge sources directly from your Second Brain vault so you are never blocked.*`;
      return output;
    }
    return `I am here, but the remote AI service is currently unreachable. Your saved notes are safe and searchable in your Knowledge Vault, Search, and Graph.`;
  }

  async function handleRAGQuery(query) {
    const prompt = clean(query);
    if (!prompt || busy) return false;

    showChat();
    setBusy(true);
    if (typeof MiloCompanion !== 'undefined') {
      MiloCompanion.setGlobalState('thinking');
    }
    const startedAt = performance.now();
    appendMessage('user', prompt);
    const thinking = appendMessage('assistant', 'Thinking…');

    const greeting = getGreeting(prompt);
    if (greeting) {
      replaceMessage(thinking, greeting);
      saveTurn(prompt, greeting);
      setBusy(false);
      window.isAIProcessing = false;
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('responding', 'Hi! Great to see you.');
        setTimeout(() => MiloCompanion.setGlobalState('idle'), 3000);
      }
      const eventDetail = { success: true, local: true, latencyMs: Math.round(performance.now() - startedAt) };
      window.dispatchEvent(new CustomEvent('milo:answer', { detail: eventDetail }));
      window.dispatchEvent(new CustomEvent('juno:answer', { detail: eventDetail }));
      focusComposer();
      return true;
    }

    // Match any leading slash command (/image, /draw, /code, /research, etc.)
    const slashMatch = prompt.match(/^\/([a-zA-Z]+)(?:\s+(.*))?$/);

    // Check for Image Creation Request (Natural Language or Slash Command /image, /draw)
    const isImageCommand = slashMatch && (slashMatch[1].toLowerCase() === 'image' || slashMatch[1].toLowerCase() === 'draw');
    const isNaturalImageRequest = (
      /^(?:create|generate|make|draw|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|background|wallpaper|avatar|mascot|logo|render|graphic)\b/i.test(prompt) ||
      /(?:draw a|draw an|generate an image of|generate a picture of|create an image of|make an illustration of)\b/i.test(prompt)
    );

    if (isImageCommand || isNaturalImageRequest) {
      let imagePrompt = '';
      if (isImageCommand) {
        imagePrompt = (slashMatch[2] || '').trim();
      } else {
        imagePrompt = prompt
          .replace(/^(?:please\s+)?(?:can you\s+)?(?:create|generate|make|draw|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|background|wallpaper|avatar|mascot|logo|render|graphic)\s*(?:of|for|with)?\s*/i, '')
          .replace(/^(?:draw a|draw an|generate an image of|generate a picture of|create an image of|make an illustration of)\s*/i, '')
          .trim();
      }
      if (!imagePrompt) imagePrompt = prompt;

      replaceMessage(thinking, `🎨 **Milo Image Studio Active**\n\n*Synthesizing visual concepts for "${escapeHTML(imagePrompt)}"...*`);
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('thinking', 'Synthesizing visual concepts…');
      }

      try {
        let mediaItem = null;
        if (typeof window !== 'undefined' && window.MiloCreateStudio) {
          mediaItem = await window.MiloCreateStudio.generateImage({ prompt: imagePrompt, style: 'cinematic', aspectRatio: '1:1' });
        } else {
          const res = await fetch('/api/media/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imagePrompt, aspectRatio: '1:1' })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success || !data.imageUrl) throw new Error(data.error || 'Image generation failed');
          mediaItem = {
            id: `img_${Date.now()}`,
            url: data.imageUrl,
            prompt: imagePrompt,
            provider: data.provider || 'Milo Image Studio',
            aspectRatio: data.aspectRatio || '1:1',
            dimensions: data.dimensions || { width: 1024, height: 1024 }
          };
        }

        const cardHTML = `
<div class="chat-generated-media-card" data-inline-media="true" style="margin-top: 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid #1E293B; border-radius: 14px; overflow: hidden; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
  <div style="position: relative; overflow: hidden; background: #000; text-align: center;">
    <img src="${mediaItem.url}" alt="${escapeHTML(imagePrompt)}" style="width: 100%; height: auto; max-height: 420px; object-fit: contain; display: block; cursor: pointer; transition: transform 0.2s ease;" onclick="window.open('${mediaItem.url}', '_blank')" />
  </div>
  <div style="padding: 12px 14px; background: rgba(11, 15, 25, 0.95);">
    <div style="font-size: 13px; font-weight: 600; color: #F1F5F9; line-height: 1.4; margin-bottom: 8px;">🎨 ${escapeHTML(imagePrompt)}</div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
      <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-weight: 500;">${escapeHTML(mediaItem.provider)}</span>
      <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: rgba(148, 163, 184, 0.15); color: #94A3B8;">${escapeHTML(mediaItem.aspectRatio || '1:1')}</span>
      <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #10B981;">100% Complete</span>
    </div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <a href="${mediaItem.url}" download="milo_image_${Date.now()}.jpg" target="_blank" style="text-decoration: none; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: #00F2FE; color: #090D16; display: inline-flex; align-items: center; gap: 4px;">📥 Download</a>
      <button type="button" onclick="window.activateView && window.activateView('create')" style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #F1F5F9; cursor: pointer;">✨ Open in Studio</button>
      <button type="button" onclick="window.submitRAGQuery && window.submitRAGQuery('/image ' + '${escapeHTML(imagePrompt).replace(/'/g, "\\'")}')" style="font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #F1F5F9; cursor: pointer;">🔄 Regenerate</button>
    </div>
  </div>
</div>`;

        replaceMessage(thinking, cardHTML);
        saveTurn(prompt, `[Image Generated: ${imagePrompt}]`);
        setBusy(false);
        window.isAIProcessing = false;
        if (typeof MiloCompanion !== 'undefined') {
          MiloCompanion.setGlobalState('happy', 'Here is your created image!');
          setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
        }
        focusComposer();
        return true;
      } catch (imgErr) {
        replaceMessage(thinking, `⚠️ **Image Studio Notice**: ${imgErr.message}\n\n*Make sure an image provider is configured or test via the Create Studio.*`);
        setBusy(false);
        window.isAIProcessing = false;
        focusComposer();
        return false;
      }
    }

    // Check for Specialized Agent Execution or Slash Commands (/code, /learn, /study, /write, /research, /organize)
    if (slashMatch) {
      const command = slashMatch[1].toLowerCase();
      const taskPrompt = (slashMatch[2] || '').trim();
      const agentSystem = (typeof AgentSystem !== 'undefined' && AgentSystem.AgentSystem)
        ? (window.agentSystem || new AgentSystem.AgentSystem())
        : null;
      const researchEngine = (typeof DeepResearchEngine !== 'undefined')
        ? (window.deepResearchEngine || new DeepResearchEngine())
        : null;

      let executed = false;
      let agentResultText = '';

      try {
        if (command === 'code' && agentSystem) {
          executed = true;
          replaceMessage(thinking, '💻 **Coding Partner Active**\n\n*Step 1: Inspecting vault patterns and planning architecture...*');
          const res = await agentSystem.executeAgent('agent_coder', taskPrompt || 'Write clean, production-grade code architecture.', (step) => {
            replaceMessage(thinking, `💻 **Coding Partner**\n\n*Step ${step.step}: ${step.name} — ${step.detail}*`);
          });
          agentResultText = res.answer;
        } else if ((command === 'learn' || command === 'study') && agentSystem) {
          executed = true;
          replaceMessage(thinking, '🎓 **Study & Concept Explainer Active**\n\n*Step 1: Searching knowledge vault for grounded concepts...*');
          const res = await agentSystem.executeAgent('agent_study', taskPrompt || 'Explain core technical concepts from my vault.', (step) => {
            replaceMessage(thinking, `🎓 **Study Explainer**\n\n*Step ${step.step}: ${step.name} — ${step.detail}*`);
          });
          agentResultText = res.answer;
        } else if ((command === 'write' || command === 'summary') && agentSystem) {
          executed = true;
          replaceMessage(thinking, '✍️ **Writing & Document Drafter Active**\n\n*Step 1: Distilling executive takeaways and key decisions...*');
          const res = await agentSystem.executeAgent('agent_writer', taskPrompt || 'Distill executive summary from saved notes.', (step) => {
            replaceMessage(thinking, `✍️ **Document Drafter**\n\n*Step ${step.step}: ${step.name} — ${step.detail}*`);
          });
          agentResultText = res.answer;
        } else if (command === 'research' && researchEngine) {
          executed = true;
          replaceMessage(thinking, '🔬 **Deep Research Engine Active**\n\n*Step 1: Formulating 3-angle research plan...*');
          const res = await researchEngine.executeResearch(taskPrompt || 'State of the art systems architecture and benchmarks', (prog) => {
            replaceMessage(thinking, `🔬 **Deep Research Engine**\n\n*${prog.stage}: ${prog.detail || ''}*`);
          });
          agentResultText = res.report;
        } else if (command === 'organize' && agentSystem) {
          executed = true;
          replaceMessage(thinking, '🗂️ **Knowledge Organizer Active**\n\n*Step 1: Scanning vault clusters and detecting knowledge gaps...*');
          const res = await agentSystem.executeAgent('agent_organizer', taskPrompt || 'Scan and organize knowledge vault.', (step) => {
            replaceMessage(thinking, `🗂️ **Knowledge Organizer**\n\n*Step ${step.step}: ${step.name} — ${step.detail}*`);
          });
          agentResultText = res.answer;
        }
      } catch (agentErr) {
        agentResultText = `⚠️ Agent execution error: ${agentErr.message}`;
      }

      if (executed) {
        replaceMessage(thinking, agentResultText);
        saveTurn(prompt, agentResultText);
        setBusy(false);
        window.isAIProcessing = false;
        if (typeof MiloCompanion !== 'undefined') {
          MiloCompanion.setGlobalState('responding');
          setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
        }
        focusComposer();
        return true;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        }),
        signal: controller.signal
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
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('responding');
        setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
      }
      window.dispatchEvent(new CustomEvent('milo:answer', { detail: data }));
      window.dispatchEvent(new CustomEvent('juno:answer', { detail: data }));
      return true;
    } catch (error) {
      console.error('[Milo chat]', error);
      const isTimeout = error?.name === 'AbortError';
      const retrieved = retrieveNotes(prompt);
      if (retrieved.contextNotes && retrieved.contextNotes.length > 0) {
        const fallback = localFallback(prompt, retrieved);
        replaceMessage(thinking, fallback);
      } else {
        // Resilient On-Device Synthesis Fallback
        let localAns = '';
        if (typeof window !== 'undefined' && window.aiEngine && typeof window.aiEngine.fallbackSynthesize === 'function') {
          try {
            const fb = window.aiEngine.fallbackSynthesize(prompt, 'gemini-flash', '', null, getHistory());
            if (fb && fb.text) localAns = fb.text;
          } catch (_) {}
        } else if (typeof AIEngine !== 'undefined') {
          try {
            const engine = new AIEngine();
            const fb = engine.fallbackSynthesize(prompt, 'gemini-flash', '', null, getHistory());
            if (fb && fb.text) localAns = fb.text;
          } catch (_) {}
        }

        if (localAns) {
          replaceMessage(thinking, `${localAns}\n\n---\n*⚡ Synthesized via Milo On-Device Local Engine (Remote cloud service unavailable).*`);
        } else {
          const userMsg = isTimeout
            ? 'Request timed out after 25 seconds. Please try asking again.'
            : (error?.message || 'The AI service could not complete this request. Please try again.');
          replaceMessage(thinking, `⚠️ ${userMsg}`);
        }
      }
      if (typeof window.showToast === 'function') {
        window.showToast(isTimeout ? 'Request timed out.' : 'Cloud AI temporarily unavailable.', 'warning');
      }
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('error', 'I encountered an issue reaching the cloud AI.');
        setTimeout(() => MiloCompanion.setGlobalState('idle'), 4000);
      }
      const errorDetail = { success: false, fallback: true, error: error?.message || 'Gateway unavailable' };
      window.dispatchEvent(new CustomEvent('milo:answer', { detail: errorDetail }));
      window.dispatchEvent(new CustomEvent('juno:answer', { detail: errorDetail }));
      return false;
    } finally {
      clearTimeout(timeoutId);
      setBusy(false);
      window.isAIProcessing = false;
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
    if (hero) {
      hero.style.display = '';
      hero.classList.remove('hidden');
    }
    if (container) container.style.display = 'none';
    const miloBar = document.getElementById('milo-chat-companion-bar');
    if (miloBar) miloBar.style.display = 'none';
    if (typeof MiloCompanion !== 'undefined') {
      MiloCompanion.setGlobalState('idle');
    }
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
    document.title = 'Milo — your notes, in context';

    document.querySelectorAll('h1,h2,h3,p,button').forEach((el) => {
      const text = clean(el.textContent);
      if (text === 'Talk to Your Second Brain like Jarvis') el.textContent = 'Your notes, in context.';
      if (text.includes('Ask questions out loud or via text. Answers are synthesized strictly from your saved notes')) {
        el.textContent = 'Ask about something you saved, or ask a normal question. Milo uses your notes when they help.';
      }
      if (text === 'Query RAG') el.textContent = 'Ask Milo';
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
  window.miloResetChat = createFallbackNewChat;
  window.junoResetChat = createFallbackNewChat;
  window.insertSampleQuery = function (text) {
    const input = document.getElementById('rag-query-input');
    if (input) {
      input.value = text;
      input.focus();
    }
  };

  function boot() {
    polishInterface();
    // A second pass handles markup injected by older UI modules after DOM ready.
    setTimeout(() => { wireComposer(); hardenNavigation(); }, 100);
    setTimeout(() => { wireComposer(); hardenNavigation(); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
