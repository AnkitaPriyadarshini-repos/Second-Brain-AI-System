/**
 * ==========================================================================
 * MILO ROBOT AI COMPANION ENGINE
 * Floating White Ceramic Robot with Glossy Black Visor, Cyan Glowing Eyes,
 * Small Articulated Arms, and Reactive Interactive Animations.
 *
 * Supports multi-instance mounting (Welcome Screen, Sidebar, In-Chat Bar).
 * Maintains full backward compatibility with NoriCompanion / TufyCompanion.
 * ==========================================================================
 */

(function () {
  'use strict';

  class MiloCompanion {
    static instances = [];

    /**
     * Broadcasts a state change across all mounted Milo companions on the page
     * @param {string} newState - 'idle' | 'listening' | 'thinking' | 'responding' | 'error' | 'happy'
     * @param {string|null} customSpeech - optional speech bubble message
     */
    static setGlobalState(newState, customSpeech = null) {
      MiloCompanion.instances.forEach((inst) => {
        try {
          inst.setState(newState, customSpeech);
        } catch (_) {}
      });

      // Update in-chat status badge text if present
      const badge = document.getElementById('milo-chat-status-badge');
      if (badge) {
        const labels = {
          idle: 'Ready to assist',
          listening: 'Listening…',
          thinking: 'Thinking & searching…',
          responding: 'Answering…',
          error: 'Connection issue',
          happy: 'Ready to code!'
        };
        badge.textContent = labels[newState] || 'Ready';
        badge.setAttribute('data-state', newState);
      }
    }

    constructor(options = {}) {
      this.containerId = options.containerId || 'nori-companion-target';
      this.compact = Boolean(options.compact);
      this.size = options.size || (this.compact ? 34 : 160);
      this.state = 'idle'; // idle | listening | thinking | responding | error | happy
      this.instanceId = 'milo_' + Math.random().toString(36).substring(2, 9);
      this.speechTimeout = null;
      this.blinkTimer = null;
      this.container = null;
      this.wrapper = null;
      this.speechBubble = null;

      this.phrases = {
        idle: [
          "Hey! I'm Milo, your AI companion.",
          "Your Second Brain is active and synced.",
          "Got a question? Ask me anything!",
          "Ready to work through code step by step."
        ],
        listening: [
          "Listening closely…",
          "Ready! What's on your mind?",
          "Tell me more!"
        ],
        thinking: [
          "Searching Second Brain notes…",
          "Analyzing code context…",
          "Synthesizing your answer…"
        ],
        responding: [
          "Here's what I found! ✨",
          "Found in your Second Brain notes:",
          "Step-by-step answer ready! ✨"
        ],
        error: [
          "I couldn't reach the AI service right now. Please try again.",
          "Local notes are still safe in your vault!"
        ],
        happy: [
          "Happy to help with your code and notes! ✨",
          "Milo is ready for another question!",
          "Knowledge captured! 🧠"
        ]
      };

      MiloCompanion.instances.push(this);
      this.init();
    }

    init() {
      this.container = document.getElementById(this.containerId);
      if (!this.container) return;

      this.container.innerHTML = '';
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'milo-wrapper';
      this.wrapper.style.position = 'relative';
      this.wrapper.style.display = 'inline-flex';
      this.wrapper.style.alignItems = 'center';
      this.wrapper.style.justifyContent = 'center';

      // Speech bubble for full-size companion
      if (!this.compact) {
        this.speechBubble = document.createElement('div');
        this.speechBubble.className = 'milo-speech-bubble';
        this.speechBubble.setAttribute('role', 'status');
        this.speechBubble.setAttribute('aria-live', 'polite');
        this.wrapper.appendChild(this.speechBubble);
      }

      // Initial SVG render
      this.render();

      this.container.appendChild(this.wrapper);

      // Click interaction
      this.wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClickMilo();
      });

      // Start organic blink cycle
      this.startBlinkLoop();
    }

    render() {
      if (!this.wrapper) return;
      const existingContainer = this.wrapper.querySelector('.milo-container');
      if (existingContainer) {
        existingContainer.remove();
      }

      const svgHtml = this.generateSVG(this.state, this.size);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svgHtml.trim();
      const newEl = tempDiv.firstElementChild;
      if (newEl) {
        this.wrapper.appendChild(newEl);
      }
    }

    generateSVG(state, size) {
      const isCompact = this.compact || size <= 48;
      const h = Math.round(size * 1.06);
      const p = this.instanceId;

      return `
      <div class="milo-container milo-state-${state} ${isCompact ? 'milo-compact' : ''}" style="width: ${size}px; height: ${h}px;" title="Milo AI Companion">
        ${!isCompact ? '<div class="milo-ambient-glow"></div>' : ''}
        <svg class="milo-svg" width="${size}" height="${h}" viewBox="0 0 160 170" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Milo Animated Robot">
          <defs>
            <!-- White Ceramic Shell Gradient -->
            <linearGradient id="${p}_shell" x1="80" y1="12" x2="80" y2="148" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="40%" stop-color="#F8FAFC"/>
              <stop offset="85%" stop-color="#E2E8F0"/>
              <stop offset="100%" stop-color="#CBD5E1"/>
            </linearGradient>

            <!-- Metallic Ear Puck Gradient -->
            <linearGradient id="${p}_ear" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#CBD5E1"/>
            </linearGradient>

            <!-- Deep Obsidian Visor Gradient -->
            <linearGradient id="${p}_visor" x1="80" y1="36" x2="80" y2="92" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#080C14"/>
              <stop offset="50%" stop-color="#0E1626"/>
              <stop offset="100%" stop-color="#05080E"/>
            </linearGradient>

            <!-- Visor Specular Glass Arc -->
            <linearGradient id="${p}_glass" x1="80" y1="38" x2="80" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(255, 255, 255, 0.45)"/>
              <stop offset="40%" stop-color="rgba(255, 255, 255, 0.15)"/>
              <stop offset="100%" stop-color="rgba(255, 255, 255, 0)"/>
            </linearGradient>

            <!-- Floating Ground Shadow -->
            <radialGradient id="${p}_shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(0, 0, 0, 0.6)"/>
              <stop offset="45%" stop-color="rgba(0, 242, 254, 0.22)"/>
              <stop offset="100%" stop-color="transparent"/>
            </radialGradient>

            <!-- Electric Cyan Glow Filter -->
            <filter id="${p}_glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Ground Hover Shadow (Full Size Only) -->
          ${!isCompact ? `<ellipse class="milo-ground-shadow" cx="80" cy="158" rx="42" ry="7" fill="url(#${p}_shadow)"/>` : ''}

          <!-- Floating Robot Assembly -->
          <g class="milo-floater">
            
            <!-- Left Headphone Ear Puck -->
            <rect class="milo-ear milo-ear-left" x="18" y="50" width="13" height="28" rx="6.5" fill="url(#${p}_ear)" stroke="#94A3B8" stroke-width="1.5"/>
            <rect class="milo-ear-glow" x="22" y="55" width="5.5" height="18" rx="2.75" fill="#00F2FE" filter="url(#${p}_glow)"/>

            <!-- Right Headphone Ear Puck -->
            <rect class="milo-ear milo-ear-right" x="129" y="50" width="13" height="28" rx="6.5" fill="url(#${p}_ear)" stroke="#94A3B8" stroke-width="1.5"/>
            <rect class="milo-ear-glow" x="132.5" y="55" width="5.5" height="18" rx="2.75" fill="#00F2FE" filter="url(#${p}_glow)"/>

            <!-- Head Shell Helmet Dome -->
            <rect class="milo-head-shell" x="26" y="24" width="108" height="82" rx="41" fill="url(#${p}_shell)" stroke="#CBD5E1" stroke-width="1.6"/>
            
            <!-- Helmet Top Light Node -->
            <path d="M 73,24 L 73,17 Q 80,14 87,17 L 87,24 Z" fill="url(#${p}_shell)" stroke="#CBD5E1" stroke-width="1.2"/>
            <circle class="milo-top-light" cx="80" cy="17" r="3.2" fill="#00F2FE" filter="url(#${p}_glow)"/>

            <!-- Glossy Black Visor Face Screen -->
            <rect class="milo-visor-frame" x="38" y="36" width="84" height="58" rx="26" fill="#020408" stroke="#1E293B" stroke-width="2"/>
            <rect class="milo-visor-screen" x="40" y="38" width="80" height="54" rx="24" fill="url(#${p}_visor)"/>
            
            <!-- Visor Specular Highlight Arc -->
            <path class="milo-visor-reflection" d="M 47,47 C 65,40 95,40 113,47 C 104,43 76,43 47,47 Z" fill="url(#${p}_glass)"/>

            <!-- Glowing Expressive Cyan Eyes -->
            <g class="milo-eyes-group">
              <!-- Left Eye -->
              <g class="milo-eye milo-eye-left" transform-origin="64 64">
                ${state === 'responding' || state === 'happy'
                  ? `<path class="milo-eye-pupil" d="M 58,67 Q 64,57 70,67" stroke="#00F2FE" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#${p}_glow)"/>`
                  : state === 'error'
                  ? `<ellipse class="milo-eye-pupil" cx="64" cy="65" rx="6" ry="7" fill="#F59E0B" filter="url(#${p}_glow)"/><circle cx="62" cy="63" r="1.8" fill="#FFFFFF"/>`
                  : `<ellipse class="milo-eye-pupil" cx="64" cy="64" rx="6.5" ry="10.5" fill="#00F2FE" filter="url(#${p}_glow)"/><circle cx="62.2" cy="60" r="2.2" fill="#FFFFFF"/>`
                }
              </g>

              <!-- Right Eye -->
              <g class="milo-eye milo-eye-right" transform-origin="96 64">
                ${state === 'responding' || state === 'happy'
                  ? `<path class="milo-eye-pupil" d="M 90,67 Q 96,57 102,67" stroke="#00F2FE" stroke-width="3.5" stroke-linecap="round" fill="none" filter="url(#${p}_glow)"/>`
                  : state === 'error'
                  ? `<ellipse class="milo-eye-pupil" cx="96" cy="65" rx="6" ry="7" fill="#F59E0B" filter="url(#${p}_glow)"/><circle cx="94" cy="63" r="1.8" fill="#FFFFFF"/>`
                  : `<ellipse class="milo-eye-pupil" cx="96" cy="64" rx="6.5" ry="10.5" fill="#00F2FE" filter="url(#${p}_glow)"/><circle cx="94.2" cy="60" r="2.2" fill="#FFFFFF"/>`
                }
              </g>
            </g>

            <!-- Compact Torso Pod -->
            <path class="milo-torso-pod" d="M 52,112 C 52,106 108,106 108,112 C 108,138 52,138 52,112 Z" fill="url(#${p}_shell)" stroke="#CBD5E1" stroke-width="1.5"/>

            <!-- Chest Status Core Pill -->
            <rect class="milo-chest-core" x="72" y="117" width="16" height="5.5" rx="2.75" fill="#00F2FE" filter="url(#${p}_glow)"/>

            <!-- Articulated Arms -->
            <ellipse class="milo-arm milo-arm-left" cx="44" cy="120" rx="6" ry="12" fill="url(#${p}_shell)" stroke="#CBD5E1" stroke-width="1.2" transform="rotate(16 44 120)"/>
            <ellipse class="milo-arm milo-arm-right" cx="116" cy="120" rx="6" ry="12" fill="url(#${p}_shell)" stroke="#CBD5E1" stroke-width="1.2" transform="rotate(-16 116 120)"/>

          </g>
        </svg>
      </div>
      `;
    }

    setState(newState, customSpeech = null) {
      if (this.state === newState && !customSpeech) return;
      this.state = newState;
      this.render();

      if (customSpeech) {
        this.say(customSpeech);
      } else if (newState === 'happy') {
        const list = this.phrases[newState];
        const p = list[Math.floor(Math.random() * list.length)];
        this.say(p);
      }
    }

    say(text, duration = 3500) {
      if (!this.speechBubble || this.compact) return;
      this.speechBubble.textContent = text;
      this.speechBubble.classList.add('active');

      if (this.speechTimeout) clearTimeout(this.speechTimeout);
      this.speechTimeout = setTimeout(() => {
        if (this.speechBubble) this.speechBubble.classList.remove('active');
      }, duration);
    }

    flashMouth(duration = 2000) {
      this.pulseGlow(duration);
    }

    pulseGlow(duration = 2000) {
      const container = this.wrapper?.querySelector('.milo-container');
      if (container) {
        container.classList.add('milo-state-listening');
        setTimeout(() => {
          if (container && this.state !== 'listening') {
            container.classList.remove('milo-state-listening');
          }
        }, duration);
      }
    }

    onClickMilo() {
      MiloCompanion.setGlobalState('happy', "Hey! I'm Milo, your Second Brain companion. Ready to help!");
      setTimeout(() => {
        if (this.state === 'happy') MiloCompanion.setGlobalState('idle');
      }, 4000);
    }

    startBlinkLoop() {
      const scheduleNextBlink = () => {
        const nextDelay = 3500 + Math.random() * 2500;
        this.blinkTimer = setTimeout(() => {
          const container = this.wrapper?.querySelector('.milo-container');
          if (container && this.state === 'idle') {
            container.classList.add('milo-blinking');
            setTimeout(() => {
              if (container) container.classList.remove('milo-blinking');
            }, 190);
          }
          scheduleNextBlink();
        }, nextDelay);
      };
      scheduleNextBlink();
    }

    destroy() {
      if (this.blinkTimer) clearTimeout(this.blinkTimer);
      if (this.speechTimeout) clearTimeout(this.speechTimeout);
      const index = MiloCompanion.instances.indexOf(this);
      if (index !== -1) MiloCompanion.instances.splice(index, 1);
    }
  }

  // Global Exports & Backward Compatibility
  window.MiloCompanion = MiloCompanion;
  window.NoriCompanion = MiloCompanion;
  window.TufyCompanion = MiloCompanion;
  window.MochiCompanion = MiloCompanion;

})();
