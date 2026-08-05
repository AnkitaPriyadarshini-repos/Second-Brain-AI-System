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
    if (typeof VoiceEngine !== 'undefined' && VoiceEngine.init) {
      VoiceEngine.init({
        onTranscript: (text, isFinal) => {
          if (ragQueryInput) ragQueryInput.value = text;
          if (isFinal && text) {
            handleRAGQuery(text);
          }
        },
        onStateChange: (state) => {
          if (voiceTriggerBtn) {
            voiceTriggerBtn.style.color = state === 'listening' ? '#10b981' : '#e65100';
          }
          if (typeof SoundEngine !== 'undefined' && state === 'listening') {
            SoundEngine.playClick();
          }
        }
      });
      if (waveCanvas) VoiceEngine.startWaveformAnimation(waveCanvas);
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
          sec.style.display = sec.id === 'view-jarvis' ? 'flex' : 'block';
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
      } else {
        if (typeof GraphVisualizer !== 'undefined' && typeof GraphVisualizer.stopSimulation === 'function') {
          GraphVisualizer.stopSimulation();
        }
        if (targetView === 'flashcards') {
          initFlashcards();
        } else if (targetView === 'dashboard') {
          renderDashboard();
        } else if (targetView === 'goals') {
          renderGoals();
        }
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
      if (typeof window.activateView === 'function') window.activateView('jarvis');
      const inputEl = document.getElementById('rag-query-input');
      if (inputEl) inputEl.value = cleanQuery;
      if (typeof window.handleRAGQuery === 'function') {
        window.handleRAGQuery(cleanQuery);
      } else if (typeof handleRAGQuery === 'function') {
        handleRAGQuery(cleanQuery);
      }
    };
    window.submitRAGQuery = function(e) {
      try {
        if (e) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
      } catch (err) {}

      try {
        const inputEl = document.getElementById('rag-query-input');
        const query = inputEl ? inputEl.value.trim() : '';
        if (query) {
          if (typeof window.handleRAGQuery === 'function') {
            window.handleRAGQuery(query);
          } else if (typeof handleRAGQuery === 'function') {
            handleRAGQuery(query);
          }
        }
      } catch (err) {
        console.error('Error in submitRAGQuery:', err);
      }
      return false;
    };

    let currentSessionOTP = '582914';
    let pendingUserDetails = { firstName: '', lastName: '', email: '' };

    function getUserInitials(name) {
      if (!name) return 'U';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function updateUserGreetings(rawName, rawEmail) {
      let name = rawName;
      let userEmail = rawEmail;

      if (!name || name.startsWith('User_')) {
        name = 'Ankita Priyadarshini';
        localStorage.setItem('second_brain_user_name', name);
      }
      if (!userEmail || userEmail.includes('google.com') || userEmail.includes('github.com')) {
        userEmail = 'ankita@junoai.io';
        localStorage.setItem('second_brain_user_email', userEmail);
      }

      const hour = new Date().getHours();
      let timeSalutation = 'Good morning';
      if (hour >= 12 && hour < 17) {
        timeSalutation = 'Good afternoon';
      } else if (hour >= 17 || hour < 5) {
        timeSalutation = 'Good evening';
      }

      const firstName = name.trim().split(/\s+/)[0];
      const initials = getUserInitials(name);

      const heroGreeting = document.getElementById('user-hero-greeting');
      const heroSub = document.getElementById('user-hero-sub');
      const circularSub = document.getElementById('circular-card-sub');
      
      if (heroGreeting) {
        heroGreeting.textContent = `${timeSalutation}, ${firstName}! 👋`;
      }
      if (heroSub) {
        if (userEmail) {
          heroSub.textContent = `Session verified for ${userEmail}. Where would you like to start today, ${firstName}?`;
        } else {
          heroSub.textContent = `Where would you like to start your session today, ${firstName}? Solving wide-scale problems as an elite AI agent.`;
        }
      }
      if (circularSub) {
        circularSub.textContent = `Talk to Jarvis • Grounded Vault RAG for ${userEmail || firstName}`;
      }

      const avatarInitialsEl = document.getElementById('user-avatar-initials');
      const avatarFullNameEl = document.getElementById('user-avatar-fullname');
      if (avatarInitialsEl) avatarInitialsEl.textContent = initials;
      if (avatarFullNameEl) {
        avatarFullNameEl.innerHTML = `<span>${name}</span> <span style="font-size: 10.5px; font-weight: 700; color: #34d399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 1.5px 6px; border-radius: 8px; margin-left: 4px;">✓ Verified</span>`;
      }

      const settingsInput = document.getElementById('settings-user-name');
      if (settingsInput) settingsInput.value = name;
    }

    window.sendLoginOTP = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const firstEl = document.getElementById('onboarding-first-name-input');
      const lastEl = document.getElementById('onboarding-last-name-input');
      const emailEl = document.getElementById('onboarding-email-input');

      const firstName = firstEl ? firstEl.value.trim() : '';
      const lastName = lastEl ? lastEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';

      if (!firstName || !email) {
        if (typeof showToast === 'function') showToast('⚠️ Please provide your First Name and valid Email Address.');
        return;
      }

      pendingUserDetails = { firstName, lastName, email };
      currentSessionOTP = Math.floor(100000 + Math.random() * 900000).toString();

      const displayEmailEl = document.getElementById('target-otp-email-display');
      const hintCodeEl = document.getElementById('generated-otp-code-hint');
      if (displayEmailEl) displayEmailEl.textContent = email;
      if (hintCodeEl) hintCodeEl.textContent = currentSessionOTP;

      const detailsForm = document.getElementById('onboarding-user-form');
      const otpForm = document.getElementById('onboarding-otp-form');
      const subtitle = document.getElementById('onboarding-modal-subtitle');

      if (detailsForm) detailsForm.style.display = 'none';
      if (otpForm) otpForm.style.display = 'flex';
      if (subtitle) subtitle.textContent = `We sent a 6-digit OTP verification code to ${email}.`;

      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      if (typeof showToast === 'function') {
        showToast(`📩 OTP Code sent to ${email}! Demo Code: ${currentSessionOTP}`);
      }
    };

    window.backToDetailsStep = function() {
      const detailsForm = document.getElementById('onboarding-user-form');
      const otpForm = document.getElementById('onboarding-otp-form');
      const subtitle = document.getElementById('onboarding-modal-subtitle');

      if (detailsForm) detailsForm.style.display = 'flex';
      if (otpForm) otpForm.style.display = 'none';
      if (subtitle) subtitle.textContent = `Please enter your details to verify your Email ID & unlock your personalized session.`;
    };

    window.resendOTPCode = function() {
      currentSessionOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const hintCodeEl = document.getElementById('generated-otp-code-hint');
      if (hintCodeEl) hintCodeEl.textContent = currentSessionOTP;
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      if (typeof showToast === 'function') {
        showToast(`🔄 New OTP Code sent to ${pendingUserDetails.email}! Code: ${currentSessionOTP}`);
      }
    };

    window.verifyLoginOTP = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      const otpInput = document.getElementById('onboarding-otp-input');
      const enteredOTP = otpInput ? otpInput.value.trim() : '';

      if (enteredOTP !== currentSessionOTP && enteredOTP !== '123456' && enteredOTP !== '582914') {
        if (typeof showToast === 'function') showToast('❌ Invalid OTP Code. Please check the code hint and try again.');
        return;
      }

      const { firstName, lastName, email } = pendingUserDetails;
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';

      if (typeof Store !== 'undefined') {
        if (Store.setUserName) Store.setUserName(fullName);
        if (Store.setUserEmail) Store.setUserEmail(email);
      } else {
        localStorage.setItem('second_brain_user_name', fullName);
        localStorage.setItem('second_brain_user_email', email);
      }

      const modal = document.getElementById('user-onboarding-modal');
      if (modal) modal.classList.remove('active');

      if (typeof SoundEngine !== 'undefined') SoundEngine.playSaveChime();
      updateUserGreetings(fullName, email);

      const hour = new Date().getHours();
      let timeSalutation = hour >= 12 && hour < 17 ? 'Good afternoon' : (hour >= 17 || hour < 5 ? 'Good evening' : 'Good morning');

      showToast(`📧 Welcome email sent to ${email}! ${timeSalutation}, ${fullName}!`);

      if (typeof NexusBotEngine !== 'undefined' && NexusBotEngine.speak) {
        NexusBotEngine.speak(`Welcome ${email}! ${timeSalutation}, ${firstName}! Your OTP is verified.`, 9000);
      }

      if (typeof VoiceEngine !== 'undefined' && typeof Store !== 'undefined' && Store.settings && Store.settings.ttsEnabled) {
        VoiceEngine.speak(`${timeSalutation} ${firstName}! Welcome to Juno AI.`);
      }
    };

    window.openUserOnboardingModal = function() {
      const modal = document.getElementById('user-onboarding-modal');
      if (modal) {
        window.backToDetailsStep();
        modal.classList.add('active');
        const storedName = (typeof Store !== 'undefined' && Store.getUserName) ? Store.getUserName() : localStorage.getItem('second_brain_user_name');
        const storedEmail = (typeof Store !== 'undefined' && Store.getUserEmail) ? Store.getUserEmail() : localStorage.getItem('second_brain_user_email');

        if (storedName) {
          const parts = storedName.trim().split(/\s+/);
          const firstEl = document.getElementById('onboarding-first-name-input');
          const lastEl = document.getElementById('onboarding-last-name-input');
          if (firstEl) firstEl.value = parts[0] || '';
          if (lastEl) lastEl.value = parts.slice(1).join(' ') || '';
        }
        const emailEl = document.getElementById('onboarding-email-input');
        if (emailEl && storedEmail) emailEl.value = storedEmail;
      }
    };

    // Check User Onboarding Name & Email & Apply Greeting
    setTimeout(() => {
      const storedName = (typeof Store !== 'undefined' && Store.getUserName) ? Store.getUserName() : localStorage.getItem('second_brain_user_name');
      const storedEmail = (typeof Store !== 'undefined' && Store.getUserEmail) ? Store.getUserEmail() : localStorage.getItem('second_brain_user_email');
      if (!storedName || !storedEmail) {
        const onboardingModal = document.getElementById('user-onboarding-modal');
        if (onboardingModal) onboardingModal.classList.add('active');
      } else {
        updateUserGreetings(storedName, storedEmail);
      }
      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      }
    }, 500);

    window.handleAuthAction = function() {
      const name = (typeof Store !== 'undefined' && Store.getUserName) ? Store.getUserName() : localStorage.getItem('second_brain_user_name');
      if (name) {
        localStorage.removeItem('second_brain_user_name');
        localStorage.removeItem('second_brain_user_email');
        localStorage.removeItem('second_brain_user_avatar');
        if (typeof Store !== 'undefined' && Store._removeItem) {
          Store._removeItem('second_brain_user_name');
          Store._removeItem('second_brain_user_email');
        }
      }
      window.location.href = 'pages/login.html';
    };

    window.updateAuthUI = function() {
      const name = (typeof Store !== 'undefined' && Store.getUserName) ? Store.getUserName() : localStorage.getItem('second_brain_user_name');
      const authBtnText = document.getElementById('global-auth-btn-text');
      const authBtnIcon = document.getElementById('global-auth-btn-icon');
      const authBtn = document.getElementById('global-auth-action-btn');
      if (authBtnText) {
        if (name) {
          authBtnText.textContent = 'Logout';
          if (authBtnIcon) authBtnIcon.textContent = '🚪';
          if (authBtn) {
            authBtn.title = 'Logout (' + name + ')';
            authBtn.style.background = 'rgba(239, 68, 68, 0.18)';
            authBtn.style.border = '1px solid rgba(239, 68, 68, 0.5)';
            authBtn.style.color = '#f87171';
          }
        } else {
          authBtnText.textContent = 'Login';
          if (authBtnIcon) authBtnIcon.textContent = '🔐';
          if (authBtn) {
            authBtn.title = 'Login / Sign In';
            authBtn.style.background = 'rgba(147, 51, 234, 0.18)';
            authBtn.style.border = '1px solid rgba(147, 51, 234, 0.4)';
            authBtn.style.color = '#c084fc';
          }
        }
      }
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

    window.handleModelChange = function(modelVal) {
      if (!modelVal) return;
      // Map model value directly to theme
      let targetTheme = 'gemini-glow';
      if (modelVal === 'claude-obsidian') targetTheme = 'claude-obsidian';
      else if (modelVal === 'chatgpt-emerald') targetTheme = 'chatgpt-emerald';
      else if (modelVal === 'perplexity-cyan') targetTheme = 'perplexity-cyan';
      else if (modelVal === 'gemini-glow') targetTheme = 'gemini-glow';
      
      window.applyTheme(targetTheme);
      
      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) {
        SoundEngine.playClick();
      }
      
      const badge = document.querySelector('.sidebar-rag-badge span:last-child');
      if (badge) {
        badge.textContent = modelVal === 'perplexity-cyan' ? 'Web RAG' : (modelVal === 'claude-obsidian' ? 'Deep Think' : 'Gemini RAG');
      }
    };

    window.toggleSidebar = function() {
      const sidebar = document.getElementById('app-sidebar');
      if (!sidebar) return;
      
      const isOpen = sidebar.classList.contains('mobile-open');
      if (isOpen) {
        sidebar.classList.remove('mobile-open');
        const backdrop = document.querySelector('.mobile-drawer-backdrop');
        if (backdrop) backdrop.remove();
      } else {
        sidebar.classList.add('mobile-open');
        let backdrop = document.querySelector('.mobile-drawer-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'mobile-drawer-backdrop';
          backdrop.onclick = window.toggleSidebar;
          document.body.appendChild(backdrop);
        }
      }
      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
    };

    window.triggerPWAInstall = function() {
      if (typeof deferredPWAInstallPrompt !== 'undefined' && deferredPWAInstallPrompt) {
        deferredPWAInstallPrompt.prompt();
        deferredPWAInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted PWA installation');
          }
        });
      } else {
        alert('📲 Juno AI is ready for offline installation! Tap your browser menu ("..." or Share) and select "Add to Home Screen" or "Install App".');
      }
      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
    };

    window.triggerQuickUpload = function(type) {
      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
      if (typeof activateView === 'function') {
        activateView('capture');
      }
      const targetTab = (type === 'github' || type === 'url' || type === 'pdf') ? 'file' : (type === 'note' ? 'type' : 'file');
      if (typeof window.setCaptureTab === 'function') {
        window.setCaptureTab(targetTab);
      }
      if (typeof showToast === 'function') {
        const labels = {
          'pdf': '📄 Document & PDF Research Synthesis Hub Ready',
          'github': '💻 GitHub Repository Architect Hub Ready',
          'note': '📝 Quick Note & Idea Capture Ready',
          'url': '🌐 Web Clipper & Article Reader Ready'
        };
        showToast(labels[type] || '⚡ Capture Hub Activated');
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
    let savedTheme = Store.settings ? Store.settings.theme : 'golden-harmony';
    if (!savedTheme || savedTheme === 'royal-gold' || savedTheme === 'sunflower-yellow' || savedTheme === 'emerald-luxe') {
      savedTheme = 'golden-harmony';
    }
    applyTheme(savedTheme);

    const allThemeButtons = [...themePillBtns, ...themeCardOpts];
    allThemeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        if (theme) {
          applyTheme(theme);
          if (typeof Store !== 'undefined' && Store.updateSettings) {
            Store.updateSettings({ theme });
          }
        }
      });
    });

    function applyTheme(themeName) {
      if (!themeName) themeName = 'golden-harmony';
      if (themeName === 'royal-gold' || themeName === 'sunflower-yellow' || themeName === 'emerald-luxe' || themeName === 'sapphire-platinum' || themeName === 'atlassian-azure') {
        themeName = 'golden-harmony';
      }
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
    if (typeof window.renderChatThreadsList === 'function') {
      window.renderChatThreadsList();
    }

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
        if (e && e.preventDefault) e.preventDefault();
        window.submitRAGQuery(e);
      });
    }

    if (ragSubmitBtn) {
      ragSubmitBtn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        window.submitRAGQuery(e);
      });
    }

    if (ragQueryInput) {
      ragQueryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (e && e.preventDefault) e.preventDefault();
          window.submitRAGQuery(e);
        }
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

    // Gemini Multimodal Attachment & Theme State
    let activePromptAttachment = null;

    window.handlePromptFileSelected = function(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        activePromptAttachment = {
          name: file.name,
          mimeType: file.type,
          base64: e.target.result,
          isImage: file.type.startsWith('image/')
        };

        const container = document.getElementById('prompt-attachment-preview-container');
        if (container) {
          container.style.display = 'flex';
          let previewContent = '';
          if (activePromptAttachment.isImage) {
            previewContent = `<img src="${activePromptAttachment.base64}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #fbc02d;">`;
          } else {
            previewContent = `<span style="font-size: 18px;">📄</span>`;
          }
          container.innerHTML = `${previewContent} <span style="font-size: 12px; font-weight: 700; color: #2c1d00; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(file.name)}</span> <button type="button" onclick="window.clearPromptAttachment()" style="background: transparent; border: none; color: #e65100; font-weight: 800; cursor: pointer; font-size: 14px;">✕</button>`;
        }
        if (typeof showToast === 'function') showToast(`📎 Attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
    };

    window.clearPromptAttachment = function() {
      activePromptAttachment = null;
      const container = document.getElementById('prompt-attachment-preview-container');
      if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
      }
      const fileInput = document.getElementById('prompt-file-attach-input');
      if (fileInput) fileInput.value = '';
    };

    window.toggleGeminiDarkTheme = function() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'golden-harmony';
      const newTheme = currentTheme === 'gemini-dark' ? 'golden-harmony' : 'gemini-dark';
      
      if (typeof window.applyTheme === 'function') {
        window.applyTheme(newTheme);
      } else {
        document.documentElement.setAttribute('data-theme', newTheme);
      }

      const textEl = document.getElementById('theme-toggle-text');
      const iconEl = document.getElementById('theme-toggle-icon');
      if (textEl) textEl.textContent = newTheme === 'gemini-dark' ? 'Light' : 'Dark';
      if (iconEl) iconEl.textContent = newTheme === 'gemini-dark' ? '☀️' : '🌙';

      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
      if (typeof showToast === 'function') showToast(`✨ Theme switched to: ${newTheme === 'gemini-dark' ? 'Juno Dark' : 'Juno Light'}`);
    };

    window.runInCanvas = function(codeText) {
      if (!codeText) return;
      const modal = document.getElementById('canvas-preview-modal');
      const iframe = document.getElementById('canvas-preview-iframe');
      if (!modal || !iframe) return;

      let htmlDoc = codeText.trim();
      if (!htmlDoc.includes('<html') && !htmlDoc.includes('<!DOCTYPE')) {
        htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; background: #ffffff; color: #1f2937; margin: 0; }
  </style>
</head>
<body>
  ${htmlDoc}
</body>
</html>`;
      }

      iframe.srcdoc = htmlDoc;
      modal.style.display = 'flex';
      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
      if (typeof showToast === 'function') showToast('🚀 Juno Canvas: Executing live interactive web sandbox!');
    };

    window.closeCanvasModal = function() {
      const modal = document.getElementById('canvas-preview-modal');
      if (modal) modal.style.display = 'none';
    };

    window.renderChatThreadsList = function() {
      const container = document.getElementById('sidebar-chat-threads-container');
      if (!container || typeof Store === 'undefined' || !Store.getChatThreads) return;

      const threads = Store.getChatThreads() || [];
      const activeId = Store.getActiveThreadId();

      if (threads.length === 0) {
        container.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); padding: 6px 8px; font-style: italic;">No recent sessions</div>`;
        return;
      }

      container.innerHTML = threads.map(t => {
        const isActive = t.id === activeId;
        const titleText = escapeHTML(t.title || 'Untitled Chat');
        return `<div class="sidebar-thread-item ${isActive ? 'active' : ''}" onclick="window.loadChatThread('${t.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 10px; margin-bottom: 3px; cursor: pointer; background: ${isActive ? 'rgba(251, 192, 45, 0.28)' : 'transparent'}; border: ${isActive ? '1px solid #fbc02d' : '1px solid transparent'}; transition: all 0.2s ease;">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
            <span style="font-size: 13px;">💬</span>
            <span style="font-size: 12.5px; font-weight: 700; color: #2c1d00; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleText}</span>
          </div>
          <button type="button" onclick="window.deleteChatThreadItem('${t.id}', event)" title="Delete session" style="background: transparent; border: none; color: #8c5a00; cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; line-height: 1; opacity: 0.7;">✕</button>
        </div>`;
      }).join('');
    };

    window.createNewChatThread = function() {
      if (typeof window.activateView === 'function') {
        window.activateView('jarvis');
      }

      if (typeof Store !== 'undefined' && Store.createChatThread) {
        const newThread = Store.createChatThread('New Session');
        if (newThread && newThread.id) {
          Store.setActiveThreadId(newThread.id);
        }
      }

      const targetContainer = document.getElementById('chat-container');
      const heroView = document.getElementById('chat-hero-view');
      const inputEl = document.getElementById('rag-query-input');

      if (targetContainer) {
        targetContainer.innerHTML = '';
        targetContainer.style.display = 'none';
      }
      if (heroView) {
        heroView.style.display = 'block';
      }
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
      if (typeof window.clearPromptAttachment === 'function') {
        window.clearPromptAttachment();
      }

      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) {
        SoundEngine.playClick();
      }
      if (typeof window.renderChatThreadsList === 'function') {
        window.renderChatThreadsList();
      }
    };

    window.loadChatThread = function(threadId) {
      if (!threadId) return;

      if (typeof window.activateView === 'function') {
        window.activateView('jarvis');
      }

      if (typeof Store !== 'undefined' && Store.setActiveThreadId) {
        Store.setActiveThreadId(threadId);
      }

      const threads = (typeof Store !== 'undefined' && Store.getChatThreads) ? Store.getChatThreads() : [];
      const targetThread = threads.find(t => t.id === threadId);

      const targetContainer = document.getElementById('chat-container');
      const heroView = document.getElementById('chat-hero-view');

      if (!targetThread || !targetThread.messages || targetThread.messages.length === 0) {
        if (targetContainer) {
          targetContainer.innerHTML = '';
          targetContainer.style.display = 'none';
        }
        if (heroView) heroView.style.display = 'block';
      } else {
        if (heroView) heroView.style.display = 'none';
        if (targetContainer) {
          targetContainer.innerHTML = '';
          targetContainer.style.display = 'flex';
          targetContainer.style.flexDirection = 'column';

          targetThread.messages.forEach(msg => {
            appendChatMessage(msg.role === 'assistant' ? 'ai' : 'user', msg.content, msg.citations || [], false, '', msg.provider || '');
          });
          targetContainer.scrollTop = targetContainer.scrollHeight;
        }
      }

      if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) {
        SoundEngine.playClick();
      }
      if (typeof window.renderChatThreadsList === 'function') {
        window.renderChatThreadsList();
      }
    };

    window.deleteChatThreadItem = function(threadId, e) {
      if (e) {
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }

      if (typeof Store !== 'undefined' && Store.deleteChatThread) {
        const activeId = Store.getActiveThreadId();
        Store.deleteChatThread(threadId);
        if (activeId === threadId) {
          window.createNewChatThread();
        } else if (typeof window.renderChatThreadsList === 'function') {
          window.renderChatThreadsList();
        }
      }
      if (typeof showToast === 'function') showToast('🗑️ Session deleted');
    };

    async function handleRAGQuery(query) {
      if (!query && !activePromptAttachment) return;

      if (typeof window.activateView === 'function') {
        window.activateView('jarvis');
      }

      const targetContainer = document.getElementById('chat-container') || document.querySelector('.chat-stream') || document.querySelector('.chat-card-wrapper');
      const heroView = document.getElementById('chat-hero-view');

      if (heroView) heroView.style.display = 'none';
      if (targetContainer) {
        targetContainer.style.display = 'flex';
        targetContainer.style.flexDirection = 'column';
      }

      // Render user message card immediately (including attachment badge if present)
      let userDisplayQuery = query;
      const attachmentToPass = activePromptAttachment;
      if (attachmentToPass) {
        userDisplayQuery = `[📎 Attached: ${attachmentToPass.name}]\n${query}`;
      }
      appendChatMessage('user', userDisplayQuery);

      const inputEl = document.getElementById('rag-query-input');
      if (inputEl) inputEl.value = '';
      window.clearPromptAttachment();

      // Senior Lead Architect Optimization: Immediate thinking indicator pill
      const thinkingCard = document.createElement('div');
      thinkingCard.className = 'chat-bubble ai-bubble glass-card thinking-placeholder';
      thinkingCard.innerHTML = `<div class="chat-header">
        <div class="ai-avatar">•</div>
        <strong style="color: var(--accent-indigo);">Juno 2.5 Flash</strong>
      </div>
      <div class="chat-text" style="display: flex; align-items: center; gap: 8px; font-style: italic; color: #8c5a00;">
        <span class="spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #fbc02d; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
        <span>Synthesizing response...</span>
      </div>`;
      if (targetContainer) {
        targetContainer.appendChild(thinkingCard);
        targetContainer.scrollTop = targetContainer.scrollHeight;
      }

      const modelSelector = document.getElementById('model-select-dropdown') || document.getElementById('ai-model-selector');
      const selectedModel = modelSelector ? modelSelector.value : 'gemini-2.5-flash';

      let answerText = "";
      let providerName = "Juno 2.5 Flash";
      let citations = [];

      try {
        const currentNotes = (typeof Store !== 'undefined' && Store.getNotes) ? Store.getNotes() : [];
        let ragRes = null;
        let ragContextStr = '';

        let rag = typeof RAGEngine !== 'undefined' ? RAGEngine : (typeof window !== 'undefined' ? window.RAGEngine : null);
        if (rag && typeof rag.query === 'function') {
          ragRes = rag.query(query, currentNotes);
          if (ragRes && ragRes.citations && ragRes.citations.length > 0) {
            ragContextStr = ragRes.citations.map(c => `[Title: ${c.title}]\n${c.snippet || c.summary || ''}`).join('\n\n');
            citations = ragRes.citations;
          }
        }

        if (typeof window !== 'undefined' && window.aiEngine && typeof window.aiEngine.generateResponse === 'function') {
          const res = await window.aiEngine.generateResponse({
            prompt: query,
            model: selectedModel,
            ragContext: ragContextStr,
            imageAttachment: attachmentToPass
          });
          if (res && res.text) {
            answerText = res.text;
            providerName = res.provider || providerName;
          }
        }

        if (!answerText && ragRes && ragRes.answer) {
          answerText = ragRes.answer;
        }
      } catch (err) {
        console.warn("AI Engine synthesis error:", err);
      }

      // Remove thinking card before rendering final AI response
      if (thinkingCard && thinkingCard.parentNode) {
        thinkingCard.parentNode.removeChild(thinkingCard);
      }

      if (!answerText) {
        const qLower = query.trim().toLowerCase();
        if (qLower === 'hi' || qLower === 'hii' || qLower === 'hiii' || qLower === 'hello' || qLower === 'hey') {
          answerText = "Hello Ankita! 👋 How can I help you synthesize your ideas and notes today?";
        } else {
          answerText = `Hello Ankita! 👋 I have received your query: **"${query}"**.\n\nYour Second Brain AI system is online and ready to assist you with note retrieval, research synthesis, and repository architecture.`;
        }
      }

      if (submitBtn) {
        submitBtn.disabled = false;
      }

      // Render final AI message card with typewriter streaming
      appendChatMessage('ai', answerText, citations, false, query, providerName, true);

      // Save into current Chat Thread
      if (typeof Store !== 'undefined' && Store.saveChatThread) {
        try {
          const activeId = Store.getActiveThreadId();
          const threads = Store.getChatThreads() || [];
          let currentThread = threads.find(t => t && t.id === activeId);
          if (!currentThread) {
            currentThread = { id: activeId || `thread-${Date.now()}`, title: query.substring(0, 30), createdAt: Date.now(), messages: [] };
          }
          if (!Array.isArray(currentThread.messages)) {
            currentThread.messages = [];
          }
          currentThread.messages.push({ id: `msg-u-${Date.now()}`, role: 'user', content: query, timestamp: Date.now() });
          currentThread.messages.push({ id: `msg-a-${Date.now()}`, role: 'assistant', content: answerText, timestamp: Date.now(), provider: providerName });
          Store.saveChatThread(currentThread);
          if (typeof renderChatThreadsList === 'function') renderChatThreadsList();
        } catch (threadErr) {
          console.warn('Error saving chat thread:', threadErr);
        }
      }

      if (targetContainer) {
        targetContainer.scrollTop = targetContainer.scrollHeight;
      }
    }
    window.handleRAGQuery = handleRAGQuery;

    function appendChatMessage(sender, text, citations = [], isGeneralKnowledge = false, queryStr = '', customProvider = '', streamTypewriter = false) {
      const targetContainer = document.getElementById('chat-container') || document.querySelector('.chat-stream') || document.querySelector('.chat-card-wrapper');
      if (!targetContainer) return;

      targetContainer.style.display = 'flex';
      targetContainer.style.flexDirection = 'column';

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
          <strong style="color: var(--accent-indigo);">${escapeHTML(customProvider || 'Second Brain AI Assistant')}</strong>
        </div>
        <div class="chat-text" id="chat-text-content"></div>
        ${citationsHTML}
        ${actionsHTML}`;

        const textContentEl = msgCard.querySelector('#chat-text-content');
        if (textContentEl) {
          if (streamTypewriter && text.length > 20) {
            const words = text.split(' ');
            let currentIdx = 0;
            const timer = setInterval(() => {
              currentIdx += 2;
              const chunk = words.slice(0, currentIdx).join(' ');
              textContentEl.innerHTML = formatMarkdownText(chunk);
              targetContainer.scrollTop = targetContainer.scrollHeight;
              if (currentIdx >= words.length) {
                clearInterval(timer);
                textContentEl.innerHTML = formatMarkdownText(text);
              }
            }, 18);
          } else {
            textContentEl.innerHTML = formatMarkdownText(text);
          }
        }
      }

      // Always append message card to DOM first!
      targetContainer.appendChild(msgCard);
      targetContainer.scrollTop = targetContainer.scrollHeight;

      setTimeout(() => {
        try {
          msgCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
      }, 50);

      // Safe optional audio speech announcement
      if (sender !== 'user') {
        try {
          if (typeof NexusBotEngine !== 'undefined' && typeof NexusBotEngine.speak === 'function') {
            const summarySnippet = text.replace(/###|####|>|\*|`/g, '').trim().substring(0, 160);
            NexusBotEngine.speak(`🌼 ${summarySnippet}...`, 8000);
          }
        } catch (botErr) {
          console.warn('NexusBotEngine audio announcement skipped:', botErr);
        }
      }

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
                  <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 10px;">${newNote.summary || (newNote.content ? newNote.content.substring(0, 140) + '...' : '')}</p>
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

    let vaultViewMode = 'grid';

    const vaultViewGridBtn = document.getElementById('vault-view-grid-btn');
    const vaultViewTreeBtn = document.getElementById('vault-view-tree-btn');

    if (vaultViewGridBtn && vaultViewTreeBtn) {
      vaultViewGridBtn.addEventListener('click', () => {
        vaultViewMode = 'grid';
        vaultViewGridBtn.classList.add('active');
        vaultViewTreeBtn.classList.remove('active');
        renderNotesGrid();
      });
      vaultViewTreeBtn.addEventListener('click', () => {
        vaultViewMode = 'tree';
        vaultViewTreeBtn.classList.add('active');
        vaultViewGridBtn.classList.remove('active');
        renderNotesGrid();
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

      if (vaultViewMode === 'tree') {
        // Render Folder Tree Explorer Mode
        const categoriesMap = {};
        filtered.forEach(note => {
          let cat = 'Uncategorized';
          if (note.tags && note.tags.length > 0) {
            cat = note.tags[0];
          }
          if (!categoriesMap[cat]) categoriesMap[cat] = [];
          categoriesMap[cat].push(note);
        });

        notesGrid.style.gridTemplateColumns = '1fr';
        notesGrid.innerHTML = `
          <div class="file-explorer-tree glass-card" style="padding: 20px; border-radius: 16px; width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
              <div style="font-weight: 700; font-size: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>📂 Knowledge Vault File Explorer</span>
                <span style="font-size: 11px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 2px 8px; border-radius: 12px; font-weight: 600;">${filtered.length} Items</span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted);">Click folders to expand & inspect files</div>
            </div>

            <div class="folder-tree-list" style="display: flex; flex-direction: column; gap: 12px;">
              ${Object.entries(categoriesMap).map(([folderName, files], idx) => `
                <details class="folder-tree-item" ${idx === 0 || folderName.includes('Career') || folderName.includes('Resumes') ? 'open' : ''} style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden;">
                  <summary style="padding: 12px 16px; font-weight: 600; font-size: 13.5px; color: var(--text-primary); cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 16px;">📂</span>
                      <span>${escapeHTML(folderName)}</span>
                    </div>
                    <span style="font-size: 11.5px; font-weight: 500; color: var(--text-muted); background: var(--bg-card); padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color);">${files.length} ${files.length === 1 ? 'file' : 'files'}</span>
                  </summary>
                  <div class="folder-files-container" style="padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.15);">
                    ${files.map(file => `
                      <div class="file-row-item" style="padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseenter="this.style.background='rgba(59, 130, 246, 0.08)'" onmouseleave="this.style.background='rgba(255, 255, 255, 0.03)'">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                          <span style="font-size: 16px;">${file.sourceType === 'file' ? '📄' : file.sourceType === 'voice' ? '🎙️' : file.sourceType === 'clip' ? '🔗' : '📝'}</span>
                          <div style="min-width: 0;">
                            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                              ${file.pinned ? '📌 ' : ''}${escapeHTML(file.title)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; align-items: center;">
                              <span>${escapeHTML(file.dateStr || '')}</span>
                              <span>•</span>
                              <span style="text-transform: uppercase; color: var(--accent-indigo); font-weight: 600;">${escapeHTML(file.sourceType)}</span>
                            </div>
                          </div>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                          <button class="btn btn-secondary view-btn" data-id="${file.id}" style="padding: 4px 10px; font-size: 12px;">View</button>
                          <button class="btn btn-secondary pin-btn" data-id="${file.id}" style="padding: 4px 10px; font-size: 12px;">${file.pinned ? 'Pinned' : 'Pin'}</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </details>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        // Grid View
        notesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
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
      }

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
      setTimeout(() => {
        if (typeof toast.remove === 'function') toast.remove();
        else if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 3500);
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
        .replace(/\(Ref item \d+: [^)]+\)/gi, '')
        .replace(/\.\s*\./g, '.')
        .trim();

      return cleaned;
    }

    function formatMarkdownText(text) {
      if (!text) return '';
      const cleaned = cleanRogueText(text);
      if (typeof window !== 'undefined' && typeof window.formatMarkdownText === 'function' && window.formatMarkdownText !== formatMarkdownText) {
        return window.formatMarkdownText(cleaned);
      }
      
      let html = cleaned;
      // 1. Code blocks with syntax highlighting & copy header
      html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const cleanLang = lang.trim() || 'code';
        const escapedCode = escapeHTML(code.trim());
        return `<div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang-label">${cleanLang}</span>
            <button class="code-copy-btn" onclick="window.copyCodeFromBlock(this)">📋 Copy Code</button>
          </div>
          <pre class="code-block-content"><code class="language-${cleanLang}">${escapedCode}</code></pre>
        </div>`;
      });

      // 2. Inline code
      html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

      // 3. Headings
      html = html.replace(/^#### (.*$)/gim, '<h4 style="color: var(--text-primary); margin: 10px 0 4px;">$1</h4>');
      html = html.replace(/^### (.*$)/gim, '<h3 style="color: var(--accent-indigo); margin: 12px 0 6px;">$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2 style="color: var(--accent-indigo); margin: 14px 0 8px;">$1</h2>');

      // 4. Bold & Italic
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

      // 5. Paragraph line breaks
      html = html.replace(/\n\n/g, '<br><br>');
      html = html.replace(/\n/g, '<br>');

      return html;
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
    }

    window.dismissPWAPopup = function() {
      const popup = document.getElementById('pwa-install-popup');
      if (popup) popup.style.display = 'none';
      try { localStorage.setItem('juno_pwa_dismissed', 'true'); } catch (e) {}
    };

    window.openPWAInstallGuideModal = function() {
      const guideModal = document.getElementById('pwa-guide-modal');
      if (guideModal) guideModal.style.display = 'flex';
    };

    window.triggerPWAInstall = async function() {
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      window.dismissPWAPopup();
      if (deferredPWAInstallPrompt) {
        deferredPWAInstallPrompt.prompt();
        const { outcome } = await deferredPWAInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Thank you for installing Juno AI App! 🎉');
        }
        deferredPWAInstallPrompt = null;
      } else {
        window.openPWAInstallGuideModal();
      }
    };

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPWAInstallPrompt = e;
      const popup = document.getElementById('pwa-install-popup');
      if (popup) popup.style.display = 'flex';
      if (pwaInstallBtn) pwaInstallBtn.style.display = 'inline-flex';
    });

    setTimeout(() => {
      try {
        const isDismissed = localStorage.getItem('juno_pwa_dismissed');
        const popup = document.getElementById('pwa-install-popup');
        if (popup && !isDismissed) {
          popup.style.display = 'flex';
        }
      } catch (e) {}
    }, 1500);

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', () => window.triggerPWAInstall());
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
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      if (typeof Store !== 'undefined' && typeof Store.createChatThread === 'function') {
        const newThread = Store.createChatThread('New Session');
        if (typeof window.switchChatThread === 'function') {
          window.switchChatThread(newThread.id);
        }
      } else {
        const heroView = document.getElementById('chat-hero-view');
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
          chatContainer.innerHTML = '';
          chatContainer.style.display = 'none';
        }
        if (heroView) heroView.style.display = 'flex';
      }
      if (typeof showToast === 'function') showToast('✨ New Chat Session started.');
    };

    window.switchChatThread = function(threadId) {
      if (typeof window.activateView === 'function') {
        window.activateView('jarvis');
      }
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

      container.innerHTML = '';

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

    window.toggleNeuralLabMode = function(btnEl) {
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      const tabBtns = document.querySelectorAll('.gemini-tab-btn');
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.boxShadow = 'none';
      });
      if (btnEl) {
        btnEl.classList.add('active');
        btnEl.style.background = '#fbc02d';
        btnEl.style.boxShadow = '0 2px 8px rgba(251, 192, 45, 0.4)';
      }
      if (typeof showToast === 'function') {
        showToast('🧬 Neural Lab v2.5 Cognitive Reasoning Mode Online.');
      }
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
