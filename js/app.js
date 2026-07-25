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

    // Resurfacing Elements
    const resurfacingGrid = document.getElementById('resurfacing-grid');

    // Settings Elements
    const privacyToggle = document.getElementById('privacy-toggle');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // Initialize Store
    const notes = Store.getNotes();
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

        // Trigger Graph resize/rebuild if graph view activated
        if (targetView === 'graph' && typeof GraphVisualizer !== 'undefined' && graphCanvas) {
          GraphVisualizer.resize();
          GraphVisualizer.buildGraph(Store.getNotes());
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
      if (!query || typeof RAGEngine !== 'undefined') return;

      // Render user message card
      appendChatMessage('user', query);
      if (ragQueryInput) ragQueryInput.value = '';

      // Perform Grounded RAG Query
      const currentNotes = Store.getNotes();
      const response = RAGEngine.query(query, currentNotes);

      // Render AI answer card with citations
      appendChatMessage('ai', response.answer, response.citations);

      // Speak response aloud if TTS enabled
      if (typeof VoiceEngine !== 'undefined' && Store.settings.ttsEnabled) {
        VoiceEngine.speak(response.answer);
      }

      // Track query activity for resurfacing engine
      renderResurfacingDigest([query]);
    }

    function appendChatMessage(sender, text, citations = []) {
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

        msgCard.innerHTML = `<div class="chat-header">
          <div class="ai-avatar">✨</div>
          <strong style="color: var(--accent-indigo);">Second Brain AI Assistant</strong>
        </div>
        <div class="chat-text">${formatMarkdownText(text)}</div>
        ${citationsHTML}`;
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
          const newNote = Store.addNote({ title, content, sourceType: 'typing' });
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
          }, 1500);
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
    // Drawer View
    // ----------------------------------------------------
    function openNoteDrawer(note) {
      if (!noteDrawer) return;
      if (drawerTitle) drawerTitle.textContent = note.title;
      if (drawerMeta) {
        drawerMeta.innerHTML = `<span class="source-badge badge-${note.sourceType}">${note.sourceType.toUpperCase()}</span> • <span>${escapeHTML(note.dateStr || '')}</span> ${note.sourceUrl ? `• <a href="${escapeHTML(note.sourceUrl)}" target="_blank" style="color: var(--accent-indigo);">Source Link</a>` : ''}`;
      }
      if (drawerBody) {
        drawerBody.innerHTML = `
          <div style="margin-bottom: 1.25rem;">
            <h4>Auto-Generated Summary:</h4>
            <p style="background: rgba(255, 255, 255, 0.05); padding: 0.85rem; border-radius: 8px; border-left: 3px solid var(--accent-indigo);">
              ${escapeHTML(note.summary || note.content)}
            </p>
          </div>
          <div style="margin-bottom: 1.25rem;">
            <h4>Full Content:</h4>
            <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHTML(note.content)}</p>
          </div>
          <div style="margin-bottom: 1rem;">
            <h4>Extracted NLP Entities:</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${note.entities ? Object.entries(note.entities).flatMap(([cat, list]) => (list || []).map(item => `<span class="tag-pill" style="border-color: var(--accent-emerald);">[${cat.toUpperCase()}] ${escapeHTML(item)}</span>`)).join('') : '<em>None</em>'}
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
    // Settings & Privacy Controls
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
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/• (.*?)(?=<br>|$)/g, '• $1');
    }
  });

})();
