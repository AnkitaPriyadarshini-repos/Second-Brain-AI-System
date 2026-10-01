/**
 * ==========================================================================
 * NORI PIXEL COMPANION ENGINE
 * Original Expressive Pixel-Art Companion for Second Brain AI
 * ==========================================================================
 */

class NoriCompanion {
  constructor(options = {}) {
    this.containerId = options.containerId || 'nori-companion-target';
    this.size = options.size || 140;
    this.compact = options.compact || false;
    this.state = 'idle'; // idle | listening | thinking | responding | happy | confused | success | sleeping
    this.prevRefState = 'idle';
    this.tick = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.speechTimeout = null;
    this.particles = [];
    
    this.phrases = {
      idle: [
        "Hey! What are we working on today?",
        "I'm ready whenever you are.",
        "Your Second Brain is synced and ready.",
        "Got an idea? Tell me!"
      ],
      listening: [
        "Listening attentively...",
        "I'm all ears!",
        "Taking note..."
      ],
      thinking: [
        "Connecting your knowledge notes...",
        "Searching vault and synthesizing...",
        "Pondering this deeply...",
        "Thinking through this..."
      ],
      responding: [
        "Here's what I found!",
        "Let me explain this clearly.",
        "Connecting the pieces for you..."
      ],
      happy: [
        "I love helping you think!",
        "Great idea!",
        "Memory captured safely! ✨",
        "Always happy to assist!"
      ],
      success: [
        "Saved to your Second Brain! 🧠",
        "Thought stored successfully!",
        "Awesome! Got it pinned."
      ],
      confused: [
        "Hmm, could you clarify that?",
        "Let's try rephrasing that.",
        "Not quite sure, let's try again!"
      ]
    };

    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.className = 'nori-companion-container' + (this.compact ? ' nori-compact' : '');

    // Canvas Wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'nori-canvas-wrapper';

    // Speech Bubble
    this.speechBubble = document.createElement('div');
    this.speechBubble.className = 'nori-speech-bubble';
    this.wrapper.appendChild(this.speechBubble);

    // Canvas Element
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'nori-pixel-canvas';
    this.canvas.width = 24;
    this.canvas.height = 24;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);

    // Status Tag (only if not compact)
    if (!this.compact) {
      this.statusTag = document.createElement('div');
      this.statusTag.className = 'nori-status-tag idle';
      this.statusTag.innerHTML = `<span class="nori-status-dot"></span><span class="nori-status-text">Nori is ready</span>`;
      this.container.appendChild(this.statusTag);
    }

    // Interactivity
    this.wrapper.addEventListener('click', () => this.onClickNori());

    // Start Render Loop
    this.loop();
  }

  setState(newState, customSpeech = null) {
    if (this.state === newState && !customSpeech) return;
    this.state = newState;
    
    if (this.statusTag) {
      this.statusTag.className = `nori-status-tag ${newState}`;
      const statusTextEl = this.statusTag.querySelector('.nori-status-text');
      if (statusTextEl) {
        const labels = {
          idle: 'Nori is ready',
          listening: 'Nori is listening...',
          thinking: 'Nori is thinking...',
          responding: 'Nori is responding',
          happy: 'Nori is pleased ✨',
          success: 'Memory Saved! 🧠',
          confused: 'Nori is curious',
          sleeping: 'Nori is resting'
        };
        statusTextEl.textContent = labels[newState] || 'Nori';
      }
    }

    if (customSpeech) {
      this.say(customSpeech);
    } else if (newState === 'happy' || newState === 'success') {
      const list = this.phrases[newState];
      const p = list[Math.floor(Math.random() * list.length)];
      this.say(p);
    }
  }

  say(text, duration = 3500) {
    if (!this.speechBubble) return;
    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('active');

    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.remove('active');
    }, duration);
  }

  onClickNori() {
    this.spawnSparkles(6);
    this.setState('happy', 'Hey! I\'m Nori, your AI companion.');
    setTimeout(() => {
      if (this.state === 'happy') this.setState('idle');
    }, 4000);
  }

  spawnSparkles(count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 12 + (Math.random() * 8 - 4),
        y: 10 + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.6 - Math.random() * 0.8,
        alpha: 1.0,
        color: ['#F59E0B', '#38BDF8', '#EC4899', '#34D399'][Math.floor(Math.random() * 4)]
      });
    }
  }

  loop() {
    this.tick++;
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    // Random Blinking
    this.blinkTimer++;
    if (this.blinkTimer > 180 + Math.random() * 120) {
      this.isBlinking = true;
      if (this.blinkTimer > 192 + Math.random() * 120) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // State specific periodic animations
    if (this.state === 'thinking' && this.tick % 15 === 0) {
      this.particles.push({
        x: 18 + (Math.random() * 4 - 2),
        y: 6 + (Math.random() * 4 - 2),
        vx: 0.1,
        vy: -0.4,
        alpha: 0.9,
        color: '#F59E0B'
      });
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 24, 24);

    // Y Float Sine Wave Offset
    const floatY = Math.sin(this.tick * 0.06) * 0.8;
    const baseY = 3 + floatY;

    // Palette
    const C = {
      outline: '#0B0F19',
      body: '#38BDF8',       // Crisp Nori Sky Cyan
      bodyDark: '#0284C7',   // Shadow Cyan
      bodyLight: '#7DD3FC',  // Highlight Cyan
      belly: '#F8FAFC',      // White belly
      cheek: '#F472B6',      // Pink blush
      eye: '#0F172A',        // Dark Eye
      eyeGleam: '#FFFFFF',
      antennaSpark: '#F59E0B'// Amber Spark
    };

    // State Color Modifiers
    if (this.state === 'thinking') { C.body = '#8B5CF6'; C.bodyDark = '#6D28D9'; C.bodyLight = '#C4B5FD'; }
    if (this.state === 'listening') { C.body = '#10B981'; C.bodyDark = '#059669'; C.bodyLight = '#6EE7B7'; }
    if (this.state === 'happy' || this.state === 'success') { C.body = '#38BDF8'; C.antennaSpark = '#EC4899'; }

    // Helper Pixel Drawer
    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), 1, 1);
    };

    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), w, h);
    };

    // --- 1. ANTENNA & SPARK ---
    rect(11, 2, 2, 2, C.outline);
    rect(11, 3, 2, 1, C.antennaSpark);
    rect(11, 4, 2, 2, C.outline);
    rect(11.5, 4.5, 1, 1, C.bodyLight);

    // Sparkle animation above antenna if active
    if (this.state === 'thinking' || this.state === 'responding' || this.state === 'happy') {
      const sparkGlow = (this.tick % 10 < 5) ? '#F59E0B' : '#FDE047';
      px(10, 1, sparkGlow);
      px(13, 1, sparkGlow);
      px(11.5, 0, sparkGlow);
    }

    // --- 2. MAIN BODY SILHOUETTE (Round Pixel Creature) ---
    // Outer Outline
    rect(7, 6, 10, 14, C.outline);
    rect(6, 7, 12, 12, C.outline);
    rect(5, 9, 14, 8, C.outline);

    // Body Fill
    rect(7, 7, 10, 12, C.body);
    rect(6, 8, 12, 10, C.body);
    rect(6, 9, 12, 8, C.body);

    // Body Highlights & Shadows
    rect(7, 7, 8, 1, C.bodyLight);
    rect(6, 8, 1, 6, C.bodyLight);
    rect(16, 9, 1, 7, C.bodyDark);
    rect(7, 17, 9, 1, C.bodyDark);

    // --- 3. INNER BELLY / FACE ---
    rect(8, 10, 8, 6, C.belly);
    rect(9, 9, 6, 8, C.belly);

    // --- 4. CHEEKS (Blush) ---
    rect(7, 13, 2, 1, C.cheek);
    rect(15, 13, 2, 1, C.cheek);

    // --- 5. EYES & EXPRESSION ---
    if (this.isBlinking || this.state === 'sleeping') {
      // Closed Line Eyes
      rect(8, 11, 2, 1, C.eye);
      rect(14, 11, 2, 1, C.eye);
    } else if (this.state === 'happy' || this.state === 'success') {
      // Happy Curve Eyes ^ ^
      px(8, 11, C.eye); px(9, 10, C.eye); px(10, 11, C.eye);
      px(13, 11, C.eye); px(14, 10, C.eye); px(15, 11, C.eye);
    } else if (this.state === 'confused') {
      // Confused o.O Eyes
      rect(8, 11, 2, 2, C.eye); px(8, 11, C.eyeGleam);
      rect(14, 11, 1, 1, C.eye);
    } else if (this.state === 'thinking') {
      // Looking up-right thinking
      rect(9, 10, 2, 2, C.eye); px(10, 10, C.eyeGleam);
      rect(14, 10, 2, 2, C.eye); px(15, 10, C.eyeGleam);
    } else {
      // Default / Listening / Responding Eyes
      rect(8, 11, 2, 2, C.eye); px(8, 11, C.eyeGleam);
      rect(14, 11, 2, 2, C.eye); px(14, 11, C.eyeGleam);
    }

    // --- 6. MOUTH ---
    if (this.state === 'responding') {
      // Talking animated mouth
      const mouthH = (this.tick % 8 < 4) ? 2 : 1;
      rect(11, 13, 2, mouthH, C.eye);
    } else if (this.state === 'happy' || this.state === 'success') {
      // Cute Smile
      px(11, 13, C.eye); px(12, 13, C.eye); px(10, 12, C.eye); px(13, 12, C.eye);
    } else if (this.state === 'confused') {
      // Small wavy mouth
      px(11, 13, C.eye); px(12, 14, C.eye);
    } else {
      // Gentle dot smile
      px(11, 13, C.eye); px(12, 13, C.eye);
    }

    // --- 7. LITTLE PIXEL HANDS ---
    if (this.state === 'listening' || this.state === 'happy') {
      // Raised hands
      rect(5, 11, 2, 2, C.body); rect(5, 11, 1, 1, C.bodyLight);
      rect(17, 11, 2, 2, C.body); rect(17, 11, 1, 1, C.bodyLight);
    } else {
      // Side hands resting
      rect(5, 13, 2, 2, C.body);
      rect(17, 13, 2, 2, C.body);
    }

    // --- 8. RENDER PARTICLES ---
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1.5, 1.5);
    });
    ctx.globalAlpha = 1.0;
  }
}

// Global Singleton Access
window.NoriCompanion = NoriCompanion;
