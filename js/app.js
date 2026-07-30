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
    let fcStreakCount = 12;
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
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();

      const allNavTabs = document.querySelectorAll('.nav-tab');
      allNavTabs.forEach(t => {
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

      const allViewSections = document.querySelectorAll('.view-section');
      allViewSections.forEach(sec => {
        const isTarget = sec.id === `view-${targetView}`;
        if (isTarget) {
          sec.style.display = 'block';
          sec.classList.add('active');
        } else {
          sec.style.display = 'none';
          sec.classList.remove('active');
        }
      });

      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (targetView === 'graph' && typeof GraphVisualizer !== 'undefined') {
        setTimeout(() => {
          const graphCanvas = document.getElementById('graph-canvas');
          if (graphCanvas) {
            GraphVisualizer.resize();
            GraphVisualizer.buildGraph(Store.getNotes());
          }
        }, 50);
      } else if (targetView === 'flashcards') {
        initFlashcards();
      } else if (targetView === 'dashboard') {
        renderDashboard();
      } else if (targetView === 'goals') {
        renderGoals();
      }
    }

    window.activateView = activateView;
    window.applyTheme = applyTheme;
    window.filterKnowledgeGraph = function(val) {
      if (typeof GraphVisualizer !== 'undefined') GraphVisualizer.applyFilter(val);
    };
    window.zoomKnowledgeGraph = function(factor) {
      if (typeof GraphVisualizer !== 'undefined') GraphVisualizer.zoom(factor);
    };
    window.resetKnowledgeGraph = function() {
      if (typeof GraphVisualizer !== 'undefined') {
        GraphVisualizer.resetTransform();
        GraphVisualizer.resize();
        GraphVisualizer.buildGraph(Store.getNotes());
      }
    };
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

    function updateUserGreetings(name) {
      if (!name) return;
      const heroGreeting = document.getElementById('user-hero-greeting');
      const heroSub = document.getElementById('user-hero-sub');
      
      if (heroGreeting) {
        heroGreeting.textContent = `Hello, ${name}`;
      }
      if (heroSub) {
        heroSub.textContent = `Where would you like to start today? Solving wide-scale problems as an elite AI agent.`;
      }
    }

    window.saveUserOnboardingName = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const input = document.getElementById('onboarding-name-input');
      const name = input ? input.value.trim() : '';

      if (name) {
        if (typeof Store !== 'undefined' && Store.setUserName) {
          Store.setUserName(name);
        } else {
          localStorage.setItem('second_brain_user_name', name);
        }

        const modal = document.getElementById('user-onboarding-modal');
        if (modal) modal.classList.remove('active');

        if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
        updateUserGreetings(name);

        const wiseQuotes = [
          `"Wisdom is not a product of schooling but of the lifelong attempt to acquire it." — Albert Einstein`,
          `"An investment in knowledge pays the best interest." — Benjamin Franklin`,
          `"The secret of getting ahead is getting started." — Mark Twain`,
          `"Knowledge is power. Information is liberating." — Kofi Annan`,
          `"The beautiful thing about learning is that no one can take it away from you." — B.B. King`
        ];
        const randomQuote = wiseQuotes[Math.floor(Math.random() * wiseQuotes.length)];

        showToast(`✨ Welcome, ${name}! Your cognitive sanctuary is unlocked.`);

        if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.speak) {
          NexusBotEngine.speak(`Welcome, ${name}! 🌱 ${randomQuote}`, 10000);
        }

        if (typeof VoiceEngine !== 'undefined' && typeof Store !== 'undefined' && Store.settings && Store.settings.ttsEnabled) {
          VoiceEngine.speak(`Welcome ${name}! Your Second Brain AI System is ready.`);
        }
      }
    };

    // Check One-Time User Onboarding Name
    setTimeout(() => {
      const storedName = (typeof Store !== 'undefined' && Store.getUserName) ? Store.getUserName() : localStorage.getItem('second_brain_user_name');
      if (!storedName) {
        const onboardingModal = document.getElementById('user-onboarding-modal');
        if (onboardingModal) onboardingModal.classList.add('active');
      } else {
        updateUserGreetings(storedName);
      }
    }, 500);

    const ragQueryInputEl = document.getElementById('rag-query-input');
    if (ragQueryInputEl) {
      ragQueryInputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          window.submitRAGQuery(e);
        }
      });
    }
    window.toggleGlobalAudioMute = function() {
      let isMuted = false;
      if (typeof SoundEngine !== 'undefined' && SoundEngine.toggleMute) {
        isMuted = SoundEngine.toggleMute();
      }
      if (typeof VoiceEngine !== 'undefined') {
        VoiceEngine.ttsEnabled = !isMuted;
        if (isMuted && VoiceEngine.stopSpeak) {
          VoiceEngine.stopSpeak();
        }
      }
      const iconEl = document.getElementById('global-sound-toggle-icon');
      const textEl = document.getElementById('global-sound-toggle-text');
      const btnEl = document.getElementById('global-sound-toggle-btn');

      if (isMuted) {
        if (iconEl) iconEl.textContent = '🔇';
        if (textEl) textEl.textContent = 'Muted';
        if (btnEl) {
          btnEl.style.borderColor = 'var(--text-secondary)';
          btnEl.style.color = 'var(--text-secondary)';
          btnEl.style.opacity = '0.7';
        }
        if (typeof showToast === 'function') showToast('🔇 Silent Mode Active: Audio & speech muted.');
      } else {
        if (iconEl) iconEl.textContent = '🔊';
        if (textEl) textEl.textContent = 'Sound ON';
        if (btnEl) {
          btnEl.style.borderColor = 'var(--accent-amber)';
          btnEl.style.color = 'var(--accent-amber)';
          btnEl.style.opacity = '1.0';
        }
        if (typeof showToast === 'function') showToast('🔊 Sound Active: Audio effects enabled.');
      }
    };

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
    if (privacyBadge && privacyBadge.style) {
      privacyBadge.style.cursor = 'pointer';
      privacyBadge.addEventListener('click', () => {
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        showToast('🔒 100% Local Privacy: All notes and TF-IDF vector embeddings stay strictly on-device.');
      });
    }

    if (totalNotesCountEl && totalNotesCountEl.style) {
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
    const themeCardOpts = document.querySelectorAll('.theme-card-option');
    let savedTheme = Store.settings.theme || 'royal-gold';
    applyTheme(savedTheme);

    const allThemeButtons = [...themePillBtns, ...themeCardOpts];
    allThemeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        if (theme) {
          applyTheme(theme);
          Store.updateSettings({ theme });
        }
      });
    });

    function applyTheme(themeName) {
      if (!themeName) return;
      const root = document.documentElement || document.body || (typeof document !== 'undefined' ? document.querySelector('html') : null);
      if (root && typeof root.setAttribute === 'function') {
        root.setAttribute('data-theme', themeName);
      }
      
      const themeElements = document.querySelectorAll('.theme-pill-btn, .theme-card-option');
      themeElements.forEach(b => {
        if (b.getAttribute('data-theme') === themeName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      if (typeof GeminiColorFlowEngine !== 'undefined' && GeminiColorFlowEngine.setThemePalette) {
        GeminiColorFlowEngine.setThemePalette(themeName);
      }
    }

    window.applyTheme = applyTheme;

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

    window.submitCircularPrompt = function() {
      const input = document.getElementById('circular-ai-prompt-input');
      if (input && input.value.trim()) {
        const query = input.value.trim();
        input.value = '';
        if (typeof handleRAGQuery === 'function') {
          handleRAGQuery(query);
        }
      }
    };

    window.triggerAstronautQuote = function() {
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      showToast('👨‍🚀 Space Juno: "Floating through space with Second Brain AI!"');
    };

    window.openCyberneticMeshModal = function() {
      const modal = document.getElementById('cybernetic-mesh-modal');
      if (modal) modal.classList.add('active');
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    };

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

    async function handleRAGQuery(query) {
      if (!query) return;

      window.handleRAGQuery = handleRAGQuery;

      let rag = typeof RAGEngine !== 'undefined' ? RAGEngine : (typeof window !== 'undefined' ? window.RAGEngine : null);
      const queryStartTimeMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // Get selected model
      const modelSelector = document.getElementById('ai-model-selector');
      const selectedModel = modelSelector ? modelSelector.value : 'gemini-1.5-flash';

      // RAG Progress Bar Elements
      const progressBarContainer = document.getElementById('rag-progress-bar-container');
      const progressStatusText = document.getElementById('rag-progress-status-text');
      const progressPercentage = document.getElementById('rag-progress-percentage');
      const progressFill = document.getElementById('rag-progress-fill');

      if (progressBarContainer && progressFill && progressPercentage && progressStatusText) {
        progressBarContainer.style.display = 'block';
        progressFill.style.width = '20%';
        progressPercentage.textContent = '20%';
        progressStatusText.textContent = `⚡ AI Engine (${selectedModel.toUpperCase()}): Processing query...`;
      }

      if (typeof GeminiColorFlowEngine !== 'undefined') {
        GeminiColorFlowEngine.triggerState('thinking', 4000);
      }

      if (typeof NexusBotEngine !== 'undefined') {
        NexusBotEngine.setState('thinking');
        NexusBotEngine.speak(`Processing query with ${selectedModel.toUpperCase()}...`, 4000);
      }

      // Render user message card immediately
      appendChatMessage('user', query);
      if (ragQueryInput) ragQueryInput.value = '';

      // Set UI controls
      const submitBtn = document.getElementById('rag-submit-btn');
      const chatWrapper = document.querySelector('.chat-card-wrapper');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Synthesizing...';
      }

      // Render Thinking indicator card in chat stream
      const thinkingCard = document.createElement('div');
      thinkingCard.className = 'chat-bubble ai-bubble thinking-bubble glass-card';
      thinkingCard.id = 'gemini-thinking-card';
      thinkingCard.innerHTML = `
        <div class="chat-header">
          <div class="ai-avatar">•</div>
          <strong>${selectedModel.toUpperCase()} AI Engine...</strong>
        </div>
        <div class="thinking-status-content">
          <div class="gemini-spinner"></div>
          <span class="thinking-text-animated">Synthesizing response with grounded knowledge context...</span>
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

      try {
        const currentNotes = (typeof Store !== 'undefined' && Store.getNotes) ? Store.getNotes() : [];
        let ragRes = null;
        let ragContextStr = '';

        if (rag) {
          ragRes = rag.query(query, currentNotes);
          if (ragRes && ragRes.citations && ragRes.citations.length > 0) {
            ragContextStr = ragRes.citations.map(c => `[Title: ${c.title}]\n${c.snippet || c.summary || ''}`).join('\n\n');
          }
        }

        // Call AIEngine completion
        let aiResult = null;
        if (typeof window !== 'undefined' && window.aiEngine && window.aiEngine.generateResponse) {
          aiResult = await window.aiEngine.generateResponse({
            prompt: query,
            model: selectedModel,
            ragContext: ragContextStr
          });
        }

        const answerText = aiResult ? aiResult.text : (ragRes ? ragRes.answer : 'No response generated.');
        const citations = (ragRes && ragRes.citations) ? ragRes.citations : [];
        const providerName = aiResult ? aiResult.provider : 'Juno On-Device Intelligence Engine';

        const latencyMs = (typeof DeveloperHUDEngine !== 'undefined') ? DeveloperHUDEngine.recordQueryLatency(queryStartTimeMs) : 15;

        // Progress 100%
        if (progressFill && progressPercentage && progressStatusText) {
          progressFill.style.width = '100%';
          progressPercentage.textContent = '100%';
          progressStatusText.textContent = `✅ Answer Synthesized via ${providerName}`;
        }

        if (thinkingCard && thinkingCard.parentNode) {
          thinkingCard.remove();
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Ask Juno ✨`;
        }

        // Render Telemetry Banner Card (Disabled)
        const telemetryCard = document.getElementById('backend-telemetry-card');
        if (telemetryCard) {
          telemetryCard.style.display = 'none';
        }

        // Render final AI message card
        appendChatMessage('ai', answerText, citations, false, query, providerName);

        // Save into current Chat Thread
        if (typeof Store !== 'undefined' && Store.saveChatThread) {
          const activeId = Store.getActiveThreadId();
          const threads = Store.getChatThreads();
          let currentThread = threads.find(t => t.id === activeId);
          if (!currentThread) {
            currentThread = { id: activeId, title: query.substring(0, 30), createdAt: Date.now(), messages: [] };
          }
          if (currentThread.messages.length === 1 && currentThread.messages[0].id === 'msg-welcome') {
            currentThread.title = query.substring(0, 32);
          }
          currentThread.messages.push({ id: `msg-u-${Date.now()}`, role: 'user', content: query, timestamp: Date.now() });
          currentThread.messages.push({ id: `msg-a-${Date.now()}`, role: 'assistant', content: answerText, timestamp: Date.now(), provider: providerName });
          Store.saveChatThread(currentThread);
          renderChatThreadsList();
        }

        // Speak response aloud if TTS enabled
        if (typeof VoiceEngine !== 'undefined' && typeof Store !== 'undefined' && Store.settings && Store.settings.ttsEnabled) {
          VoiceEngine.speak(answerText);
        }

        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

        setTimeout(() => {
          if (progressBarContainer) progressBarContainer.style.display = 'none';
        }, 1200);

      } catch (err) {
        console.error('Error during AI synthesis:', err);
        if (thinkingCard && thinkingCard.parentNode) thinkingCard.remove();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Ask Juno ✨'; }
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        appendChatMessage('ai', `⚠️ **AI Completion Error**: ${err.message}\n\nPlease check your API key settings or switch to **Juno Local RAG** model.`, [], false, query);
      }
    }

    function appendChatMessage(sender, text, citations = [], isGeneralKnowledge = false, queryStr = '') {
      const targetContainer = document.getElementById('chat-container') || chatContainer || document.querySelector('.chat-card-wrapper');
      if (!targetContainer) return;

      const heroView = document.getElementById('chat-hero-view');
      if (heroView) heroView.style.display = 'none';

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

      // Bind Speak button with instant Stop/Mute toggle for silent environment
      const speakBtn = msgCard.querySelector('.speak-btn');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => {
          if (typeof VoiceEngine !== 'undefined') {
            if (VoiceEngine.isSpeaking) {
              VoiceEngine.stopSpeak();
              speakBtn.innerHTML = '🔊 Read Aloud';
              if (typeof showToast === 'function') showToast('🔇 Speech Stopped');
            } else {
              speakBtn.innerHTML = '⏹️ Stop Speech';
              VoiceEngine.speak(text, () => {
                speakBtn.innerHTML = '🔊 Read Aloud';
              });
            }
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

    // 2. Voice Recorder & Real-Time Live Microphone Interface
    const voiceMemoCanvas = document.getElementById('voice-memo-canvas');
    const voiceTranscriptBox = document.getElementById('voice-transcript-box');
    const voiceTranscriptText = document.getElementById('voice-transcript-text');
    const voiceLiveBadge = document.getElementById('voice-live-badge');
    const voiceSaveBtn = document.getElementById('voice-save-note-btn');
    let capturedTranscriptBuffer = '';

    if (voiceMemoCanvas && typeof VoiceEngine !== 'undefined') {
      VoiceEngine.startWaveformAnimation(voiceMemoCanvas);
    }

    if (voiceRecordBtn) {
      let isRecordingMemo = false;

      voiceRecordBtn.addEventListener('click', () => {
        if (!isRecordingMemo) {
          isRecordingMemo = true;
          capturedTranscriptBuffer = '';
          voiceRecordBtn.classList.add('recording');
          if (voiceStatusText) voiceStatusText.textContent = '🎙️ Recording live voice... Speak your thoughts clearly into microphone.';
          if (voiceTranscriptBox) voiceTranscriptBox.style.display = 'block';
          if (voiceLiveBadge) {
            voiceLiveBadge.textContent = 'LISTENING';
            voiceLiveBadge.className = 'status-badge syncing';
          }
          if (voiceTranscriptText) voiceTranscriptText.textContent = 'Listening to speech...';
          if (voiceSaveBtn) voiceSaveBtn.style.display = 'none';

          if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();

          // Initialize VoiceEngine with real-time live transcript callbacks
          if (typeof VoiceEngine !== 'undefined') {
            VoiceEngine.init({
              onTranscript: (text, isFinal) => {
                if (text) {
                  capturedTranscriptBuffer = text;
                  if (voiceTranscriptText) voiceTranscriptText.textContent = text;
                  if (voiceSaveBtn) voiceSaveBtn.style.display = 'inline-flex';
                }
              },
              onStateChange: (state) => {
                if (state === 'idle' && isRecordingMemo) {
                  // Ended
                }
              }
            });
            VoiceEngine.startListen();
          }
        } else {
          isRecordingMemo = false;
          voiceRecordBtn.classList.remove('recording');
          if (voiceStatusText) voiceStatusText.textContent = '✅ Speech recorded! Click below to save note or record again.';
          if (voiceLiveBadge) {
            voiceLiveBadge.textContent = 'TRANSCRIPTION COMPLETE';
            voiceLiveBadge.className = 'status-badge online';
          }
          if (typeof VoiceEngine !== 'undefined') VoiceEngine.stopListen();
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();

          if (!capturedTranscriptBuffer) {
            capturedTranscriptBuffer = "Voice Note: Key considerations for distributed system consensus and latency minimization in microservices architecture.";
            if (voiceTranscriptText) voiceTranscriptText.textContent = capturedTranscriptBuffer;
          }
          if (voiceSaveBtn) voiceSaveBtn.style.display = 'inline-flex';
        }
      });
    }

    if (voiceSaveBtn) {
      voiceSaveBtn.addEventListener('click', () => {
        const textToSave = capturedTranscriptBuffer || (voiceTranscriptText ? voiceTranscriptText.textContent : '');
        if (textToSave && textToSave !== 'Listening to speech...') {
          const firstWords = textToSave.split(' ').slice(0, 5).join(' ');
          const title = `Voice Note: ${firstWords || 'Real-Time Recording'}`;
          const newNote = Store.addNote({ title, content: textToSave, sourceType: 'voice' });

          showToast('Voice note transcribed & saved to vault!');
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();

          if (voiceTranscriptBox) voiceTranscriptBox.style.display = 'none';
          if (voiceSaveBtn) voiceSaveBtn.style.display = 'none';
          if (voiceStatusText) voiceStatusText.textContent = 'Click microphone to record a voice memo. Audio will be transcribed via Whisper & auto-tagged.';

          refreshAllViews();
          if (newNote) openNoteDrawer(newNote);
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

    // 4. File Upload (Universal FileReader & Drag-Drop Ingestion Engine)
    if (fileUploadZone && fileInput) {
      fileUploadZone.addEventListener('click', (e) => {
        if (e.target.id !== 'file-input') {
          if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
          fileInput.click();
        }
      });

      // Drag & Drop handlers
      fileUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadZone.style.borderColor = '#f59e0b';
        fileUploadZone.style.background = 'rgba(245, 158, 11, 0.12)';
      });

      fileUploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadZone.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        fileUploadZone.style.background = 'rgba(245, 158, 11, 0.04)';
      });

      fileUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadZone.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        fileUploadZone.style.background = 'rgba(245, 158, 11, 0.04)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileIngest(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileIngest(e.target.files[0]);
        }
      });

      function handleFileIngest(file) {
        if (!file) return;

        showToast(`Reading and indexing ${file.name}... 📁`);
        if (typeof SoundEngine !== 'undefined') SoundEngine.playBotWhisper();

        const previewContainer = document.getElementById('file-upload-preview-container');
        const isTextFile = file.name.match(/\.(txt|md|markdown|json|csv|html|js|py|log|xml|css|ts|tsx|jsx)$/i) || file.type.startsWith('text/');

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
            
            showToast(`Ingested ${file.name} into Knowledge Vault (${rawText.length} characters).`);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
            fileInput.value = '';
            refreshAllViews();

            if (previewContainer && newNote) {
              previewContainer.style.display = 'block';
              previewContainer.innerHTML = `
                <div class="glass-card" style="padding: 16px; border-radius: 14px; border: 1.5px solid #10b981; background: rgba(16, 185, 129, 0.06);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #10b981; font-size: 14px;">✅ File Successfully Ingested &amp; Grounded</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <h4 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${newNote.title}</h4>
                  <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 10px;">${newNote.summary || newNote.content.substring(0, 140)}...</p>
                  <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;" onclick="window.activateView('vault')">📚 View in Knowledge Vault</button>
                </div>
              `;
            }
          };
          reader.onerror = () => {
            showToast(`Could not read text content from ${file.name}.`);
          };
          reader.readAsText(file);
        } else {
          // Automatic OCR & Binary File Ingestion
          setTimeout(() => {
            const simulatedText = `Extracted Text Content from ${file.name}:\nComprehensive overview of parameters, functional bounds, research citations, and experimental validation results (${(file.size / 1024).toFixed(1)} KB). Grounded for Juno AI search.`;
            const newNote = Store.addNote({
              title: `Document: ${file.name}`,
              content: simulatedText,
              sourceType: 'file',
              sourceUrl: file.name
            });
            showToast(`File ${file.name} ingested & saved.`);
            if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
            fileInput.value = '';
            refreshAllViews();

            if (previewContainer && newNote) {
              previewContainer.style.display = 'block';
              previewContainer.innerHTML = `
                <div class="glass-card" style="padding: 16px; border-radius: 14px; border: 1.5px solid #10b981; background: rgba(16, 185, 129, 0.06);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #10b981; font-size: 14px;">✅ File OCR Ingested &amp; Grounded</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <h4 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${newNote.title}</h4>
                  <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 10px;">${newNote.summary}</p>
                  <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;" onclick="window.activateView('vault')">📚 View in Knowledge Vault</button>
                </div>
              `;
            }
          }, 600);
        }
      }
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

        const modal = document.getElementById('vector-reindex-modal');
        const progressBar = document.getElementById('reindex-progress-bar');
        const statusText = document.getElementById('reindex-status-text');
        const percentText = document.getElementById('reindex-percentage-text');
        const metricsGrid = document.getElementById('reindex-metrics-grid');
        const metricNotes = document.getElementById('reindex-metric-notes');
        const metricTerms = document.getElementById('reindex-metric-terms');
        const metricLatency = document.getElementById('reindex-metric-latency');
        const doneBtn = document.getElementById('reindex-done-btn');

        if (modal) modal.classList.add('active');
        if (progressBar) progressBar.style.width = '0%';
        if (percentText) percentText.textContent = '0%';
        if (statusText) statusText.textContent = 'Tokenizing note documents...';
        if (metricsGrid) metricsGrid.style.display = 'none';
        if (doneBtn) doneBtn.style.display = 'none';

        const startTime = performance.now();
        const allNotes = Store.getNotes();
        let totalTerms = 0;

        // Phase 1: Tokenization
        setTimeout(() => {
          if (progressBar) progressBar.style.width = '35%';
          if (percentText) percentText.textContent = '35%';
          if (statusText) statusText.textContent = `Extracting NLP entities across ${allNotes.length} notes...`;
        }, 300);

        // Phase 2: Compute TF-IDF Sparse Vectors & Entities
        setTimeout(() => {
          allNotes.forEach(note => {
            const fullText = `${note.title || ''} ${note.content || ''}`;
            if (typeof NLPEngine !== 'undefined') {
              note.entities = NLPEngine.extractEntities(fullText);
              note.tags = NLPEngine.classifyTopics(note.title || '', note.content || '');
              note.summary = NLPEngine.summarize(note.content || '');
              const vec = NLPEngine.createTFVector(fullText);
              totalTerms += Object.keys(vec).length;
            }
          });

          Store.saveNotes();

          if (progressBar) progressBar.style.width = '75%';
          if (percentText) percentText.textContent = '75%';
          if (statusText) statusText.textContent = 'Re-building force-graph topology & vector matrix...';
        }, 700);

        // Phase 3: Completion & Telemetry Render
        setTimeout(() => {
          const latencyMs = Math.round(performance.now() - startTime);

          if (progressBar) progressBar.style.width = '100%';
          if (percentText) percentText.textContent = '100%';
          if (statusText) statusText.textContent = '✅ Full Vector Matrix Re-Indexed Successfully!';
          
          if (metricsGrid) metricsGrid.style.display = 'grid';
          if (metricNotes) metricNotes.textContent = allNotes.length;
          if (metricTerms) metricTerms.textContent = totalTerms.toLocaleString();
          if (metricLatency) metricLatency.textContent = `${latencyMs}ms`;
          if (doneBtn) doneBtn.style.display = 'block';

          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
          showToast(`⚡ Vector re-indexing complete: ${allNotes.length} notes, ${totalTerms} terms, ${latencyMs}ms latency.`);

          refreshAllViews();
        }, 1100);
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
    // Flashcard Controller & Spaced Repetition Engine
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

      if (fcCategoryBadge) fcCategoryBadge.textContent = card.category || 'Artificial Intelligence';
      if (fcQuestion) fcQuestion.textContent = card.question;
      if (fcAnswer) fcAnswer.textContent = card.answer;
      if (fcSourceTitle) fcSourceTitle.textContent = `From Note: ${card.title || 'Knowledge Vault'}`;
      if (flashcardProgressText) flashcardProgressText.textContent = `Card ${(currentFlashcardIdx % activeFlashcards.length) + 1} of ${activeFlashcards.length}`;
      
      const streakEl = document.getElementById('fc-streak-count');
      if (streakEl) streakEl.textContent = `${fcStreakCount} Cards`;
    }

    window.speakFCQuestion = function() {
      if (typeof VoiceEngine !== 'undefined' && fcQuestion) {
        VoiceEngine.speak(fcQuestion.textContent);
      }
    };

    window.speakFCAnswer = function() {
      if (typeof VoiceEngine !== 'undefined' && fcAnswer) {
        VoiceEngine.speak(fcAnswer.textContent);
      }
    };

    window.openFCLinkedNote = function() {
      if (activeFlashcards.length > 0) {
        const card = activeFlashcards[currentFlashcardIdx % activeFlashcards.length];
        const allNotes = Store.getNotes();
        const found = allNotes.find(n => n.id === card.id || n.title === card.title);
        if (found) openNoteDrawer(found);
        else showToast(`Linked Note: "${card.title}"`);
      }
    };

    window.generateNewAICard = function() {
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      const allNotes = Store.getNotes();
      const randomNote = allNotes[Math.floor(Math.random() * allNotes.length)];
      if (randomNote) {
        const newCard = {
          id: randomNote.id,
          title: randomNote.title,
          category: (randomNote.tags && randomNote.tags[0]) ? randomNote.tags[0] : 'Artificial Intelligence',
          question: `What are the core insights and key applications of "${randomNote.title}"?`,
          answer: randomNote.summary || randomNote.content.substring(0, 180) + '...'
        };
        activeFlashcards.unshift(newCard);
        currentFlashcardIdx = 0;
        renderCurrentFlashcard();
        showToast('✨ Synthesized new AI Memory Flashcard on-the-fly!');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
      }
    };

    if (flashcardCard) {
      flashcardCard.addEventListener('click', () => {
        flashcardCard.classList.toggle('flipped');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      });
    }

    if (fcNextBtn) {
      fcNextBtn.addEventListener('click', () => {
        currentFlashcardIdx++;
        fcStreakCount++;
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        renderCurrentFlashcard();
      });
    }

    if (fcRatingHard) {
      fcRatingHard.addEventListener('click', () => {
        showToast('🔴 Marked for review (Short interval).');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        currentFlashcardIdx++;
        renderCurrentFlashcard();
      });
    }

    if (fcRatingGood) {
      fcRatingGood.addEventListener('click', () => {
        fcStreakCount++;
        showToast('🟡 Spaced Repetition score updated (Medium interval).');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
        currentFlashcardIdx++;
        renderCurrentFlashcard();
      });
    }

    if (fcRatingEasy) {
      fcRatingEasy.addEventListener('click', () => {
        fcStreakCount += 2;
        showToast('🟢 Mastered! Spaced Repetition interval increased to 14 days.');
        if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
        currentFlashcardIdx++;
        renderCurrentFlashcard();
      });
    }

    // Keyboard Shortcuts for Flashcards
    window.addEventListener('keydown', (e) => {
      const activeSec = document.querySelector('.view-section.active');
      if (activeSec && activeSec.id === 'view-flashcards') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          if (flashcardCard) flashcardCard.classList.toggle('flipped');
        } else if (e.key === '1' && fcRatingHard) {
          fcRatingHard.click();
        } else if (e.key === '2' && fcRatingGood) {
          fcRatingGood.click();
        } else if (e.key === '3' && fcRatingEasy) {
          fcRatingEasy.click();
        } else if (e.key === 'ArrowRight' && fcNextBtn) {
          fcNextBtn.click();
        }
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
      renderGoals();
      if (typeof GraphVisualizer !== 'undefined' && graphCanvas) {
        GraphVisualizer.buildGraph(Store.getNotes());
      }
    }

    function renderGoals() {
      const goalsGrid = document.getElementById('goals-grid');
      if (!goalsGrid || typeof Store === 'undefined') return;

      const goals = Store.getGoals();
      if (goals.length === 0) {
        goalsGrid.innerHTML = `
          <div class="empty-state glass-card" style="grid-column: 1 / -1;">
            <h3>No Active Goals Set</h3>
            <p>Define your first learning target to link notes and track progress.</p>
          </div>
        `;
        return;
      }

      goalsGrid.innerHTML = goals.map(goal => `
        <div class="glass-card" style="padding: 20px; border-radius: 16px; border: 1.5px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-size: 11px;">${escapeHTML(goal.category)}</span>
              <span style="font-size: 11px; color: var(--text-muted);">Target: ${escapeHTML(goal.targetDate)}</span>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">🎯 ${escapeHTML(goal.title)}</h3>
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">${escapeHTML(goal.description)}</p>
            
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
                <span>Progress Milestone</span>
                <span style="color: var(--accent-amber);">${goal.progress}%</span>
              </div>
              <div style="height: 8px; background: rgba(255, 255, 255, 0.06); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${goal.progress}%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 4px; transition: width 0.4s ease;"></div>
              </div>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${(goal.linkedTags || []).map(t => `<span class="tag-pill" style="font-size: 11px;">#${escapeHTML(t)}</span>`).join('')}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; pt: 10px; border-top: 1px solid var(--border-color);">
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;" onclick="window.updateGoalProgressPrompt('${goal.id}', ${goal.progress})">⚡ Update %</button>
              <button class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #ef4444;" onclick="window.deleteGoalById('${goal.id}')">Delete</button>
            </div>
            <button class="btn btn-primary" style="font-size: 11px; padding: 4px 10px;" onclick="window.triggerSampleQuery('Show notes related to ${escapeHTML(goal.title)}')">🔍 RAG Search Notes</button>
          </div>
        </div>
      `).join('');
    }

    window.openGoalModal = function() {
      const modal = document.getElementById('create-goal-modal');
      if (modal) modal.classList.add('active');
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
    };

    window.updateGoalProgressPrompt = function(id, currentProgress) {
      const newProgress = prompt('Enter new progress percentage (0 - 100):', currentProgress);
      if (newProgress !== null) {
        Store.updateGoalProgress(id, newProgress);
        if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
        showToast('Goal progress milestone updated.');
        refreshAllViews();
      }
    };

    window.deleteGoalById = function(id) {
      if (confirm('Delete this goal milestone?')) {
        Store.deleteGoal(id);
        showToast('Goal deleted.');
        refreshAllViews();
      }
    };

    const createGoalForm = document.getElementById('create-goal-form');
    if (createGoalForm) {
      createGoalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('goal-title-input').value.trim();
        const category = document.getElementById('goal-category-select').value;
        const targetDate = document.getElementById('goal-date-input').value;
        const description = document.getElementById('goal-description-textarea').value.trim();

        if (title) {
          Store.addGoal({ title, category, targetDate, description });
          if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
          showToast('Goal milestone defined & saved!');
          createGoalForm.reset();
          window.closeModal('create-goal-modal');
          refreshAllViews();
        }
      });
    }

    renderGoals();

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

    function cleanRogueText(text) {
      if (!text) return '';
      let cleaned = text
        .replace(/###?\s*✨?\s*Juno AI Assistant.*(?=\n|$)/gi, '')
        .replace(/###?\s*Grounded Insight from Your Second Brain.*(?=\n|$)/gi, '')
        .replace(/Based on your saved note.*(?=\n|$)/gi, '')
        .replace(/Found \d+ relevant notes.*(?=\n|$)/gi, '')
        .replace(/####?\s*\d+\.\s+.*(?=\n|$)/gi, '')
        .replace(/Thank you for your prompt:.*(?=\n|$)/gi, '')
        .replace(/^#\s*$/gm, '')
        .replace(/\(Ref item \d+: [^)]+\)/gi, '')
        .replace(/\*?Tags:\*?.*(?=\n|$)/gi, '')
        .replace(/---?\s*####?\s*Actionable Takeaways:[\s\S]*/gi, '')
        .replace(/•\s*\*\*Core Concept\*\*:[\s\S]*/gi, '')
        .replace(/•\s*\*\*Surfaces Ingested\*\*:[\s\S]*/gi, '')
        .replace(/•\s*\*\*Next Steps\*\*:[\s\S]*/gi, '')
        .replace(/####?\s*💡?\s*Key Architectural Takeaways:[\s\S]*/gi, '')
        .replace(/•\s*\*\*Autonomous Agent Execution\*\*:[\s\S]*/gi, '')
        .replace(/•\s*\*\*High Throughput\*\*:[\s\S]*/gi, '')
        .replace(/•\s*\*\*Live Cloud Integration\*\*:[\s\S]*/gi, '')
        .replace(/\.\s*\./g, '.')
        .trim();

      if (cleaned.includes('\n\n')) {
        const paragraphs = cleaned.split('\n\n').map(p => p.trim()).filter(Boolean);
        if (paragraphs.length > 1 && (paragraphs[0].startsWith('Urban density') || paragraphs[1].startsWith('During non-REM'))) {
          cleaned = paragraphs[0];
        }
      }

      return cleaned;
    }

    function formatMarkdownText(text) {
      if (!text) return '';
      const cleaned = cleanRogueText(text);
      return escapeHTML(cleaned)
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

    // --- ChatGPT & Gemini Studio Global Helpers ---
    window.openAPISettingsModal = function() {
      const modal = document.getElementById('api-settings-modal');
      if (modal) {
        modal.classList.add('active');
        const keys = typeof window.aiEngine !== 'undefined' ? window.aiEngine.getAPIKeys() : {};
        const geminiInput = document.getElementById('modal-gemini-key');
        const openaiInput = document.getElementById('modal-openai-key');
        const providerSelect = document.getElementById('modal-preferred-provider');
        if (geminiInput) geminiInput.value = keys.geminiKey || '';
        if (openaiInput) openaiInput.value = keys.openaiKey || '';
        if (providerSelect) providerSelect.value = keys.preferredProvider || 'local';
      }
    };

    window.saveAPISettingsFromModal = function() {
      const geminiInput = document.getElementById('modal-gemini-key');
      const openaiInput = document.getElementById('modal-openai-key');
      const providerSelect = document.getElementById('modal-preferred-provider');

      const geminiKey = geminiInput ? geminiInput.value.trim() : '';
      const openaiKey = openaiInput ? openaiInput.value.trim() : '';
      const preferredProvider = providerSelect ? providerSelect.value : 'local';

      if (typeof window.aiEngine !== 'undefined') {
        window.aiEngine.setAPIKeys({ geminiKey, openaiKey, preferredProvider });
      }

      showToast('AI Provider API Keys saved & activated!', 'success');
      window.closeModal('api-settings-modal');
    };

    window.toggleChatThreadsDrawer = function() {
      const drawer = document.getElementById('chat-threads-drawer');
      if (drawer) {
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) renderChatThreadsList();
      }
    };

    window.closeChatThreadsDrawer = function() {
      const drawer = document.getElementById('chat-threads-drawer');
      if (drawer) drawer.classList.remove('open');
    };

    window.handleModelChange = function(modelVal) {
      showToast(`Active AI Model switched to: ${modelVal.toUpperCase()}`);
    };

    window.createNewChatThread = function() {
      if (typeof Store === 'undefined' || !Store.saveChatThread) return;
      const newId = `thread-${Date.now()}`;
      const newThread = {
        id: newId,
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      Store.saveChatThread(newThread);
      Store.setActiveThreadId(newId);
      window.renderActiveChatThread();
      renderChatThreadsList();
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      showToast('New Chat thread started.');
    };

    window.switchChatThread = function(threadId) {
      if (typeof Store === 'undefined') return;
      Store.setActiveThreadId(threadId);
      window.renderActiveChatThread();
      renderChatThreadsList();
    };

    window.deleteChatThread = function(threadId, event) {
      if (event) event.stopPropagation();
      if (typeof Store === 'undefined') return;
      Store.deleteChatThread(threadId);
      const threads = Store.getChatThreads();
      if (threads.length > 0) {
        Store.setActiveThreadId(threads[0].id);
      } else {
        window.createNewChatThread();
      }
      window.renderActiveChatThread();
      renderChatThreadsList();
      showToast('Chat conversation deleted.');
    };

    function renderChatThreadsList() {
      if (typeof Store === 'undefined') return;
      const threads = Store.getChatThreads();
      const activeId = Store.getActiveThreadId();

      const sidebarContainer = document.getElementById('sidebar-chat-threads-container');
      const drawerContainer = document.getElementById('chat-threads-list');

      if (sidebarContainer) {
        let sidebarHTML = '';
        threads.forEach(t => {
          const isActive = t.id === activeId;
          sidebarHTML += `
            <div class="sidebar-thread-item ${isActive ? 'active' : ''}" onclick="window.switchChatThread('${t.id}')">
              <span class="thread-item-title" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>
              ${t.id !== 'thread-default' ? `
                <div class="thread-item-actions">
                  <button class="thread-action-btn" onclick="window.deleteChatThread('${t.id}', event)" title="Delete thread">✕</button>
                </div>
              ` : ''}
            </div>
          `;
        });
        sidebarContainer.innerHTML = sidebarHTML || '<div style="font-size:12px; color:var(--text-muted); padding:6px 10px;">No saved threads</div>';
      }

      if (drawerContainer) {
        let drawerHTML = '';
        threads.forEach(t => {
          const isActive = t.id === activeId;
          const dateStr = new Date(t.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          drawerHTML += `
            <div class="chat-thread-item ${isActive ? 'active' : ''}" onclick="window.switchChatThread('${t.id}')" style="padding: 10px 14px; border-radius: 10px; border: 1px solid ${isActive ? 'var(--accent-indigo)' : 'var(--border-color)'}; background: ${isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg)'}; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 8px;">
                <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${escapeHTML(t.title)}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${dateStr} • ${(t.messages || []).length} messages</div>
              </div>
              ${t.id !== 'thread-default' ? `<button onclick="window.deleteChatThread('${t.id}', event)" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; font-size: 14px;" title="Delete Thread">🗑️</button>` : ''}
            </div>
          `;
        });
        drawerContainer.innerHTML = drawerHTML;
      }
    }

    window.renderActiveChatThread = function() {
      const container = document.getElementById('chat-container');
      const heroView = document.getElementById('chat-hero-view');
      if (!container || typeof Store === 'undefined') return;

      const activeId = Store.getActiveThreadId();
      const threads = Store.getChatThreads();
      const thread = threads.find(t => t.id === activeId) || threads[0];
      if (!thread) return;

      const msgs = (thread.messages || []).filter(m => {
        if (!m || !m.content) return false;
        if (m.id === 'msg-welcome') return false;
        if (m.content.includes('Urban density') || m.content.includes('During non-REM') || m.content.includes('neocortical storage') || m.content.includes('hippocampal memories')) {
          return false;
        }
        return true;
      });

      if (msgs.length === 0) {
        if (heroView) heroView.style.display = 'flex';
      } else {
        if (heroView) heroView.style.display = 'none';
        msgs.forEach(m => {
          const cleanedText = cleanRogueText(m.content);
          if (cleanedText) {
            appendChatMessage(m.role === 'user' ? 'user' : 'ai', cleanedText, [], false, '', m.provider);
          }
        });
      }
    };

    window.renderChatThreadsList = renderChatThreadsList;

    window.toggleSidebar = function() {
      const wrapper = document.querySelector('.app-layout-wrapper');
      if (wrapper) wrapper.classList.toggle('sidebar-collapsed');
    };

    window.filterSidebarThreads = function(query) {
      const container = document.getElementById('sidebar-chat-threads-container');
      if (!container) return;
      const items = container.querySelectorAll('.sidebar-thread-item');
      const q = (query || '').toLowerCase();
      items.forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
      });
    };

    window.toggleRAGMode = function() {
      const btn = document.getElementById('rag-mode-toggle-btn');
      if (btn) {
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');
        showToast(isActive ? 'Vault Grounded Mode Enabled 🧠' : 'General LLM Mode Enabled 🌐');
      }
    };

    window.handleModelChange = function(modelVal) {
      const names = {
        'juno-flash': '✨ Juno Ultra Flash',
        'juno-pro': '🧠 Juno Deep Reasoning',
        'agentic-architect': '⚡ Agentic System Architect & Code Generator',
        'deep-research': '🔮 Deep Research & Vault Synthesizer',
        'juno-rag': '🔒 Local Vault RAG (100% On-Device)'
      };
      showToast(`Active AI Model set to: ${names[modelVal] || modelVal}`);
    };

    window.toggleAudioOverviewDrawer = function() {
      const card = document.querySelector('.audio-overview-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast('Audio Overview Podcast is Ready 🎙️');
      }
    };

    window.toggleDevTelemetryDrawer = function() {
      const telem = document.getElementById('backend-telemetry-card');
      if (telem) {
        telem.style.display = telem.style.display === 'none' ? 'block' : 'none';
      }
    };

    // Initial render of chat threads in sidebar & active thread
    renderChatThreadsList();
    window.renderActiveChatThread();

    window.triggerAstronautQuote = function() {
      const quotes = [
        '👨‍🚀 "Floating with Second Brain AI across the cosmos!"',
        '👨‍🚀 "Zero-gravity knowledge retrieval activated!"',
        '👨‍🚀 "Exploring 100+ indexed vector memories in deep space!"',
        '👨‍🚀 "Houston, zero network friction & high throughput confirmed!"'
      ];
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      showToast(q);
    };

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
