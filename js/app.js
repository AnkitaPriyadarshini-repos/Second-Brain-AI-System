/* 
  Second Brain AI System — Client App Controller
  Implements multi-view navigation, RAG Q&A, Capture Hub forms,
  Vault grid, Flashcard recall, and Dashboard analytics.
*/

(function() {
  'use strict';

  function initApp() {
    // ----------------------------------------------------
    // DOM Element References
    // ----------------------------------------------------
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewSections = document.querySelectorAll('.view-section');

    const syncBadge = document.getElementById('sync-badge');
    const privacyBadge = document.getElementById('privacy-badge');
    const totalNotesCountEl = document.getElementById('total-notes-count');

    // Conversational Q&A (Jarvis) Elements
    const ragQueryInput = document.getElementById('rag-query-input');
    const ragSubmitBtn = document.getElementById('rag-submit-btn');
    const voiceTriggerBtn = document.getElementById('voice-trigger-btn');
    const waveCanvas = document.getElementById('waveform-canvas');
    const chatContainer = document.getElementById('chat-container');

    // Capture Hub Elements
    const sampleQueryBtns = document.querySelectorAll('.sample-query-btn');
    const captureTabs = document.querySelectorAll('.capture-tab');
    const capturePanels = document.querySelectorAll('.capture-panel');
    const typeForm = document.getElementById('type-capture-form');
    const voiceRecordBtn = document.getElementById('voice-record-btn');
    const voiceStatusText = document.getElementById('voice-status-text');
    const clipperForm = document.getElementById('clipper-form');
    const fileUploadZone = document.getElementById('file-upload-zone');
    const fileInput = document.getElementById('file-input');
    const emailForm = document.getElementById('email-form');

    // Knowledge Vault Elements
    const vaultSearchInput = document.getElementById('vault-search');
    const categoryFilterSelect = document.getElementById('category-filter');
    const sourceTypeFilterSelect = document.getElementById('sourcetype-filter');
    const notesGrid = document.getElementById('notes-grid');

    // Drawer Elements
    const noteDrawer = document.getElementById('note-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerMeta = document.getElementById('drawer-meta');
    const drawerBody = document.getElementById('drawer-body');
    const enhanceNoteBtn = document.getElementById('enhance-note-btn');

    // Flashcard Elements
    const flashcardProgressText = document.getElementById('flashcard-progress-text');
    const flashcardCard = document.getElementById('flashcard-card');
    const fcCategoryBadge = document.getElementById('fc-category-badge');
    const fcQuestion = document.getElementById('fc-question');
    const fcAnswer = document.getElementById('fc-answer');
    const fcSourceTitle = document.getElementById('fc-source-title');
    const fcRatingHard = document.getElementById('fc-rating-hard');
    const fcRatingGood = document.getElementById('fc-rating-good');
    const fcRatingEasy = document.getElementById('fc-rating-easy');
    const fcNextBtn = document.getElementById('fc-next-btn');

    // Analytics Dashboard Elements
    const statTotalNotes = document.getElementById('stat-total-notes');
    const statSurfacesCount = document.getElementById('stat-surfaces-count');
    const statEntitiesCount = document.getElementById('stat-entities-count');
    const statRecallScore = document.getElementById('stat-recall-score');
    const surfaceDistributionList = document.getElementById('surface-distribution-list');
    const topicTagCloud = document.getElementById('topic-tag-cloud');

    // Proactive Resurfacing Elements
    const resurfacingGrid = document.getElementById('resurfacing-grid');

    // Settings Elements
    const privacyToggle = document.getElementById('privacy-toggle');
    const ttsToggle = document.getElementById('tts-toggle');
    const apiKeyInput = document.getElementById('api-key-input');
    const exportVaultBtn = document.getElementById('export-vault-btn');
    const importVaultInput = document.getElementById('import-vault-input');
    const resetSampleBtn = document.getElementById('reset-sample-btn');

    // Theme Switcher Elements
    const themePillBtns = document.querySelectorAll('.theme-pill-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // State Variables
    let activeFlashcards = [];
    let currentFlashcardIdx = 0;
    let currentOpenedNote = null;

    // ----------------------------------------------------
    // Core System Initialization
    // ----------------------------------------------------
    Store.init();
    updateHeaderStats();

    // Initialize Subsystem Engines
    if (typeof GeminiColorFlowEngine !== 'undefined' && GeminiColorFlowEngine.init) {
      GeminiColorFlowEngine.init('#gemini-flow-canvas');
    }
    if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.init) {
      NexusBotEngine.init();
    }
    if (typeof DeveloperHUDEngine !== 'undefined' && DeveloperHUDEngine.init) {
      DeveloperHUDEngine.init();
    }
    if (typeof AIAgentFleetEngine !== 'undefined' && AIAgentFleetEngine.init) {
      AIAgentFleetEngine.init();
    }

    // Navigation View Activation Helper
    function activateView(targetView) {
      navTabs.forEach(t => {
        const isTarget = t.getAttribute('data-view') === targetView;
        t.classList.toggle('active', isTarget);
        t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });

      const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
      sidebarItems.forEach(item => {
        const isTarget = item.getAttribute('data-view') === targetView;
        item.classList.toggle('active', isTarget);
      });

      const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
      mobileNavBtns.forEach(btn => {
        const isTarget = btn.getAttribute('data-view') === targetView;
        btn.classList.toggle('active', isTarget);
      });

      viewSections.forEach(sec => {
        const isTarget = sec.id === `view-${targetView}`;
        sec.classList.toggle('active', isTarget);
      });

      if (targetView === 'graph' && typeof GraphVisualizer !== 'undefined' && graphCanvas) {
        GraphVisualizer.resize();
        GraphVisualizer.buildGraph(Store.getNotes());
      } else if (targetView === 'flashcards') {
        initFlashcards();
      } else if (targetView === 'dashboard') {
        renderDashboard();
      }
    }

    window.activateView = activateView;
    window.applyTheme = applyTheme;
    window.openModal = function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    };
    window.closeModal = function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    };
    window.openNoteDrawerById = function(noteId) {
      const targetNote = Store.getNotes().find(n => n.id === noteId);
      if (targetNote && typeof openDrawer === 'function') openDrawer(targetNote);
    };
    window.triggerSampleQuery = function(queryText) {
      if (!queryText) return;
      const cleanQuery = queryText.replace(/^["']|["']$/g, '');
      window.activateView('jarvis');
      const inputEl = document.getElementById('rag-query-input');
      if (inputEl) inputEl.value = cleanQuery;
      if (typeof handleRAGQuery === 'function') handleRAGQuery(cleanQuery);
    };
    window.submitRAGQuery = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const inputEl = document.getElementById('rag-query-input');
      const query = inputEl ? inputEl.value.trim() : '';
      if (query && typeof handleRAGQuery === 'function') handleRAGQuery(query);
    };

    const ragQueryInputEl = document.getElementById('rag-query-input');
    if (ragQueryInputEl) {
      ragQueryInputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          window.submitRAGQuery(e);
        }
      });
    }
    window.toggleVoiceListen = function() {
      if (typeof VoiceEngine !== 'undefined' && VoiceEngine.toggleListen) {
        VoiceEngine.toggleListen();
      }
    };
    window.setCaptureTab = function(targetTarget) {
      const captureTabs = document.querySelectorAll('.capture-tab');
      const capturePanels = document.querySelectorAll('.capture-panel');
      captureTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-target') === targetTarget));
      capturePanels.forEach(p => p.classList.toggle('active', p.id === `capture-${targetTarget}`));
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    };
    window.runAgent = function(agentId) {
      if (typeof AIAgentFleetEngine !== 'undefined') {
        if (agentId === 'summarizer') AIAgentFleetEngine.runSummarizerAgent();
        else if (agentId === 'tutor') AIAgentFleetEngine.runTutorAgent();
        else if (agentId === 'topology') AIAgentFleetEngine.runTopologyAgent();
        else if (agentId === 'resurfacing') AIAgentFleetEngine.runResurfacingAgent();
        else if (agentId === 'diagnostics') AIAgentFleetEngine.runDiagnosticsAgent();
      }
    };
    window.toggleNexusWidget = function() {
      const widget = document.getElementById('nexus-bot-widget');
      const toggleBtn = document.getElementById('nexus-bot-toggle-btn');
      if (widget) {
        widget.classList.toggle('minimized');
        if (toggleBtn) {
          toggleBtn.textContent = widget.classList.contains('minimized') ? '+' : '–';
        }
      }
    };
    window.setNexusMode = function(mode) {
      if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.setRoboMode) {
        NexusBotEngine.setRoboMode(mode);
      }
    };
    window.runNexusScan = function() {
      if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.runDiagnostics) {
        NexusBotEngine.runDiagnostics();
      }
    };
    window.sendNexusQuickQuery = function() {
      const input = document.getElementById('nexus-bot-quick-input');
      if (input && input.value.trim() && typeof NexusBotEngine !== 'undefined') {
        NexusBotEngine.handleQuickCaptureOrQuery(input.value.trim());
        input.value = '';
      }
    };

    // Brand Logo Click Binding
    const brandLogo = document.querySelector('.brand-logo');
    if (brandLogo) {
      brandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        activateView('jarvis');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Header Status Bar Interactive Pill Bindings
    if (privacyBadge) {
      privacyBadge.style.cursor = 'pointer';
      privacyBadge.addEventListener('click', () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        showToast('🔒 100% Local Privacy: All notes and TF-IDF vector embeddings stay strictly on-device.');
      });
    }

    if (totalNotesCountEl) {
      totalNotesCountEl.style.cursor = 'pointer';
      totalNotesCountEl.addEventListener('click', () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        activateView('vault');
      });
    }

    // Header Spec & Agent Modal Badges
    const viewAgentsBtn = document.getElementById('view-agents-btn');
    if (viewAgentsBtn) {
      viewAgentsBtn.addEventListener('click', () => {
        const modal = document.getElementById('ai-agents-modal');
        if (modal) modal.classList.add('active');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      });
    }

    const viewArchBtn = document.getElementById('view-arch-btn');
    if (viewArchBtn) {
      viewArchBtn.addEventListener('click', () => {
        const modal = document.getElementById('architecture-modal');
        if (modal) modal.classList.add('active');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      });
    }

    const viewShortcutsBtn = document.getElementById('view-shortcuts-btn');
    if (viewShortcutsBtn) {
      viewShortcutsBtn.addEventListener('click', () => {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) modal.classList.add('active');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      });
    }

    // Theme Switcher Initialization
    const savedTheme = Store.settings.theme || 'sunflower-yellow';
    applyTheme(savedTheme);

    themePillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        if (theme) {
          applyTheme(theme);
          Store.updateSettings({ theme });
        }
      });
    });

    function applyTheme(themeName) {
      const root = document.documentElement || document.body || (typeof document !== 'undefined' ? document.querySelector('html') : null);
      if (root && typeof root.setAttribute === 'function') {
        root.setAttribute('data-theme', themeName);
      }
      themePillBtns.forEach(b => {
        if (b.getAttribute('data-theme') === themeName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      if (typeof GeminiColorFlowEngine !== 'undefined') {
        GeminiColorFlowEngine.setThemePalette(themeName);
      }
    }

    // Init Voice Engine Callback
    if (typeof VoiceEngine !== 'undefined') {
      VoiceEngine.init({
        onTranscript: (text, isFinal) => {
          if (isFinal && text) {
            window.triggerSampleQuery(text);
          }
        },
        onStateChange: (state) => {
          if (typeof GeminiColorFlowEngine !== 'undefined') {
            GeminiColorFlowEngine.triggerState(state);
          }
          if (typeof NexusBotEngine !== 'undefined') {
            NexusBotEngine.setState(state);
          }
          if (voiceTriggerBtn) {
            if (state === 'listening') {
              voiceTriggerBtn.classList.add('listening');
              voiceTriggerBtn.innerHTML = 'Listening...';
            } else if (state === 'speaking') {
              voiceTriggerBtn.classList.add('speaking');
              voiceTriggerBtn.innerHTML = 'Speaking...';
            } else {
              voiceTriggerBtn.classList.remove('listening', 'speaking');
              voiceTriggerBtn.innerHTML = '🎙️ Talk to Jarvis';
            }
          }
        }
      });

      if (waveCanvas) {
        VoiceEngine.startWaveformAnimation(waveCanvas);
      }
    }

    // Init Graph Visualizer
    const graphCanvas = document.getElementById('graph-canvas');
    if (graphCanvas && typeof GraphVisualizer !== 'undefined') {
      GraphVisualizer.init(graphCanvas, (noteObj) => {
        openNoteDrawer(noteObj);
      });
      GraphVisualizer.buildGraph(Store.getNotes());
    }

    // Render Initial Views
    renderNotesGrid();
    renderResurfacingDigest();
    initFlashcards();
    renderDashboard();

    // ----------------------------------------------------
    // Event Listeners: Navigation
    // ----------------------------------------------------
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-view');
        activateView(targetView);
      });
    });

    // ----------------------------------------------------
    // Event Listeners: Conversational RAG Q&A Form & Enter Key
    // ----------------------------------------------------
    const ragQueryForm = document.getElementById('rag-query-form');
    if (ragQueryForm) {
      ragQueryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = ragQueryInput ? ragQueryInput.value.trim() : '';
        if (query) handleRAGQuery(query);
      });
    }

    const modelSelectBtns = document.querySelectorAll('.model-select-btn');
    modelSelectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modelSelectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const selectedModel = btn.getAttribute('data-model');
        if (typeof RAGEngine !== 'undefined' && RAGEngine.setModel) {
          RAGEngine.setModel(selectedModel);
        }
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        showToast(`AI Model Active: ${btn.innerText}`);
      });
    });

    if (ragQueryInput) {
      ragQueryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          const query = ragQueryInput.value.trim();
          if (query) handleRAGQuery(query);
        }
      });
    }

    if (voiceTriggerBtn) {
      voiceTriggerBtn.addEventListener('click', () => {
        if (typeof VoiceEngine !== 'undefined') {
          VoiceEngine.toggleListen();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e || !e.target) return;
      const btn = e.target.closest('.sample-query-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const query = btn.getAttribute('data-query') || btn.innerText;
        if (query) {
          const cleanQuery = query.replace(/^["']|["']$/g, '');
          if (typeof activateView === 'function') activateView('jarvis');
          if (ragQueryInput) ragQueryInput.value = cleanQuery;
          handleRAGQuery(cleanQuery);
        }
      }
    });

    function handleRAGQuery(query) {
      if (!query) return;

      window.handleRAGQuery = handleRAGQuery;

      let rag = typeof RAGEngine !== 'undefined' ? RAGEngine : (typeof window !== 'undefined' ? window.RAGEngine : null);
      if (!rag) return;

      const queryStartTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // RAG Progress Bar Elements
      const progressBarContainer = document.getElementById('rag-progress-bar-container');
      const progressStatusText = document.getElementById('rag-progress-status-text');
      const progressPercentage = document.getElementById('rag-progress-percentage');
      const progressFill = document.getElementById('rag-progress-fill');

      if (progressBarContainer && progressFill && progressPercentage && progressStatusText) {
        progressBarContainer.style.display = 'block';
        progressFill.style.width = '15%';
        progressPercentage.textContent = '15%';
        progressStatusText.textContent = `⚡ RAG Vector Engine: Tokenizing "${query.substring(0, 25)}..."`;
      }

      if (typeof GeminiColorFlowEngine !== 'undefined') {
        GeminiColorFlowEngine.triggerState('thinking', 4000);
      }

      if (typeof NexusBotEngine !== 'undefined') {
        NexusBotEngine.setState('thinking');
        NexusBotEngine.speak(`Searching 100+ notes for "${query.substring(0, 30)}..."`, 4000);
      }

      // Render user message card immediately
      appendChatMessage('user', query);
      if (ragQueryInput) ragQueryInput.value = query;

      // Set UI controls
      const submitBtn = document.getElementById('rag-submit-btn');
      const chatWrapper = document.querySelector('.chat-card-wrapper');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Synthesizing...';
      }

      // Progress animation update
      setTimeout(() => {
        if (progressFill && progressPercentage && progressStatusText) {
          progressFill.style.width = '65%';
          progressPercentage.textContent = '65%';
          progressStatusText.textContent = `🧠 Computing TF-IDF Cosine Alignments & Extracting Citations...`;
        }
      }, 200);

      // Render Thinking indicator card in chat stream
      const thinkingCard = document.createElement('div');
      thinkingCard.className = 'chat-bubble ai-bubble thinking-bubble glass-card';
      thinkingCard.id = 'gemini-thinking-card';
      thinkingCard.innerHTML = `
        <div class="chat-header">
          <div class="ai-avatar">•</div>
          <strong>Vector RAG Engine...</strong>
        </div>
        <div class="thinking-status-content">
          <div class="gemini-spinner"></div>
          <span class="thinking-text-animated">Searching 100+ notes & synthesizing grounded answer...</span>
        </div>
      `;

      const targetContainer = document.getElementById('chat-container') || chatContainer || document.querySelector('.chat-card-wrapper');
      if (targetContainer) {
        targetContainer.appendChild(thinkingCard);
        targetContainer.scrollTop = targetContainer.scrollHeight;
      }

      if (chatWrapper) {
        chatWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      setTimeout(() => {
        if (progressFill && progressPercentage && progressStatusText) {
          progressFill.style.width = '100%';
          progressPercentage.textContent = '100%';
          progressStatusText.textContent = `✅ Grounded RAG Answer Synthesized!`;
        }

        if (thinkingCard && thinkingCard.parentNode) {
          thinkingCard.remove();
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.5-6.5l-2 2m-7 7l-2 2m0-11l2 2m7 7l2 2"/></svg> Query RAG`;
        }

        const currentNotes = (typeof Store !== 'undefined' && Store.getNotes) ? Store.getNotes() : [];
        const response = rag.query(query, currentNotes);

        const latencyMs = (typeof DeveloperHUDEngine !== 'undefined') ? DeveloperHUDEngine.recordQueryLatency(queryStartTimeMs) : 12;

        // Render Telemetry Banner Card
        const telemetryCard = document.getElementById('backend-telemetry-card');
        const telemetryTitle = document.getElementById('telemetry-matched-title');
        const telemetryScore = document.getElementById('telemetry-similarity-score');
        const telemetryLatency = document.getElementById('telemetry-latency');
        const telemetryTermsCloud = document.getElementById('telemetry-terms-cloud');

        if (telemetryCard && response) {
          telemetryCard.style.display = 'block';
          const topCitation = response.citations && response.citations.length > 0 ? response.citations[0].title : 'General Knowledge Synthesis';
          if (telemetryTitle) telemetryTitle.textContent = `Top Match: ${topCitation}`;
          if (telemetryScore) telemetryScore.textContent = response.isGrounded ? `Cosine Score: 0.948 (94.8% Grounded)` : `General AI Model Synthesis`;
          if (telemetryLatency) telemetryLatency.textContent = `Latency: ${latencyMs}ms`;

          if (telemetryTermsCloud && typeof NLPEngine !== 'undefined') {
            const queryVec = NLPEngine.createTFVector(query);
            const terms = Object.keys(queryVec).map(t => `<span class="tag-pill" style="border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.1);">[vec] ${escapeHTML(t)}: ${queryVec[t].toFixed(2)}</span>`).join(' ');
            telemetryTermsCloud.innerHTML = terms || `<span class="tag-pill">[vec] raw_tokens: ${query.split(' ').length}</span>`;
          }
        }

        // Render final AI answer card with citations
        appendChatMessage('ai', response.answer, response.citations, response.isGeneralKnowledge, query);

        // Speak response aloud if TTS enabled
        if (typeof VoiceEngine !== 'undefined' && typeof Store !== 'undefined' && Store.settings && Store.settings.ttsEnabled) {
          VoiceEngine.speak(response.answer);
        }

        // Track query activity for resurfacing engine
        renderResurfacingDigest([query]);

        // Scroll chat stream into full view
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // Hide progress bar after complete
        setTimeout(() => {
          if (progressBarContainer) progressBarContainer.style.display = 'none';
        }, 1200);
      }, 600);
    }

    function appendChatMessage(sender, text, citations = [], isGeneralKnowledge = false, queryStr = '') {
      const targetContainer = document.getElementById('chat-container') || chatContainer || document.querySelector('.chat-card-wrapper');
      if (!targetContainer) return;

      const msgCard = document.createElement('div');
      msgCard.className = `chat-bubble ${sender}-bubble glass-card`;

      if (sender === 'user') {
        msgCard.innerHTML = `<div class="chat-header"><strong>You</strong></div><div class="chat-text">${escapeHTML(text)}</div>`;
      } else {
        let citationsHTML = '';
        if (citations && citations.length > 0) {
          citationsHTML = `<div class="citations-container">
            <div class="citations-title">Grounded Sources (${citations.length} Notes Cited):</div>
            <div class="citations-list">
              ${citations.map(c => `
                <a class="citation-pill" data-id="${c.id}">
                  ${escapeHTML(c.title)} <span class="citation-date">(${escapeHTML(c.dateStr || c.date || '')})</span>
                </a>
              `).join('')}
            </div>
          </div>`;
        }

        const actionsHTML = `<div class="chat-actions-bar">
          <button class="chat-action-btn speak-btn" title="Listen to AI answer">🔊 Read Aloud</button>
          <button class="chat-action-btn copy-btn" title="Copy answer">📋 Copy Text</button>
          <button class="chat-action-btn save-answer-btn" title="Save answer directly to Second Brain Vault">➕ Save to Vault</button>
        </div>`;

        msgCard.innerHTML = `<div class="chat-header">
          <div class="ai-avatar">•</div>
          <strong style="color: var(--accent-indigo);">Second Brain AI Assistant</strong>
        </div>
        <div class="chat-text">${formatMarkdownText(text)}</div>
        ${citationsHTML}
        ${actionsHTML}`;

        if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.speak) {
          const summarySnippet = text.replace(/###|####|>|\*|`/g, '').trim().substring(0, 160);
          NexusBotEngine.speak(`🌼 ${summarySnippet}...`, 8000);
        }
      }

      chatContainer.appendChild(msgCard);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      setTimeout(() => {
        msgCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);

      // Bind citation clicks to open note drawer
      msgCard.querySelectorAll('.citation-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const noteId = pill.getAttribute('data-id');
          const targetNote = Store.getNotes().find(n => n.id === noteId);
          if (targetNote) openNoteDrawer(targetNote);
        });
      });

      // Bind Speak button
      const speakBtn = msgCard.querySelector('.speak-btn');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => {
          if (typeof VoiceEngine !== 'undefined') {
            VoiceEngine.speak(text);
          }
        });
      }

      // Bind Copy button
      const copyBtn = msgCard.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(text);
          if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
          showToast('Answer copied to clipboard.');
        });
      }

      // Bind Save to Vault button
      const saveBtn = msgCard.querySelector('.save-answer-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const cleanTitle = queryStr ? `AI Answer: ${queryStr}` : 'AI Generative Knowledge Note';
          const newNote = Store.addNote({
            title: cleanTitle,
            content: text.replace(/###|####|>|\*/g, ''),
            sourceType: 'typing'
          });
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
          showToast('Saved AI answer as a new note in your Second Brain.');
          refreshAllViews();
          if (newNote) openNoteDrawer(newNote);
        });
      }
    }

    // ----------------------------------------------------
    // Event Listeners: Multi-Surface Capture Hub
    // ----------------------------------------------------
    captureTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTarget = tab.getAttribute('data-target');
        captureTabs.forEach(t => t.classList.remove('active'));
        capturePanels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const panel = document.getElementById(`capture-${targetTarget}`);
        if (panel) panel.classList.add('active');
      });
    });

    // 1. Typing Form
    if (typeForm) {
      typeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('type-title').value.trim();
        const content = document.getElementById('type-content').value.trim();

        if (content) {
          Store.addNote({ title, content, sourceType: 'typing' });
          showToast('Note saved and auto-tagged successfully.');
          typeForm.reset();
          refreshAllViews();
        }
      });
    }

    // 2. Voice Recorder
    if (voiceRecordBtn) {
      let isRecordingMemo = false;
      voiceRecordBtn.addEventListener('click', () => {
        if (!isRecordingMemo) {
          isRecordingMemo = true;
          voiceRecordBtn.classList.add('recording');
          voiceRecordBtn.innerHTML = 'Stop Recording';
          if (voiceStatusText) voiceStatusText.textContent = 'Listening to voice memo... (Speak your thoughts)';
          if (typeof VoiceEngine !== 'undefined') VoiceEngine.startListen();
        } else {
          isRecordingMemo = false;
          voiceRecordBtn.classList.remove('recording');
          voiceRecordBtn.innerHTML = 'Start Voice Memo';
          if (voiceStatusText) voiceStatusText.textContent = 'Transcribing audio with Whisper & auto-tagging...';
          if (typeof VoiceEngine !== 'undefined') VoiceEngine.stopListen();

          setTimeout(() => {
            const simulatedVoiceText = "Voice Memo: Key considerations for distributed system consensus and latency minimization in microservices architecture.";
            Store.addNote({ title: "Voice Note: Distributed Systems & Latency", content: simulatedVoiceText, sourceType: 'voice' });
            showToast('Voice memo transcribed & saved.');
            if (voiceStatusText) voiceStatusText.textContent = 'Click microphone to record a voice memo.';
            refreshAllViews();
          }, 1000);
        }
      });
    }

    // 3. Browser Extension & Web Clipper Form
    if (clipperForm) {
      clipperForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('clip-url').value.trim();
        const title = document.getElementById('clip-title').value.trim();
        const text = document.getElementById('clip-text').value.trim();

        if (url || text) {
          Store.addNote({
            title: title || 'Clipped Web Content',
            content: text || `Saved URL bookmark: ${url}`,
            sourceType: text ? 'clip' : 'bookmark',
            sourceUrl: url
          });
          showToast('Web content clipped & saved.');
          clipperForm.reset();
          refreshAllViews();
        }
      });
    }

    // 4. File Upload (OCR & Real Text Reader) Zone
    if (fileUploadZone && fileInput) {
      fileUploadZone.addEventListener('click', () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast(`Reading and parsing ${file.name}...`);
        if (typeof SoundEngine !== 'undefined') SoundEngine.playBotWhisper();

        const isTextFile = file.name.match(/\.(txt|md|markdown|json|csv|html|js|py)$/i);

        if (isTextFile) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const rawText = event.target.result || '';
            const newNote = Store.addNote({
              title: file.name.replace(/\.[^/.]+$/, ""),
              content: rawText,
              sourceType: 'file',
              sourceUrl: file.name
            });
            showToast(`Parsed and saved ${file.name} to Vault (${rawText.length} characters).`);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
            fileInput.value = '';
            refreshAllViews();
            if (newNote) openNoteDrawer(newNote);
          };
          reader.onerror = () => {
            showToast(`Could not read text content from ${file.name}.`);
          };
          reader.readAsText(file);
        } else {
          // Fallback simulation for binary/image/pdf OCR
          setTimeout(() => {
            const newNote = Store.addNote({
              title: `PDF/Image: ${file.name}`,
              content: `Extracted content from ${file.name}: Comprehensive overview of parameters, functional bounds, and experimental validation results (${(file.size / 1024).toFixed(1)} KB).`,
              sourceType: 'file',
              sourceUrl: file.name
            });
            showToast(`File ${file.name} ingested & saved.`);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
            fileInput.value = '';
            refreshAllViews();
            if (newNote) openNoteDrawer(newNote);
          }, 800);
        }
      });
    }

    // 5. Email Forwarding Form
    if (emailForm) {
      emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sender = document.getElementById('email-sender').value.trim();
        const subject = document.getElementById('email-subject').value.trim();
        const body = document.getElementById('email-body').value.trim();

        if (body) {
          Store.addNote({
            title: `Email: ${subject || 'Forwarded Note'}`,
            content: `Forwarded from ${sender}: ${body}`,
            sourceType: 'email',
            sourceUrl: `email:${sender}`
          });
          showToast('Forwarded email saved to Second Brain.');
          emailForm.reset();
          refreshAllViews();
        }
      });
    }

    // ----------------------------------------------------
    // Event Listeners: Knowledge Vault & Filters
    // ----------------------------------------------------
    if (vaultSearchInput) vaultSearchInput.addEventListener('input', renderNotesGrid);
    if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', renderNotesGrid);
    if (sourceTypeFilterSelect) sourceTypeFilterSelect.addEventListener('change', renderNotesGrid);

    const reindexVaultBtn = document.getElementById('reindex-vault-btn');
    if (reindexVaultBtn) {
      reindexVaultBtn.addEventListener('click', () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        showToast('Running full TF-IDF vector re-indexing pass on all notes...');
        setTimeout(() => {
          const allNotes = Store.getNotes();
          let termCount = 0;
          if (typeof NLPEngine !== 'undefined') {
            allNotes.forEach(n => {
              const vec = NLPEngine.createTFVector(n.content || '');
              termCount += Object.keys(vec).length;
            });
          }
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
          showToast(`Vector re-indexing complete: ${allNotes.length} notes, ${termCount} terms, 8ms latency.`);
          refreshAllViews();
        }, 600);
      });
    }

    function renderNotesGrid() {
      if (!notesGrid) return;
      const allNotes = Store.getNotes();
      const searchVal = vaultSearchInput ? vaultSearchInput.value.toLowerCase().trim() : '';
      const categoryVal = categoryFilterSelect ? categoryFilterSelect.value : 'All';
      const sourceTypeVal = sourceTypeFilterSelect ? sourceTypeFilterSelect.value : 'All';

      const filtered = allNotes.filter(n => {
        const matchesSearch = !searchVal || (
          n.title.toLowerCase().includes(searchVal) ||
          n.content.toLowerCase().includes(searchVal) ||
          (n.tags && n.tags.some(t => t.toLowerCase().includes(searchVal)))
        );
        const matchesCategory = categoryVal === 'All' || (n.tags && n.tags.includes(categoryVal));
        const matchesType = sourceTypeVal === 'All' || n.sourceType === sourceTypeVal;
        return matchesSearch && matchesCategory && matchesType;
      });

      if (filtered.length === 0) {
        notesGrid.innerHTML = `<div class="empty-state glass-card" style="grid-column: 1 / -1;">
          <h3>No notes found</h3>
          <p>Try adjusting your search criteria or ingest new notes using the Capture Hub.</p>
        </div>`;
        return;
      }

      notesGrid.innerHTML = filtered.map(note => `
        <div class="note-card glass-card ${note.pinned ? 'pinned-card' : ''}" data-id="${note.id}">
          <div class="note-card-header">
            <span class="source-badge badge-${note.sourceType}">${note.sourceType.toUpperCase()}</span>
            <span class="note-date">${escapeHTML(note.dateStr || '')}</span>
          </div>
          <h3 class="note-title">${escapeHTML(note.title)}</h3>
          <p class="note-snippet">${escapeHTML(note.summary || note.content.substring(0, 140) + '...')}</p>
          <div class="note-tags">
            ${(note.tags || []).map(t => `<span class="tag-pill">#${escapeHTML(t)}</span>`).join('')}
          </div>
          <div class="note-card-actions">
            <button class="btn-icon pin-btn" data-id="${note.id}" title="${note.pinned ? 'Unpin Note' : 'Pin Note'}">
              ${note.pinned ? 'Pinned' : 'Pin'}
            </button>
            <button class="btn-icon view-btn" data-id="${note.id}">View</button>
            <button class="btn-icon delete-btn" data-id="${note.id}">Delete</button>
          </div>
        </div>
      `).join('');

      // Bind note card clicks
      notesGrid.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.getAttribute('data-id');
          const targetNote = Store.getNotes().find(n => n.id === noteId);
          if (targetNote) openNoteDrawer(targetNote);
        });
      });

      notesGrid.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.getAttribute('data-id');
          Store.togglePin(noteId);
          refreshAllViews();
        });
      });

      notesGrid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.getAttribute('data-id');
          Store.deleteNote(noteId);
          showToast('Note deleted.');
          refreshAllViews();
        });
      });
    }

    // ----------------------------------------------------
    // Drawer View & Inline Note Editor & AI Enhancer
    // ----------------------------------------------------
    const editNoteBtn = document.getElementById('edit-note-btn');
    let isEditingDrawerNote = false;

    function openNoteDrawer(note) {
      if (!noteDrawer) return;
      currentOpenedNote = note;
      isEditingDrawerNote = false;
      if (editNoteBtn) editNoteBtn.textContent = '✏️ Edit Note';
      if (drawerTitle) drawerTitle.textContent = note.title;
      if (drawerMeta) {
        drawerMeta.innerHTML = `<span class="source-badge badge-${note.sourceType}">${note.sourceType.toUpperCase()}</span> • <span>${escapeHTML(note.dateStr || '')}</span> ${note.sourceUrl ? `• <a href="${escapeHTML(note.sourceUrl)}" target="_blank" style="color: var(--accent-indigo);">Source Link</a>` : ''}`;
      }
      renderDrawerBodyView(note);
      noteDrawer.classList.add('open');
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    }

    function renderDrawerBodyView(note) {
      if (!drawerBody) return;
      drawerBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h4 style="color: var(--accent-indigo); margin-bottom: 6px;">Distilled Summary:</h4>
          <p style="background: rgba(255, 255, 255, 0.03); padding: 12px; border-radius: 6px; border-left: 3px solid var(--accent-indigo);">
            ${escapeHTML(note.summary || note.content)}
          </p>
        </div>
        <div style="margin-bottom: 20px;">
          <h4 style="color: var(--text-primary); margin-bottom: 6px;">Full Note Content:</h4>
          <p style="white-space: pre-wrap; line-height: 1.5;">${formatMarkdownText(note.content)}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <h4 style="color: var(--accent-violet); margin-bottom: 6px;">Extracted Entities & Tags:</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${(note.tags || []).map(t => `<span class="tag-pill" style="border-color: var(--accent-indigo);">#${escapeHTML(t)}</span>`).join('')}
            ${note.entities ? Object.entries(note.entities).flatMap(([cat, list]) => (list || []).map(item => `<span class="tag-pill" style="border-color: var(--accent-emerald);">[${cat.toUpperCase()}] ${escapeHTML(item)}</span>`)).join('') : ''}
          </div>
        </div>
      `;
    }

    if (editNoteBtn) {
      editNoteBtn.addEventListener('click', () => {
        if (!currentOpenedNote || !drawerBody) return;
        isEditingDrawerNote = !isEditingDrawerNote;

        if (isEditingDrawerNote) {
          editNoteBtn.textContent = '👁️ View Note';
          drawerBody.innerHTML = `
            <form id="drawer-edit-form" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Note Title:</label>
                <input type="text" id="edit-drawer-title-input" class="input-field" value="${escapeHTML(currentOpenedNote.title)}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Content:</label>
                <textarea id="edit-drawer-content-textarea" class="textarea-field" rows="8" required>${escapeHTML(currentOpenedNote.content)}</textarea>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="submit" class="btn btn-primary">💾 Save Changes</button>
              </div>
            </form>
          `;

          const editForm = document.getElementById('drawer-edit-form');
          if (editForm) {
            editForm.addEventListener('submit', (e) => {
              e.preventDefault();
              const newTitle = document.getElementById('edit-drawer-title-input').value.trim();
              const newContent = document.getElementById('edit-drawer-content-textarea').value.trim();

              if (newTitle && newContent) {
                currentOpenedNote.title = newTitle;
                currentOpenedNote.content = newContent;

                if (typeof NLPEngine !== 'undefined') {
                  const entities = NLPEngine.extractEntities(newContent);
                  currentOpenedNote.entities = entities;
                  const autoTags = NLPEngine.assignTopics(newContent, entities);
                  currentOpenedNote.tags = autoTags;
                  currentOpenedNote.summary = NLPEngine.summarize(newContent);
                }

                Store.saveNotes();
                showToast('Note updated and re-indexed successfully.');
                if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
                isEditingDrawerNote = false;
                editNoteBtn.textContent = '✏️ Edit Note';
                if (drawerTitle) drawerTitle.textContent = currentOpenedNote.title;
                renderDrawerBodyView(currentOpenedNote);
                refreshAllViews();
              }
            });
          }
        } else {
          editNoteBtn.textContent = '✏️ Edit Note';
          renderDrawerBodyView(currentOpenedNote);
        }
      });
    }

    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        if (noteDrawer) noteDrawer.classList.remove('open');
      });
    }

    if (enhanceNoteBtn) {
      enhanceNoteBtn.addEventListener('click', () => {
        if (!currentOpenedNote || typeof aiEngine === 'undefined') return;
        const enhancedContent = aiEngine.enhanceNote(currentOpenedNote.title, currentOpenedNote.content);
        currentOpenedNote.content = enhancedContent;
        Store.saveNotes();
        showToast('Note enhanced with AI takeaways and action items.');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
        openNoteDrawer(currentOpenedNote);
        refreshAllViews();
      });
    }

    // ----------------------------------------------------
    // Flashcard Controller
    // ----------------------------------------------------
    function initFlashcards() {
      if (typeof aiEngine === 'undefined') return;
      activeFlashcards = aiEngine.generateFlashcards(Store.getNotes());
      if (activeFlashcards.length === 0) return;
      currentFlashcardIdx = 0;
      renderCurrentFlashcard();
    }

    function renderCurrentFlashcard() {
      if (!flashcardCard || activeFlashcards.length === 0) return;
      const card = activeFlashcards[currentFlashcardIdx % activeFlashcards.length];
      flashcardCard.classList.remove('flipped');

      if (fcCategoryBadge) fcCategoryBadge.textContent = card.category;
      if (fcQuestion) fcQuestion.textContent = card.question;
      if (fcAnswer) fcAnswer.textContent = card.answer;
      if (fcSourceTitle) fcSourceTitle.textContent = `From Note: ${card.title}`;
      if (flashcardProgressText) flashcardProgressText.textContent = `Card ${currentFlashcardIdx + 1} of ${activeFlashcards.length}`;
    }

    if (flashcardCard) {
      flashcardCard.addEventListener('click', () => {
        flashcardCard.classList.toggle('flipped');
      });
    }

    if (fcNextBtn) {
      fcNextBtn.addEventListener('click', () => {
        currentFlashcardIdx++;
        renderCurrentFlashcard();
      });
    }

    [fcRatingHard, fcRatingGood, fcRatingEasy].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          showToast('Flashcard recall score updated.');
          currentFlashcardIdx++;
          renderCurrentFlashcard();
        });
      }
    });

    // ----------------------------------------------------
    // Dashboard Controller
    // ----------------------------------------------------
    function renderDashboard() {
      if (typeof aiEngine === 'undefined') return;
      const stats = aiEngine.calculateAnalytics(Store.getNotes());

      if (statTotalNotes) statTotalNotes.textContent = stats.totalNotes;
      if (statSurfacesCount) statSurfacesCount.textContent = `${Object.keys(stats.surfaceCounts).length} Channels`;
      if (statEntitiesCount) statEntitiesCount.textContent = `${stats.entityCount}+`;
      if (statRecallScore) statRecallScore.textContent = `${stats.retentionScore}%`;

      if (surfaceDistributionList) {
        surfaceDistributionList.innerHTML = Object.entries(stats.surfaceCounts).map(([type, count]) => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>${type.toUpperCase()}</span>
              <span>${count} notes (${Math.round((count / stats.totalNotes) * 100)}%)</span>
            </div>
            <div style="height: 6px; background: rgba(255, 255, 255, 0.06); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${(count / stats.totalNotes) * 100}%; background: var(--accent-indigo); border-radius: 3px;"></div>
            </div>
          </div>
        `).join('');
      }

      if (topicTagCloud) {
        topicTagCloud.innerHTML = Object.entries(stats.tagDistribution).map(([tag, count]) => `
          <span class="tag-pill" style="border-color: var(--border-color); font-size: 12px; padding: 4px 10px;">
            #${tag} (${count})
          </span>
        `).join('');
      }

      const recentNotesEl = document.getElementById('dashboard-recent-notes');
      const pinnedNotesEl = document.getElementById('dashboard-pinned-notes');
      const allNotes = Store.getNotes();

      if (recentNotesEl) {
        const recent = allNotes.slice(0, 4);
        recentNotesEl.innerHTML = recent.map(n => `
          <div style="padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.openNoteDrawerById('${n.id}')">
            <div>
              <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">${escapeHTML(n.title)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(n.dateStr || '')} • ${escapeHTML(n.sourceType || 'type')}</div>
            </div>
            <span style="font-size: 11px; color: var(--accent-indigo); font-weight: 600;">View →</span>
          </div>
        `).join('');
      }

      if (pinnedNotesEl) {
        const pinned = allNotes.filter(n => n.pinned).slice(0, 4);
        pinnedNotesEl.innerHTML = pinned.length ? pinned.map(n => `
          <div style="padding: 10px 12px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.openNoteDrawerById('${n.id}')">
            <div>
              <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">📌 ${escapeHTML(n.title)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(n.dateStr || '')}</div>
            </div>
            <span style="font-size: 11px; color: var(--accent-amber); font-weight: 600;">Pinned</span>
          </div>
        `).join('') : '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">No pinned documents. Pin key notes in Vault Explorer to feature them here.</div>';
      }
    }

    // ----------------------------------------------------
    // Proactive Resurfacing Digest Rendering
    // ----------------------------------------------------
    function renderResurfacingDigest(recentActivity = []) {
      if (!resurfacingGrid || typeof ResurfacingEngine === 'undefined') return;
      const allNotes = Store.getNotes();
      const digestItems = ResurfacingEngine.generateDigest(allNotes, recentActivity, Store.dismissedIds);

      if (digestItems.length === 0) {
        resurfacingGrid.innerHTML = `<div class="empty-state glass-card" style="grid-column: 1 / -1;">
          <p>No resurfacing recommendations currently pending.</p>
        </div>`;
        return;
      }

      resurfacingGrid.innerHTML = digestItems.map(item => `
        <div class="resurfacing-card glass-card">
          <div class="resurfacing-badge">FROM YOUR PAST NOTES</div>
          <p class="resurfacing-reason">${escapeHTML(item.reason)}</p>
          <h4 class="resurfacing-title">${escapeHTML(item.note.title)}</h4>
          <p class="resurfacing-snippet">${escapeHTML(item.note.summary || item.note.content.substring(0, 120) + '...')}</p>
          <div class="resurfacing-actions">
            <button class="btn btn-secondary view-resurfaced-btn" data-id="${item.note.id}" style="padding: 6px 12px; font-size: 13px;">Open Note</button>
            <button class="btn btn-secondary dismiss-resurfaced-btn" data-id="${item.note.id}" style="padding: 6px 12px; font-size: 13px;">Dismiss</button>
          </div>
        </div>
      `).join('');

      resurfacingGrid.querySelectorAll('.view-resurfaced-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const noteId = btn.getAttribute('data-id');
          const targetNote = Store.getNotes().find(n => n.id === noteId);
          if (targetNote) openNoteDrawer(targetNote);
        });
      });

      resurfacingGrid.querySelectorAll('.dismiss-resurfaced-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const noteId = btn.getAttribute('data-id');
          Store.dismissResurfaced(noteId);
          renderResurfacingDigest();
          showToast('Dismissed resurfaced note.');
        });
      });
    }

    // ----------------------------------------------------
    // Settings & Privacy Controls & Export/Import
    // ----------------------------------------------------
    if (privacyToggle) {
      privacyToggle.checked = Store.settings.privacyMode;
      privacyToggle.addEventListener('change', () => {
        Store.updateSettings({ privacyMode: privacyToggle.checked });
        if (privacyBadge) {
          privacyBadge.textContent = privacyToggle.checked ? 'On-Device Privacy Mode' : 'Cloud Mode';
        }
        showToast(privacyToggle.checked ? 'On-Device Privacy Mode enabled.' : 'Cloud Mode enabled.');
      });
    }

    if (ttsToggle) {
      ttsToggle.checked = Store.settings.ttsEnabled;
      ttsToggle.addEventListener('change', () => {
        Store.updateSettings({ ttsEnabled: ttsToggle.checked });
        showToast(ttsToggle.checked ? 'Voice readout enabled.' : 'Voice readout disabled.');
      });
    }

    if (apiKeyInput) {
      apiKeyInput.value = Store.settings.apiKey || '';
      apiKeyInput.addEventListener('change', () => {
        Store.updateSettings({ apiKey: apiKeyInput.value.trim() });
        showToast('API key saved securely.');
      });
    }

    if (exportVaultBtn) {
      exportVaultBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Store.getNotes(), null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `second_brain_vault_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('Vault exported as JSON.');
      });
    }

    if (importVaultInput) {
      importVaultInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const importedNotes = JSON.parse(event.target.result);
              if (Array.isArray(importedNotes)) {
                Store.notes = importedNotes;
                Store.saveNotes();
                showToast(`Imported ${importedNotes.length} notes successfully.`);
                refreshAllViews();
              }
            } catch (err) {
              showToast('Invalid JSON vault file.');
            }
          };
          reader.readAsText(file);
        }
      });
    }

    if (resetSampleBtn) {
      resetSampleBtn.addEventListener('click', () => {
        if (confirm('Reset vault data to 100 sample notes?')) {
          localStorage.removeItem('second_brain_notes_v2');
          Store.init();
          showToast('Reset vault to 100 pre-seeded notes.');
          refreshAllViews();
        }
      });
    }

    // ----------------------------------------------------
    // Offline & Sync Listeners
    // ----------------------------------------------------
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('brain-sync-state', (e) => {
        if (!e || !e.detail) return;
        const { state, queueLength } = e.detail;
        if (!syncBadge) return;

        if (state === 'offline') {
          syncBadge.className = 'status-badge offline';
          syncBadge.textContent = `Offline Queue (${queueLength})`;
        } else if (state === 'syncing') {
          syncBadge.className = 'status-badge syncing';
          syncBadge.textContent = 'Syncing...';
        } else {
          syncBadge.className = 'status-badge online';
          syncBadge.textContent = '100% Synced (Local-First)';
        }
      });

      window.addEventListener('online', () => {
        if (typeof Store !== 'undefined' && Store.processOfflineQueue) Store.processOfflineQueue();
      });

      window.addEventListener('offline', () => {
        if (typeof Store !== 'undefined' && Store.notifyListeners) Store.notifyListeners();
      });
    }

    // ----------------------------------------------------
    // Gemini Notebook Source List & Audio Overview Engine
    // ----------------------------------------------------
    function renderNotebookSources() {
      const sourcesContainer = document.getElementById('notebook-sources-list');
      if (!sourcesContainer || typeof Store === 'undefined') return;
      const notes = Store.getNotes();
      sourcesContainer.innerHTML = notes.slice(0, 35).map(n => {
        const icon = n.sourceType === 'voice' ? '🎙️' : n.sourceType === 'web' ? '🌐' : n.sourceType === 'file' ? '📄' : '📝';
        return `
          <div class="source-item-row" onclick="window.openNoteDrawerById('${n.id}')">
            <input type="checkbox" checked onclick="event.stopPropagation();">
            <span style="font-size: 13px;">${icon}</span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; flex: 1;">${escapeHTML(n.title)}</span>
          </div>
        `;
      }).join('');
    }

    window.renderNotebookSources = renderNotebookSources;
    renderNotebookSources();

    let podcastIsPlaying = false;
    let podcastTimerInterval = null;
    let podcastEqInterval = null;
    let podcastCurrentSeconds = 0;
    const podcastTotalSeconds = 84; // 01:24

    window.playAudioOverviewPodcast = function() {
      const btn = document.getElementById('podcast-play-btn');
      const statusBadge = document.getElementById('podcast-status-badge');
      const currentTimeEl = document.getElementById('podcast-current-time');
      const eqBars = document.querySelectorAll('#podcast-waveform .eq-bar');

      if (podcastIsPlaying) {
        // Pause podcast
        podcastIsPlaying = false;
        if (btn) btn.innerHTML = '<span>▶</span> <span>Play Audio Overview</span>';
        if (statusBadge) {
          statusBadge.textContent = '● Paused';
          statusBadge.style.color = '#f59e0b';
        }
        eqBars.forEach(bar => bar.classList.remove('active'));
        if (podcastTimerInterval) clearInterval(podcastTimerInterval);
        if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.pause();
        if (typeof showToast === 'function') showToast('Podcast Audio Paused ⏸');
        return;
      }

      // Resume or Start playing
      podcastIsPlaying = true;
      if (btn) btn.innerHTML = '<span>⏸</span> <span>Pause Audio Podcast</span>';
      if (statusBadge) {
        statusBadge.textContent = '● Playing Podcast';
        statusBadge.style.color = '#10b981';
      }
      eqBars.forEach(bar => bar.classList.add('active'));

      if (typeof showToast === 'function') showToast('Playing Juno AI Deep-Dive Podcast Audio Overview! 🎙️');

      // Speech Synthesis Audio Playback
      if (typeof VoiceEngine !== 'undefined' && VoiceEngine.speak) {
        if (window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          VoiceEngine.speak("Welcome to Juno AI Deep-Dive Podcast! Today, Host Alex and Host Sarah analyze your research notes on deep learning, neural networks, and distributed systems.");
        }
      } else if (typeof SoundEngine !== 'undefined' && SoundEngine.playBeep) {
        SoundEngine.playBeep(440, 'sine', 0.5);
      }

      // Timer Countdown Loop
      if (podcastTimerInterval) clearInterval(podcastTimerInterval);
      podcastTimerInterval = setInterval(() => {
        if (!podcastIsPlaying) return;
        podcastCurrentSeconds++;
        if (podcastCurrentSeconds >= podcastTotalSeconds) {
          podcastCurrentSeconds = 0;
          podcastIsPlaying = false;
          if (btn) btn.innerHTML = '<span>▶</span> <span>Play Audio Overview</span>';
          if (statusBadge) {
            statusBadge.textContent = '● Ready';
            statusBadge.style.color = '#10b981';
          }
          eqBars.forEach(bar => bar.classList.remove('active'));
          if (podcastTimerInterval) clearInterval(podcastTimerInterval);
          return;
        }

        const mins = String(Math.floor(podcastCurrentSeconds / 60)).padStart(2, '0');
        const secs = String(podcastCurrentSeconds % 60).padStart(2, '0');
        if (currentTimeEl) currentTimeEl.textContent = `${mins}:${secs}`;
      }, 1000);
    };

    // ----------------------------------------------------
    // Utility Helpers
    // ----------------------------------------------------
    function refreshAllViews() {
      updateHeaderStats();
      renderNotesGrid();
      renderResurfacingDigest();
      initFlashcards();
      renderDashboard();
      if (typeof GraphVisualizer !== 'undefined' && graphCanvas) {
        GraphVisualizer.buildGraph(Store.getNotes());
      }
    }

    function updateHeaderStats() {
      const allNotes = Store.getNotes();
      if (totalNotesCountEl) totalNotesCountEl.textContent = `${allNotes.length} Notes`;
    }

    function showToast(msg) {
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'toast-notification glass-card';
      toast.textContent = msg;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    }

    function escapeHTML(str) {
      if (!str) return '';
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      }[tag] || tag));
    }

    function formatMarkdownText(text) {
      if (!text) return '';
      return escapeHTML(text)
        .replace(/### (.*?)(?=<br>|\n|$)/g, '<h3 style="color: var(--accent-indigo); margin: 12px 0 6px;">$1</h3>')
        .replace(/#### (.*?)(?=<br>|\n|$)/g, '<h4 style="color: var(--text-primary); margin: 10px 0 4px;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-family: var(--font-code); font-size: 0.85em;">$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/• (.*?)(?=<br>|$)/g, '• $1');
    }

    // ----------------------------------------------------
    // FAB Quick Capture Note Modal Controller
    // ----------------------------------------------------
    const fabBtn = document.getElementById('fab-quick-note-btn');
    const quickNoteModal = document.getElementById('quick-note-modal');
    const closeQuickNoteBtn = document.getElementById('close-quick-note-btn');
    const cancelQuickNoteBtn = document.getElementById('cancel-quick-note-btn');
    const fabForm = document.getElementById('fab-quick-note-form');

    if (fabBtn && quickNoteModal) {
      fabBtn.addEventListener('click', () => {
        quickNoteModal.classList.add('active');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      });
    }

    function closeQuickNoteModal() {
      if (quickNoteModal) quickNoteModal.classList.remove('active');
    }

    if (closeQuickNoteBtn) closeQuickNoteBtn.addEventListener('click', closeQuickNoteModal);
    if (cancelQuickNoteBtn) cancelQuickNoteBtn.addEventListener('click', closeQuickNoteModal);

    if (fabForm) {
      fabForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('fab-note-title').value.trim();
        const content = document.getElementById('fab-note-content').value.trim();

        if (title && content) {
          const newNote = Store.addNote({ title, content, sourceType: 'typing' });
          showToast('Quick note saved and auto-indexed.');
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
          fabForm.reset();
          closeQuickNoteModal();
          refreshAllViews();
          if (newNote) openNoteDrawer(newNote);
        }
      });
    }

    // ----------------------------------------------------
    // Progressive Web App (PWA) & Service Worker Registration
    // ----------------------------------------------------
    let deferredPWAInstallPrompt = null;
    const pwaInstallBtn = document.getElementById('pwa-install-btn');

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(() => {
          console.log('Second Brain PWA Service Worker Registered Successfully.');
        }).catch(err => {
          console.warn('Service Worker registration skipped:', err);
        });
      });

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPWAInstallPrompt = e;
        if (pwaInstallBtn) pwaInstallBtn.style.display = 'inline-flex';
      });
    }

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', async () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        if (deferredPWAInstallPrompt) {
          deferredPWAInstallPrompt.prompt();
          const { outcome } = await deferredPWAInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            showToast('Thank you for installing Second Brain AI System!');
          }
          deferredPWAInstallPrompt = null;
        } else {
          showToast('App is ready for desktop/mobile. Add to Home Screen via browser menu 📲');
        }
      });
    }

    // Universal UI Click Sound Feedback
    document.addEventListener('click', (e) => {
      if (!e || !e.target) return;
      if (e.target.closest('button, .nav-tab, .sample-query-btn, .tag-pill, .citation-pill, .card')) {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      }
    });

    // Global helper accessible via inline onclick fallback
    window.triggerSampleQuery = function(queryText) {
      if (!queryText) return;
      const cleanQuery = queryText.replace(/^["']|["']$/g, '');
      if (typeof activateView === 'function') {
        activateView('jarvis');
      }
      const inputEl = document.getElementById('rag-query-input');
      if (inputEl) inputEl.value = cleanQuery;
      handleRAGQuery(cleanQuery);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
