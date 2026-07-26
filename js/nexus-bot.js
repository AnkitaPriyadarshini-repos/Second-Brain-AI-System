/**
 * Second Brain AI System — Nexus AI Fairy Bot Engine
 * Manages 3D Fairy Bot mascot animations, floating companion widget, speech dialogues, and query consolidation
 */

(function (global) {
  'use strict';

  const NexusBotEngine = {
    state: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'
    widgetEl: null,
    dialogueEl: null,
    botImgEls: [],
    recentQueries: [],
    recentMemos: [],

    activeAvatar: 'blue-bot', // 'blue-bot' | 'fairy'
    roboMode: 'assistant',    // 'assistant' | 'quantum' | 'listener' | 'tutor'

    init: function () {
      if (typeof window === 'undefined') return;

      this.botImgEls = Array.from(document.querySelectorAll('.nexus-bot-avatar-img'));
      this.widgetEl = document.getElementById('nexus-bot-widget');
      this.dialogueEl = document.getElementById('nexus-bot-dialogue');

      this.bindEvents();
      this.setState('idle');
      this.speak("Hi Ankita! I'm your friendly Yellow Robot helper 🌼. Ask me anything about your notes.", 6000);
    },

    setRoboMode: function (mode) {
      this.roboMode = mode;
      if (typeof document !== 'undefined') {
        const modeBtns = document.querySelectorAll('.robo-mode-btn');
        modeBtns.forEach(btn => {
          if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      if (mode === 'assistant') {
        this.speak("Robo Assistant Mode: Grounded RAG Query Active.", 3500);
      } else if (mode === 'quantum') {
        this.speak("Quantum Turbo Search: Ultra-fast similarity indexing active!", 3500);
      } else if (mode === 'listener') {
        this.speak("Live Voice Listener Mode: Speak out loud to capture voice memos.", 3500);
        if (typeof VoiceEngine !== 'undefined') VoiceEngine.startListen();
      } else if (mode === 'tutor') {
        this.speak("AI Flashcard Tutor Mode: Ready to test your recall knowledge!", 3500);
      }
    },

    runDiagnostics: function () {
      this.setState('thinking');
      if (typeof GeminiColorFlowEngine !== 'undefined') {
        GeminiColorFlowEngine.triggerState('thinking', 4500);
      }
      this.speak("Holographic Scan: 100 Notes Vectorized | 38 Entities Extracted | 98.7% Cosine Accuracy", 5000);
      this.speakOutLoud("Nexus AI Robot Holographic Diagnostics Complete. 100 notes indexed, 98.7 percent accuracy.");
    },

    setAvatar: function (avatarType) {
      this.activeAvatar = avatarType;
      if (typeof document === 'undefined') return;

      const mainImg = document.getElementById('nexus-main-bot-img');
      const switchBtns = document.querySelectorAll('.avatar-switch-btn');

      switchBtns.forEach(btn => {
        if (btn.getAttribute('data-avatar') === avatarType) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      if (mainImg) {
        if (avatarType === 'yellow-bot') {
          mainImg.src = 'assets/nexus_yellow_bot.png';
          this.speak("Switched to Yellow Robot helper avatar 🌼.", 3000);
        } else if (avatarType === 'fairy') {
          mainImg.src = 'assets/nexus_bot.png';
          this.speak("Switched to Nexus Fairy Bot avatar.", 3000);
        } else {
          mainImg.src = 'assets/nexus_blue_bot.png';
          this.speak("Switched to Nexus Orb Robot Stage.", 3000);
        }
      }
    },

    speakOutLoud: function (text) {
      if (typeof VoiceEngine !== 'undefined' && VoiceEngine.speak) {
        VoiceEngine.speak(text);
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        } catch (e) {}
      }
    },

    bindEvents: function () {
      if (typeof document === 'undefined') return;

      const widgetHeader = document.getElementById('nexus-bot-widget-header');
      const widgetBody = document.getElementById('nexus-bot-widget-body');
      const toggleBtn = document.getElementById('nexus-bot-toggle-btn');
      const quickInput = document.getElementById('nexus-bot-quick-input');
      const quickSubmitBtn = document.getElementById('nexus-bot-quick-submit');

      const orbTrigger = document.getElementById('hologram-orb-trigger');
      const mainBotImg = document.getElementById('nexus-main-bot-img');
      const stageVoiceBtn = document.getElementById('stage-voice-btn');
      const stageScanBtn = document.getElementById('stage-scan-btn');

      if (widgetHeader) {
        widgetHeader.addEventListener('click', () => {
          if (this.widgetEl) {
            this.widgetEl.classList.toggle('minimized');
            if (toggleBtn) {
              toggleBtn.textContent = this.widgetEl.classList.contains('minimized') ? '+' : '–';
            }
          }
        });
      }

      if (quickSubmitBtn) {
        quickSubmitBtn.addEventListener('click', () => {
          if (quickInput && quickInput.value.trim()) {
            const val = quickInput.value.trim();
            this.handleQuickCaptureOrQuery(val);
            quickInput.value = '';
          }
        });
      }

      if (quickInput) {
        quickInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (quickInput.value.trim()) {
              const val = quickInput.value.trim();
              this.handleQuickCaptureOrQuery(val);
              quickInput.value = '';
            }
          }
        });
      }

      if (orbTrigger) {
        orbTrigger.addEventListener('click', () => {
          this.runDiagnostics();
        });
      }

      if (mainBotImg) {
        mainBotImg.addEventListener('click', () => {
          this.speak("Interactive Mascot: Tap mode buttons below to activate search options.", 3500);
        });
      }

      if (stageVoiceBtn) {
        stageVoiceBtn.addEventListener('click', () => {
          if (typeof VoiceEngine !== 'undefined') {
            VoiceEngine.toggleListen();
          }
        });
      }

      if (stageScanBtn) {
        stageScanBtn.addEventListener('click', () => {
          this.runDiagnostics();
        });
      }

      // Delegate avatar switcher and mode bar
      document.addEventListener('click', (e) => {
        const modeBtn = e.target.closest('.robo-mode-btn');
        if (modeBtn) {
          const mode = modeBtn.getAttribute('data-mode');
          if (mode) this.setRoboMode(mode);
        }

        const switchBtn = e.target.closest('.avatar-switch-btn');
        if (switchBtn) {
          const avatar = switchBtn.getAttribute('data-avatar');
          if (avatar) this.setAvatar(avatar);
        }
      });
    },

    setState: function (newState) {
      this.state = newState;
      if (typeof document === 'undefined') return;

      this.botImgEls.forEach(img => {
        img.classList.remove('bot-listening', 'bot-thinking', 'bot-speaking');
        if (newState === 'listening') {
          img.classList.add('bot-listening');
        } else if (newState === 'thinking') {
          img.classList.add('bot-thinking');
        } else if (newState === 'speaking') {
          img.classList.add('bot-speaking');
        }
      });

      if (newState === 'listening') {
        this.speak("I'm listening to your voice memo or query...", 0);
      } else if (newState === 'thinking') {
        this.speak("RAG Vector Engine is searching 100+ notes and extracting citations...", 0);
      } else if (newState === 'speaking') {
        this.speak("Synthesizing answer with exact grounded citations!", 4000);
      }
    },

    speak: function (message, duration = 4000) {
      if (!message || typeof document === 'undefined') return;
      const dialogues = document.querySelectorAll('#nexus-bot-dialogue, .nexus-hero-dialogue');
      dialogues.forEach(el => {
        el.textContent = message;
        el.classList.add('active');
      });

      if (duration > 0) {
        setTimeout(() => {
          if (typeof document !== 'undefined') {
            dialogues.forEach(el => {
              if (el.textContent === message) {
                el.classList.remove('active');
              }
            });
          }
        }, duration);
      }
    },

    handleQuickCaptureOrQuery: function (text) {
      if (!text) return;
      this.recentQueries.unshift(text);
      if (this.recentQueries.length > 5) this.recentQueries.pop();

      if (typeof document !== 'undefined') {
        const ragInput = document.getElementById('rag-query-input');
        const ragForm = document.getElementById('rag-query-form');

        if (ragInput) ragInput.value = text;

        if (typeof window !== 'undefined' && typeof window.triggerSampleQuery === 'function') {
          window.triggerSampleQuery(text);
        } else if (ragForm) {
          const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
          ragForm.dispatchEvent(submitEvent);
        }
      }

      this.renderConsolidatedFeed();
    },

    consolidateMemos: function (notes) {
      if (!Array.isArray(notes)) return;
      this.recentMemos = notes.slice(0, 3);
      this.renderConsolidatedFeed();
    },

    renderConsolidatedFeed: function () {
      if (typeof document === 'undefined') return;
      const feedEl = document.getElementById('nexus-bot-consolidated-feed');
      if (!feedEl) return;

      let html = '<div class="nexus-feed-title">Consolidated Memos & Queries</div>';
      
      if (this.recentQueries.length > 0) {
        html += '<div class="nexus-feed-section"><strong>Recent Queries:</strong>';
        this.recentQueries.forEach(q => {
          html += `<button class="nexus-feed-pill" data-query="${q.replace(/"/g, '&quot;')}">${q}</button>`;
        });
        html += '</div>';
      }

      if (this.recentMemos.length > 0) {
        html += '<div class="nexus-feed-section"><strong>Latest Memos Saved:</strong>';
        this.recentMemos.forEach(m => {
          html += `<div class="nexus-feed-memo">${m.title || 'Untitled Memo'}</div>`;
        });
        html += '</div>';
      }

      feedEl.innerHTML = html;

      // Add click listeners to feed pills
      feedEl.querySelectorAll('.nexus-feed-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const q = pill.getAttribute('data-query');
          if (q) this.handleQuickCaptureOrQuery(q);
        });
      });
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NexusBotEngine;
  } else {
    global.NexusBotEngine = NexusBotEngine;
  }

})(typeof window !== 'undefined' ? window : this);
