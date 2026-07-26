/**
 * Second Brain AI System — Main Application Controller
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewSections = document.querySelectorAll('.view-section');
    const syncBadge = document.getElementById('sync-badge');
    const privacyBadge = document.getElementById('privacy-badge');
    const totalNotesCountEl = document.getElementById('total-notes-count');

    // Conversational RAG Elements
    const ragQueryInput = document.getElementById('rag-query-input');
    const ragSubmitBtn = document.getElementById('rag-submit-btn');
    const voiceTriggerBtn = document.getElementById('voice-trigger-btn');
    const waveCanvas = document.getElementById('waveform-canvas');
    const chatContainer = document.getElementById('chat-container');
    const sampleQueryBtns = document.querySelectorAll('.sample-query-btn');

    // Capture Hub Elements
    const captureTabs = document.querySelectorAll('.capture-tab');
    const capturePanels = document.querySelectorAll('.capture-panel');
    const typeForm = document.getElementById('type-capture-form');
    const voiceRecordBtn = document.getElementById('voice-record-btn');
    const voiceStatusText = document.getElementById('voice-status-text');
    const clipperForm = document.getElementById('clipper-form');
    const fileUploadZone = document.getElementById('file-upload-zone');
    const fileInput = document.getElementById('file-input');
    const emailForm = document.getElementById('email-form');

    // Vault & Search Elements
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
    let currentOpenedNote = null;

    // Resurfacing Elements
    const resurfacingGrid = document.getElementById('resurfacing-grid');

    // Flashcard Elements
    const flashcardCard = document.getElementById('flashcard-card');
    const fcCategoryBadge = document.getElementById('fc-category-badge');
    const fcQuestion = document.getElementById('fc-question');
    const fcAnswer = document.getElementById('fc-answer');
    const fcSourceTitle = document.getElementById('fc-source-title');
    const fcNextBtn = document.getElementById('fc-next-btn');
    const fcRatingHard = document.getElementById('fc-rating-hard');
    const fcRatingGood = document.getElementById('fc-rating-good');
    const fcRatingEasy = document.getElementById('fc-rating-easy');
    const flashcardProgressText = document.getElementById('flashcard-progress-text');
    let activeFlashcards = [];
    let currentFlashcardIdx = 0;

    // Dashboard Elements
    const statTotalNotes = document.getElementById('stat-total-notes');
    const statSurfacesCount = document.getElementById('stat-surfaces-count');
    const statEntitiesCount = document.getElementById('stat-entities-count');
    const statRecallScore = document.getElementById('stat-recall-score');
    const surfaceDistributionList = document.getElementById('surface-distribution-list');
    const topicTagCloud = document.getElementById('topic-tag-cloud');

    // Settings Elements
    const privacyToggle = document.getElementById('privacy-toggle');
    const ttsToggle = document.getElementById('tts-toggle');
    const exportVaultBtn = document.getElementById('export-vault-btn');
    const importVaultInput = document.getElementById('import-vault-input');
    const resetSampleBtn = document.getElementById('reset-sample-btn');
    const apiKeyInput = document.getElementById('api-key-input');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // Initialize Store
    updateHeaderStats();

    // Init Voice Engine & Waveform
    if (typeof VoiceEngine !== 'undefined') {
      VoiceEngine.init({
        onTranscript: (text, isFinal) => {
          if (ragQueryInput) ragQueryInput.value = text;
          if (isFinal) {
            handleRAGQuery(text);
          }
        },
        onStateChange: (state) => {
          if (voiceTriggerBtn) {
            if (state === 'listening') {
              voiceTriggerBtn.classList.add('listening');
              voiceTriggerBtn.innerHTML = '🎙️ Listening...';
            } else if (state === 'speaking') {
              voiceTriggerBtn.classList.add('speaking');
              voiceTriggerBtn.innerHTML = '🔊 Speaking...';
            } else {
              voiceTriggerBtn.classList.remove('listening', 'speaking');
              voiceTriggerBtn.innerHTML = '🎙️ Voice Assistant';
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
        navTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        viewSections.forEach(sec => {
          sec.classList.remove('active');
          if (sec.id === `view-${targetView}`) {
            sec.classList.add('active');
          }
        });

        // Specific view initializations
        if (targetView === 'graph' && typeof GraphVisualizer !== 'undefined' && graphCanvas) {
          GraphVisualizer.resize();
          GraphVisualizer.buildGraph(Store.getNotes());
        } else if (targetView === 'flashcards') {
          initFlashcards();
        } else if (targetView === 'dashboard') {
          renderDashboard();
        }
      });
    });

    // ----------------------------------------------------
    // Event Listeners: Conversational RAG Q&A
    // ----------------------------------------------------
    if (ragSubmitBtn) {
      ragSubmitBtn.addEventListener('click', () => {
        const query = ragQueryInput ? ragQueryInput.value.trim() : '';
        if (query) handleRAGQuery(query);
      });
    }

    if (ragQueryInput) {
      ragQueryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
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

    sampleQueryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (ragQueryInput) ragQueryInput.value = query;
        handleRAGQuery(query);
      });
    });

    function handleRAGQuery(query) {
      if (!query || typeof RAGEngine === 'undefined') return;

      // Render user message card immediately
      appendChatMessage('user', query);
      if (ragQueryInput) ragQueryInput.value = '';

      // Set UI controls to Gemini color-changing processing state
      const submitBtn = document.getElementById('rag-submit-btn');
      const jarvisOrb = document.getElementById('jarvis-orb');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '✨ Synthesizing...';
        submitBtn.classList.add('gemini-processing');
      }

      if (jarvisOrb) {
        jarvisOrb.classList.add('gemini-processing');
      }

      // Render Gemini Thinking indicator card in chat stream
      const thinkingCard = document.createElement('div');
      thinkingCard.className = 'chat-bubble ai-bubble thinking-bubble glass-card';
      thinkingCard.id = 'gemini-thinking-card';
      thinkingCard.innerHTML = `
        <div class="chat-header">
          <div class="ai-avatar gemini-avatar-flow">✨</div>
          <strong class="gemini-text-flow">Gemini RAG Vector Engine...</strong>
        </div>
        <div class="thinking-status-content">
          <div class="gemini-spinner"></div>
          <span class="thinking-text-animated">Searching 100+ notes & synthesizing grounded answer...</span>
        </div>
      `;

      if (chatContainer) {
        chatContainer.appendChild(thinkingCard);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Simulate dynamic color-shifting backend synthesis delay (~800ms)
      setTimeout(() => {
        // Remove thinking card
        if (thinkingCard && thinkingCard.parentNode) {
          thinkingCard.remove();
        }

        // Restore button and orb states
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '✨ Query RAG';
          submitBtn.classList.remove('gemini-processing');
        }

        if (jarvisOrb) {
          jarvisOrb.classList.remove('gemini-processing');
        }

        // Perform Grounded RAG Query
        const currentNotes = Store.getNotes();
        const response = RAGEngine.query(query, currentNotes);

        // Render final AI answer card with citations
        appendChatMessage('ai', response.answer, response.citations, response.isGeneralKnowledge, query);

        // Speak response aloud if TTS enabled
        if (typeof VoiceEngine !== 'undefined' && Store.settings.ttsEnabled) {
          VoiceEngine.speak(response.answer);
        }

        // Track query activity for resurfacing engine
        renderResurfacingDigest([query]);
      }, 850);
    }

    function appendChatMessage(sender, text, citations = [], isGeneralKnowledge = false, queryStr = '') {
      if (!chatContainer) return;

      const msgCard = document.createElement('div');
      msgCard.className = `chat-bubble ${sender}-bubble glass-card`;

      if (sender === 'user') {
        msgCard.innerHTML = `<div class="chat-header"><strong>👤 You</strong></div><div class="chat-text">${escapeHTML(text)}</div>`;
      } else {
        let citationsHTML = '';
        if (citations && citations.length > 0) {
          citationsHTML = `<div class="citations-container">
            <div class="citations-title">📌 Grounded Sources (${citations.length} Notes Cited):</div>
            <div class="citations-list">
              ${citations.map(c => `
                <a class="citation-pill" data-id="${c.id}">
                  📄 ${escapeHTML(c.title)} <span class="citation-date">(${escapeHTML(c.date)})</span>
                </a>
              `).join('')}
            </div>
          </div>`;
        }

        const actionsHTML = `<div class="chat-actions-bar">
          <button class="chat-action-btn speak-btn" title="Listen to AI answer">🔊 Read Aloud</button>
          <button class="chat-action-btn copy-btn" title="Copy answer">📋 Copy Text</button>
          ${isGeneralKnowledge ? `<button class="chat-action-btn save-answer-btn" title="Save answer to Second Brain">⚡ Save to Vault</button>` : ''}
        </div>`;

        msgCard.innerHTML = `<div class="chat-header">
          <div class="ai-avatar">✨</div>
          <strong style="color: var(--accent-indigo);">Second Brain AI Assistant</strong>
        </div>
        <div class="chat-text">${formatMarkdownText(text)}</div>
        ${citationsHTML}
        ${actionsHTML}`;
      }

      chatContainer.appendChild(msgCard);
      chatContainer.scrollTop = chatContainer.scrollHeight;

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
          showToast('📋 Answer copied to clipboard!');
        });
      }

      // Bind Save to Vault button
      const saveBtn = msgCard.querySelector('.save-answer-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const newNote = Store.addNote({
            title: `AI Knowledge: ${queryStr || 'Synthesized Answer'}`,
            content: text.replace(/###|####|>|\*/g, ''),
            sourceType: 'typing'
          });
          showToast('⚡ Saved answer as a new note in your Second Brain!');
          refreshAllViews();
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
          showToast('✨ Note saved and auto-tagged successfully!');
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
          voiceRecordBtn.innerHTML = '🛑 Stop Recording';
          if (voiceStatusText) voiceStatusText.textContent = 'Listening to voice memo... (Speak your thoughts)';
          if (typeof VoiceEngine !== 'undefined') VoiceEngine.startListen();
        } else {
          isRecordingMemo = false;
          voiceRecordBtn.classList.remove('recording');
          voiceRecordBtn.innerHTML = '🎙️ Start Voice Memo';
          if (voiceStatusText) voiceStatusText.textContent = 'Transcribing audio with Whisper & auto-tagging...';
          if (typeof VoiceEngine !== 'undefined') VoiceEngine.stopListen();

          setTimeout(() => {
            const simulatedVoiceText = "Voice Memo: Key considerations for distributed system consensus and latency minimization in microservices architecture.";
            Store.addNote({ title: "Voice Note: Distributed Systems & Latency", content: simulatedVoiceText, sourceType: 'voice' });
            showToast('🎙️ Voice memo transcribed & saved!');
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
          showToast('🌐 Web content clipped & saved!');
          clipperForm.reset();
          refreshAllViews();
        }
      });
    }

    // 4. File Upload (OCR) Zone
    if (fileUploadZone && fileInput) {
      fileUploadZone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          showToast(`📄 Running OCR & NLP extraction on ${file.name}...`);
          setTimeout(() => {
            Store.addNote({
              title: `PDF Extract: ${file.name}`,
              content: `OCR text extracted from ${file.name}: Comprehensive overview of domain parameters, functional bounds, and experimental validation results.`,
              sourceType: 'file',
              sourceUrl: file.name
            });
            showToast(`✅ File ${file.name} parsed and saved!`);
            refreshAllViews();
          }, 1200);
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
          showToast('📧 Forwarded email saved to Second Brain!');
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
              ${note.pinned ? '📌 Pinned' : '📌 Pin'}
            </button>
            <button class="btn-icon view-btn" data-id="${note.id}">👁️ View</button>
            <button class="btn-icon delete-btn" data-id="${note.id}">🗑️</button>
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
          showToast('🗑️ Note deleted.');
          refreshAllViews();
        });
      });
    }

    // ----------------------------------------------------
    // Drawer View & AI Note Enhancer
    // ----------------------------------------------------
    function openNoteDrawer(note) {
      if (!noteDrawer) return;
      currentOpenedNote = note;
      if (drawerTitle) drawerTitle.textContent = note.title;
      if (drawerMeta) {
        drawerMeta.innerHTML = `<span class="source-badge badge-${note.sourceType}">${note.sourceType.toUpperCase()}</span> • <span>${escapeHTML(note.dateStr || '')}</span> ${note.sourceUrl ? `• <a href="${escapeHTML(note.sourceUrl)}" target="_blank" style="color: var(--accent-indigo);">Source Link</a>` : ''}`;
      }
      if (drawerBody) {
        drawerBody.innerHTML = `
          <div style="margin-bottom: 1.25rem;">
            <h4 style="color: var(--accent-cyan); margin-bottom: 0.4rem;">Distilled Summary:</h4>
            <p style="background: rgba(255, 255, 255, 0.05); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-indigo);">
              ${escapeHTML(note.summary || note.content)}
            </p>
          </div>
          <div style="margin-bottom: 1.25rem;">
            <h4 style="color: var(--text-primary); margin-bottom: 0.4rem;">Full Note Content:</h4>
            <p style="white-space: pre-wrap; line-height: 1.6;">${formatMarkdownText(note.content)}</p>
          </div>
          <div style="margin-bottom: 1rem;">
            <h4 style="color: var(--accent-violet); margin-bottom: 0.4rem;">Extracted Entities & Tags:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${(note.tags || []).map(t => `<span class="tag-pill" style="border-color: var(--accent-indigo);">#${escapeHTML(t)}</span>`).join('')}
              ${note.entities ? Object.entries(note.entities).flatMap(([cat, list]) => (list || []).map(item => `<span class="tag-pill" style="border-color: var(--accent-emerald);">[${cat.toUpperCase()}] ${escapeHTML(item)}</span>`)).join('') : ''}
            </div>
          </div>
        `;
      }
      noteDrawer.classList.add('open');
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
        showToast('✨ Note enhanced with AI takeaways and action items!');
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
          showToast('🎯 Flashcard recall score updated!');
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
          <div style="margin-bottom: 0.8rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
              <span>${type.toUpperCase()}</span>
              <span>${count} notes (${Math.round((count / stats.totalNotes) * 100)}%)</span>
            </div>
            <div style="height: 8px; background: rgba(255, 255, 255, 0.08); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${(count / stats.totalNotes) * 100}%; background: linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan)); border-radius: 4px;"></div>
            </div>
          </div>
        `).join('');
      }

      if (topicTagCloud) {
        topicTagCloud.innerHTML = Object.entries(stats.tagDistribution).map(([tag, count]) => `
          <span class="tag-pill" style="border-color: var(--accent-violet); font-size: 0.85rem; padding: 0.3rem 0.75rem;">
            #${tag} (${count})
          </span>
        `).join('');
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
          <div class="resurfacing-badge">💡 FROM YOUR PAST NOTES</div>
          <p class="resurfacing-reason">${escapeHTML(item.reason)}</p>
          <h4 class="resurfacing-title">${escapeHTML(item.note.title)}</h4>
          <p class="resurfacing-snippet">${escapeHTML(item.note.summary || item.note.content.substring(0, 120) + '...')}</p>
          <div class="resurfacing-actions">
            <button class="btn btn-secondary view-resurfaced-btn" data-id="${item.note.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">👁️ Open Note</button>
            <button class="btn btn-secondary dismiss-resurfaced-btn" data-id="${item.note.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Dismiss</button>
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
          privacyBadge.textContent = privacyToggle.checked ? '🔒 On-Device Privacy Mode' : '🌐 Cloud Mode';
        }
        showToast(privacyToggle.checked ? '🔒 On-Device Privacy Mode enabled.' : '🌐 Cloud Mode enabled.');
      });
    }

    if (ttsToggle) {
      ttsToggle.checked = Store.settings.ttsEnabled;
      ttsToggle.addEventListener('change', () => {
        Store.updateSettings({ ttsEnabled: ttsToggle.checked });
        showToast(ttsToggle.checked ? '🔊 Voice readout enabled.' : '🔇 Voice readout disabled.');
      });
    }

    if (apiKeyInput) {
      apiKeyInput.value = Store.settings.apiKey || '';
      apiKeyInput.addEventListener('change', () => {
        Store.updateSettings({ apiKey: apiKeyInput.value.trim() });
        showToast('🔑 API key saved securely!');
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
        showToast('📥 Vault exported as JSON!');
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
                showToast(`📤 Imported ${importedNotes.length} notes successfully!`);
                refreshAllViews();
              }
            } catch (err) {
              showToast('❌ Invalid JSON vault file.');
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
          showToast('🔄 Reset vault to 100 pre-seeded notes.');
          refreshAllViews();
        }
      });
    }

    // ----------------------------------------------------
    // Offline & Sync Listeners
    // ----------------------------------------------------
    window.addEventListener('brain-sync-state', (e) => {
      const { state, queueLength } = e.detail;
      if (!syncBadge) return;

      if (state === 'offline') {
        syncBadge.className = 'status-badge offline';
        syncBadge.textContent = `Offline Queue (${queueLength})`;
      } else if (state === 'syncing') {
        syncBadge.className = 'status-badge syncing';
        syncBadge.textContent = 'Syncing...';
      } else {
        syncBadge.className = 'status-badge synced';
        syncBadge.textContent = 'Synced';
      }
    });

    // Toggle offline simulation on network change
    window.addEventListener('offline', () => Store.setOffline(true));
    window.addEventListener('online', () => Store.setOffline(false));

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
        .replace(/### (.*?)(?=<br>|\n|$)/g, '<h3 style="color: var(--accent-indigo); margin: 0.5rem 0;">$1</h3>')
        .replace(/#### (.*?)(?=<br>|\n|$)/g, '<h4 style="color: var(--accent-cyan); margin: 0.4rem 0;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: var(--font-code); font-size: 0.85em;">$1</code>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/• (.*?)(?=<br>|$)/g, '• $1');
    }
  });

})();

