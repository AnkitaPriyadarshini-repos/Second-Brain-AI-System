/**
 * ==========================================================================
 * SECOND BRAIN AI — ROBO GADGET COMPANION & WELCOME ENGINE
 * Interactive 3D Desktop AI Companion inspired by Pinterest & Icons8 design.
 * Features:
 * - Dynamic facial expressions (Happy Smiling Arcs, Alert Oval, Wink, Love, Thinking)
 * - Harmonized colorways (Royal Blue, Cyber Emerald, Sunset Amber, Obsidian, Purple)
 * - Cursor-aware 3D perspective tracking
 * - Natural organic eye blinking
 * - Native Web Audio API synthesized playful robotic chirps
 * - Interactive Welcome Guide & Onboarding quick-actions for new users
 * - Full synchronization with AI generation, Chat states, and Mascot toggle
 * ==========================================================================
 */

(function (window, document) {
  'use strict';

  const RoboGadget = {
    // Current Configuration & State
    color: 'blue',
    mood: 'happy',
    mascotType: 'gadget', // 'gadget' | 'astronaut'
    soundEnabled: true,
    audioCtx: null,
    welcomeExpanded: true,
    blinkInterval: null,
    mouseTarget: { x: 0, y: 0 },
    currentTilt: { x: 0, y: 0 },
    rafId: null,

    // Pre-computed Asset Matrix
    assets: {
      gadget: {
        blue: {
          happy: 'assets/robo_gadget_happy.png',
          curious: 'assets/robo_gadget_blue.png',
          wink: 'assets/robo_gadget_wink.png',
          love: 'assets/robo_gadget_love.png',
          thinking: 'assets/robo_gadget_thinking.png'
        },
        emerald: {
          happy: 'assets/robo_gadget_happy_emerald.png',
          curious: 'assets/robo_gadget_emerald.png',
          wink: 'assets/robo_gadget_wink.png',
          love: 'assets/robo_gadget_love.png',
          thinking: 'assets/robo_gadget_thinking.png'
        },
        sunset: {
          happy: 'assets/robo_gadget_happy_sunset.png',
          curious: 'assets/robo_gadget_sunset.png',
          wink: 'assets/robo_gadget_wink.png',
          love: 'assets/robo_gadget_love.png',
          thinking: 'assets/robo_gadget_thinking.png'
        },
        obsidian: {
          happy: 'assets/robo_gadget_happy_obsidian.png',
          curious: 'assets/robo_gadget_obsidian.png',
          wink: 'assets/robo_gadget_wink.png',
          love: 'assets/robo_gadget_love.png',
          thinking: 'assets/robo_gadget_thinking.png'
        },
        purple: {
          happy: 'assets/robo_gadget_happy_purple.png',
          curious: 'assets/robo_gadget_purple.png',
          wink: 'assets/robo_gadget_wink.png',
          love: 'assets/robo_gadget_love.png',
          thinking: 'assets/robo_gadget_thinking.png'
        }
      },
      astronaut: [
        { src: 'assets/milo_robot_mascot.png', mood: 'Ready to assist', label: 'Astronaut Classic' },
        { src: 'assets/milo_cosmic_orb.png', mood: 'Cosmic Knowledge Illuminator', label: 'Cosmic Orb' },
        { src: 'assets/milo_space_skater.png', mood: 'Space Explorer', label: 'Space Skater' }
      ]
    },

    colorThemes: {
      blue: {
        accent: '#2563EB',
        haloGlow: 'rgba(37, 99, 235, 0.20)',
        haloSubtle: 'rgba(59, 130, 246, 0.08)',
        shadow: 'rgba(37, 99, 235, 0.28)',
        label: 'Onyx Royal Blue'
      },
      emerald: {
        accent: '#10B981',
        haloGlow: 'rgba(16, 185, 129, 0.24)',
        haloSubtle: 'rgba(6, 182, 212, 0.09)',
        shadow: 'rgba(16, 185, 129, 0.28)',
        label: 'Cyber Emerald'
      },
      sunset: {
        accent: '#F97316',
        haloGlow: 'rgba(249, 115, 22, 0.22)',
        haloSubtle: 'rgba(251, 191, 36, 0.09)',
        shadow: 'rgba(249, 115, 22, 0.28)',
        label: 'Warm Sunset'
      },
      obsidian: {
        accent: '#374151',
        haloGlow: 'rgba(17, 24, 39, 0.14)',
        haloSubtle: 'rgba(107, 114, 128, 0.06)',
        shadow: 'rgba(17, 24, 39, 0.32)',
        label: 'Titanium Obsidian'
      },
      purple: {
        accent: '#8B5CF6',
        haloGlow: 'rgba(139, 92, 246, 0.24)',
        haloSubtle: 'rgba(192, 132, 252, 0.09)',
        shadow: 'rgba(139, 92, 246, 0.28)',
        label: 'Cosmic Purple'
      }
    },

    moods: ['happy', 'curious', 'wink', 'love', 'thinking'],

    /**
     * Initialize Robo Gadget
     */
    init: function () {
      try {
        const savedColor = localStorage.getItem('milo_robo_color');
        if (savedColor && this.assets.gadget[savedColor]) {
          this.color = savedColor;
        }
        const savedSound = localStorage.getItem('milo_robo_sound');
        if (savedSound !== null) {
          this.soundEnabled = savedSound === 'true';
        }
        const savedMascot = localStorage.getItem('milo_mascot_type');
        if (savedMascot === 'astronaut' || savedMascot === 'gadget') {
          this.mascotType = savedMascot;
        }
        const savedWelcome = localStorage.getItem('milo_robo_welcome');
        if (savedWelcome !== null) {
          this.welcomeExpanded = savedWelcome === 'true';
        }
      } catch (_) {}

      this.updateGreetingText();
      this.applyThemeStyles();
      this.syncDisplay();
      this.setupEventListeners();
      this.startOrganicBlinkLoop();
      this.setupMiloCompanionHooks();
    },

    /**
     * Setup Audio Context for playful synthesized chirps
     */
    getAudioCtx: function () {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    },

    /**
     * Synthesize friendly robotic chirps using pure Web Audio API
     */
    playChirp: function (type = 'happy') {
      if (!this.soundEnabled) return;
      try {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'happy') {
          // Playful ascending pentatonic chime (C5 -> E5 -> G5)
          const freqs = [523.25, 659.25, 783.99];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.045, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.22);
          });
        } else if (type === 'wink') {
          // Cheerful upward slide
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.16);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (type === 'color') {
          // Quick dual droplet tone
          [698.46, 880.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.04, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.14);
          });
        } else if (type === 'think') {
          // Tech scan pulse
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(554.37, now + 0.12);
          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        }
      } catch (_) {}
    },

    /**
     * Update Greeting with contextual time-of-day friendliness
     */
    updateGreetingText: function () {
      const headingEl = document.getElementById('robo-greeting-heading');
      const timeGreeting = this.getTimeGreeting();
      if (headingEl) {
        headingEl.textContent = `${timeGreeting} Ankita! 👋 I'm Milo, your AI Brain Companion`;
      }
    },

    getTimeGreeting: function () {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Late night brainstorming?';
    },

    /**
     * Apply CSS Theme Variables for the Robo Gadget
     */
    applyThemeStyles: function () {
      const theme = this.colorThemes[this.color] || this.colorThemes.blue;
      const container = document.getElementById('milo-hero-gadget-container') || document.querySelector('.milo-hero-robot-container');
      if (container) {
        container.style.setProperty('--robo-accent', theme.accent);
        container.style.setProperty('--robo-halo-glow', theme.haloGlow);
        container.style.setProperty('--robo-halo-subtle', theme.haloSubtle);
        container.style.setProperty('--robo-floor-shadow', theme.shadow);
      }

      // Sync active state on color picker buttons
      document.querySelectorAll('.robo-color-dot').forEach((btn) => {
        const btnColor = btn.getAttribute('data-color');
        if (btnColor === this.color) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },

    /**
     * Synchronize the visual display (image, mood label, mascot type)
     */
    syncDisplay: function () {
      const img = document.getElementById('milo-hero-robot-img');
      const wrap = document.getElementById('milo-hero-robot-wrap');
      const moodLabel = document.getElementById('robo-mood-label');
      const mascotBtn = document.getElementById('robo-mascot-toggle-btn');

      if (!img) return;

      if (this.mascotType === 'gadget') {
        const colorSet = this.assets.gadget[this.color] || this.assets.gadget.blue;
        const targetSrc = colorSet[this.mood] || colorSet.happy;
        if (img.src !== targetSrc && !img.src.endsWith(targetSrc)) {
          img.src = targetSrc;
        }
        if (wrap) {
          wrap.classList.remove('mascot-astronaut');
          wrap.classList.add('mascot-gadget');
        }
        if (moodLabel) {
          moodLabel.textContent = this.mood.charAt(0).toUpperCase() + this.mood.slice(1);
        }
        if (mascotBtn) {
          mascotBtn.setAttribute('title', 'Switch to Astronaut Milo');
          mascotBtn.innerHTML = '<span style="font-size: 13px;">🚀</span>';
        }
      } else {
        // Astronaut mode
        const poses = this.assets.astronaut;
        let cur = poses.find((p) => img.src.includes(p.src.replace('assets/', ''))) || poses[0];
        img.src = cur.src;
        if (wrap) {
          wrap.classList.remove('mascot-gadget');
          wrap.classList.add('mascot-astronaut');
        }
        if (moodLabel) {
          moodLabel.textContent = cur.label;
        }
        if (mascotBtn) {
          mascotBtn.setAttribute('title', 'Switch to Robo Gadget');
          mascotBtn.innerHTML = '<span style="font-size: 13px;">🤖</span>';
        }
      }

      // Sync sound button icon
      const soundBtn = document.getElementById('robo-sound-toggle-btn');
      if (soundBtn) {
        if (this.soundEnabled) {
          soundBtn.classList.remove('muted');
          soundBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
        } else {
          soundBtn.classList.add('muted');
          soundBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
        }
      }

      // Sync welcome card visibility
      const welcomeCard = document.getElementById('robo-welcome-card');
      if (welcomeCard) {
        if (this.welcomeExpanded) {
          welcomeCard.classList.remove('collapsed');
        } else {
          welcomeCard.classList.add('collapsed');
        }
      }
    },

    /**
     * Change Robot Shell Colorway ("add the colours to the robo as per background needs to fit in")
     */
    setColor: function (newColor) {
      if (!this.assets.gadget[newColor]) return;
      this.color = newColor;
      try {
        localStorage.setItem('milo_robo_color', newColor);
      } catch (_) {}
      this.applyThemeStyles();
      this.syncDisplay();
      this.playChirp('color');
      this.spawnSparkles(['🎨', '✨', '💫']);
      if (typeof window.showToast === 'function') {
        const theme = this.colorThemes[newColor];
        window.showToast(`✨ Robo Color: ${theme ? theme.label : newColor}`, 'info');
      }
    },

    /**
     * Set Facial Expression / Mood
     */
    setMood: function (newMood) {
      if (!this.moods.includes(newMood)) return;
      this.mood = newMood;
      this.syncDisplay();
      if (newMood === 'wink') this.playChirp('wink');
      else if (newMood === 'thinking') this.playChirp('think');
      else this.playChirp('happy');
    },

    /**
     * Cycle through moods when clicked
     */
    cycleMood: function () {
      if (this.mascotType === 'astronaut') {
        const poses = this.assets.astronaut;
        const img = document.getElementById('milo-hero-robot-img');
        let curIdx = poses.findIndex((p) => img && img.src.includes(p.src.replace('assets/', '')));
        let nextIdx = (curIdx + 1) % poses.length;
        if (img) {
          img.style.transform = 'scale(0.88) rotate(6deg)';
          setTimeout(() => {
            img.src = poses[nextIdx].src;
            img.style.transform = '';
            this.syncDisplay();
            this.playChirp('happy');
            this.spawnSparkles(['✨', '🚀', '⭐']);
            if (typeof window.showToast === 'function') {
              window.showToast(`✨ Milo Mode: ${poses[nextIdx].mood}`, 'info');
            }
          }, 120);
        }
        return;
      }

      // Gadget Mood Cycling
      const curIdx = this.moods.indexOf(this.mood);
      const nextIdx = (curIdx + 1) % this.moods.length;
      const nextMood = this.moods[nextIdx];
      const img = document.getElementById('milo-hero-robot-img');

      if (img) {
        img.style.transform = 'scale(0.9) translateY(4px)';
        setTimeout(() => {
          this.setMood(nextMood);
          img.style.transform = '';
          this.spawnSparkles(nextMood === 'love' ? ['❤️', '💖', '✨'] : ['✨', '⚡', '💫']);
          if (typeof window.showToast === 'function') {
            const moodNames = {
              happy: 'Happy & Welcoming 😊',
              curious: 'Curious & Alert 👀',
              wink: 'Playful Wink 😉',
              love: 'Loving Second Brain ❤️',
              thinking: 'Deep Neural Processing ⚡'
            };
            window.showToast(`✨ Robo Mode: ${moodNames[nextMood] || nextMood}`, 'info');
          }
        }, 120);
      } else {
        this.setMood(nextMood);
      }
    },

    /**
     * Toggle Mascot Type (Robo Gadget <-> Astronaut Milo)
     */
    toggleMascotType: function () {
      this.mascotType = this.mascotType === 'gadget' ? 'astronaut' : 'gadget';
      try {
        localStorage.setItem('milo_mascot_type', this.mascotType);
      } catch (_) {}
      this.playChirp('happy');
      this.syncDisplay();
      this.spawnSparkles(['✨', '🎉', '🌟']);
      if (typeof window.showToast === 'function') {
        window.showToast(`✨ Switched to ${this.mascotType === 'gadget' ? 'Robo Gadget' : 'Astronaut Milo'}!`, 'info');
      }
    },

    /**
     * Toggle Sound Effects
     */
    toggleSound: function () {
      this.soundEnabled = !this.soundEnabled;
      try {
        localStorage.setItem('milo_robo_sound', String(this.soundEnabled));
      } catch (_) {}
      this.syncDisplay();
      if (this.soundEnabled) {
        this.playChirp('happy');
        if (typeof window.showToast === 'function') window.showToast('🔊 Robo sound effects enabled', 'info');
      } else {
        if (typeof window.showToast === 'function') window.showToast('🔇 Robo sound effects muted', 'info');
      }
    },

    /**
     * Toggle Welcome Card (Expand / Collapse)
     */
    toggleWelcomeCard: function () {
      this.welcomeExpanded = !this.welcomeExpanded;
      try {
        localStorage.setItem('milo_robo_welcome', String(this.welcomeExpanded));
      } catch (_) {}
      this.syncDisplay();
      this.playChirp('happy');
    },

    /**
     * Spawn Delightful Particle Sparkles on Poke
     */
    spawnSparkles: function (symbols = ['✨', '⭐', '💫', '🎉']) {
      const container = document.getElementById('robo-sparkles-container');
      if (!container) return;

      for (let i = 0; i < 4; i++) {
        const span = document.createElement('span');
        span.className = 'robo-sparkle-item';
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = -10 - Math.random() * 30;
        span.style.left = `calc(50% + ${offsetX}px)`;
        span.style.top = `calc(50% + ${offsetY}px)`;
        container.appendChild(span);
        setTimeout(() => span.remove(), 1100);
      }
    },

    /**
     * Setup 3D Cursor Tracking & Event Listeners
     */
    setupEventListeners: function () {
      const stage = document.getElementById('robo-gadget-head-stage');
      const wrap = document.getElementById('milo-hero-robot-wrap');

      // Pointer Move for 3D Perspective Tilt & Eye Tracking
      document.addEventListener('pointermove', (e) => {
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rawX = (e.clientX - centerX) / (window.innerWidth * 0.5);
        const rawY = (e.clientY - centerY) / (window.innerHeight * 0.5);

        this.mouseTarget.x = Math.max(-1, Math.min(1, rawX));
        this.mouseTarget.y = Math.max(-1, Math.min(1, rawY));

        if (!this.rafId) {
          this.rafId = requestAnimationFrame(() => this.update3DTilt());
        }
      }, { passive: true });

      // Return to center when mouse leaves
      document.addEventListener('pointerleave', () => {
        this.mouseTarget.x = 0;
        this.mouseTarget.y = 0;
        if (!this.rafId) {
          this.rafId = requestAnimationFrame(() => this.update3DTilt());
        }
      });
    },

    /**
     * Smooth 3D Interpolation
     */
    update3DTilt: function () {
      this.rafId = null;
      const stage = document.getElementById('robo-gadget-head-stage');
      if (!stage) return;

      // Smooth lerp
      this.currentTilt.x += (this.mouseTarget.x - this.currentTilt.x) * 0.12;
      this.currentTilt.y += (this.mouseTarget.y - this.currentTilt.y) * 0.12;

      const rotY = (this.currentTilt.x * 12).toFixed(2);
      const rotX = (-this.currentTilt.y * 10).toFixed(2);
      const transX = (this.currentTilt.x * 5).toFixed(2);
      const transY = (this.currentTilt.y * 3).toFixed(2);

      stage.style.transform = `perspective(700px) rotateY(${rotY}deg) rotateX(${rotX}deg) translate(${transX}px, ${transY}px)`;

      // Continue animation until settled
      if (
        Math.abs(this.mouseTarget.x - this.currentTilt.x) > 0.005 ||
        Math.abs(this.mouseTarget.y - this.currentTilt.y) > 0.005
      ) {
        this.rafId = requestAnimationFrame(() => this.update3DTilt());
      }
    },

    /**
     * Organic Eye Blinking Loop
     */
    startOrganicBlinkLoop: function () {
      if (this.blinkInterval) clearInterval(this.blinkInterval);
      
      const scheduleNextBlink = () => {
        const nextDelay = 3500 + Math.random() * 3000;
        this.blinkInterval = setTimeout(() => {
          this.performBlink();
          scheduleNextBlink();
        }, nextDelay);
      };

      scheduleNextBlink();
    },

    performBlink: function () {
      const img = document.getElementById('milo-hero-robot-img');
      if (!img || this.mood === 'thinking') return;
      img.classList.add('robo-blinking');
      setTimeout(() => {
        img.classList.remove('robo-blinking');
      }, 160);
    },

    /**
     * Hook into MiloCompanion & AI Chat States
     */
    setupMiloCompanionHooks: function () {
      // Connect to global cycleMiloMascot
      window.cycleMiloMascot = () => this.cycleMood();

      // Connect to global actions
      window.setRoboColor = (c) => this.setColor(c);
      window.setRoboMood = (m) => this.setMood(m);
      window.toggleRoboSound = () => this.toggleSound();
      window.toggleMascotType = () => this.toggleMascotType();
      window.toggleRoboWelcomeCard = () => this.toggleWelcomeCard();

      window.triggerRoboAction = (action) => {
        this.playChirp('happy');
        const input = document.getElementById('rag-query-input');
        if (action === 'search') {
          if (input) {
            input.value = '';
            input.placeholder = 'Search vault: e.g. "meeting notes", "roadmap", "architecture"…';
            input.focus();
          }
          if (typeof window.showToast === 'function') window.showToast('🔍 Knowledge Vault search activated. Type your query below!', 'info');
        } else if (action === 'research') {
          if (input) {
            input.value = '/research ';
            input.focus();
            if (typeof window.handleSlashCommandsInput === 'function') {
              window.handleSlashCommandsInput({ target: input });
            }
          }
          if (typeof window.showToast === 'function') window.showToast('🔬 Multi-angle deep research command ready.', 'info');
        } else if (action === 'voice') {
          if (typeof window.toggleVoiceListen === 'function') {
            window.toggleVoiceListen();
          }
        } else if (action === 'tour') {
          this.openQuickTourModal();
        } else if (action === 'mood') {
          this.cycleMood();
        }
      };

      // Hook MiloCompanion.setGlobalState to sync expressions during chat/agents
      if (typeof window.MiloCompanion !== 'undefined') {
        const origSetGlobalState = window.MiloCompanion.setGlobalState;
        window.MiloCompanion.setGlobalState = (newState, customSpeech) => {
          if (typeof origSetGlobalState === 'function') {
            origSetGlobalState.call(window.MiloCompanion, newState, customSpeech);
          }
          if (newState === 'thinking') {
            this.setMood('thinking');
          } else if (newState === 'responding' || newState === 'happy') {
            this.setMood('happy');
            this.spawnSparkles(['✨', '🎉']);
          } else if (newState === 'idle') {
            this.setMood('happy');
          }
        };
      }
    },

    /**
     * Interactive Onboarding Tour Modal for New Users
     */
    openQuickTourModal: function () {
      let modal = document.getElementById('robo-quick-tour-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'robo-quick-tour-modal';
        modal.className = 'robo-modal-backdrop';
        modal.innerHTML = `
          <div class="robo-tour-card">
            <div class="robo-tour-header">
              <div class="robo-tour-title-wrap">
                <span style="font-size: 26px;">🤖</span>
                <div>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">Welcome to Second Brain AI</h3>
                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #6B7280;">Your personal knowledge engine &amp; autonomous agent platform</p>
                </div>
              </div>
              <button type="button" class="robo-tour-close-btn" onclick="document.getElementById('robo-quick-tour-modal').classList.remove('open')">&times;</button>
            </div>
            
            <div class="robo-tour-steps">
              <div class="robo-tour-step">
                <div class="robo-step-number">1</div>
                <div class="robo-step-content">
                  <strong>🔍 Grounded Knowledge Vault</strong>
                  <p>Index documents, notes, Slack chats, and PDFs with hybrid BM25 + vector search. Milo gives accurate, cited answers without hallucinations.</p>
                </div>
              </div>

              <div class="robo-tour-step">
                <div class="robo-step-number">2</div>
                <div class="robo-step-content">
                  <strong>⚡ Autonomous Agent Fleet</strong>
                  <p>Execute multi-step tasks with the Coding Agent, Deep Research Synthesizer, and Workflow Planner using slash commands like <code>/search</code>, <code>/research</code>, <code>/code</code>.</p>
                </div>
              </div>

              <div class="robo-tour-step">
                <div class="robo-step-number">3</div>
                <div class="robo-step-content">
                  <strong>🎙️ Real-Time Voice &amp; Lively Gadget</strong>
                  <p>Talk naturally with speech synthesis and voice commands. Customize your companion gadget colors to match your aesthetic!</p>
                </div>
              </div>
            </div>

            <div class="robo-tour-footer">
              <button type="button" class="btn-primary" style="padding: 9px 20px; font-size: 13.5px; border-radius: 9999px; background: var(--robo-accent, #2563EB); color: #fff; border: none; cursor: pointer; font-weight: 600;" onclick="document.getElementById('robo-quick-tour-modal').classList.remove('open'); document.getElementById('rag-query-input').focus();">
                🚀 Get Started
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.remove('open');
        });
      }
      modal.classList.add('open');
      this.playChirp('happy');
    }
  };

  // Export to Global
  window.RoboGadget = RoboGadget;

  // Initialize on DOMContentLoaded or immediate if ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RoboGadget.init());
  } else {
    RoboGadget.init();
  }

})(typeof window !== 'undefined' ? window : this, typeof document !== 'undefined' ? document : {});
