/**
 * ==========================================================================
 * TUFY / NORI COMPANION CANVAS ENGINE
 * Cute Soft Peach-Pink Droplet Mascot wearing Royal Blue Scarf
 * Features Mouth Flash Particle Stream when answers are generated.
 * ==========================================================================
 */

class NoriCompanion {
  constructor(options = {}) {
    this.containerId = options.containerId || 'nori-companion-target';
    this.size = options.size || 180;
    this.compact = options.compact || false;
    this.state = 'idle'; // idle | listening | thinking | responding | happy
    this.tick = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.speechTimeout = null;
    this.particles = [];
    this.mouthBeamActive = false;
    this.mouthBeamTimer = 0;

    this.phrases = {
      idle: [
        "Hey! I'm Tufy. How can I help you today?",
        "Ready to work through your code step by step!",
        "Your Second Brain is active and synced.",
        "Got a question? Ask me anything!"
      ],
      listening: [
        "Listening closely...",
        "Tell me more!",
        "Gathering context..."
      ],
      thinking: [
        "Analyzing code context...",
        "Searching Second Brain notes...",
        "Synthesizing answer..."
      ],
      responding: [
        "Here's your answer! ✨",
        "Watch this! ✨",
        "Flashing answer from Second Brain..."
      ],
      happy: [
        "I love exploring code and notes with you! ✨",
        "Awesome idea!",
        "Knowledge captured! 🧠"
      ]
    };

    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    // Reuse existing wrapper if pre-rendered in HTML, or create one
    let existingWrapper = this.container.querySelector('.nori-canvas-wrapper');
    if (existingWrapper) {
      this.wrapper = existingWrapper;
    } else {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'nori-canvas-wrapper';
      this.container.appendChild(this.wrapper);
    }

    // Speech Bubble
    if (!this.wrapper.querySelector('.nori-speech-bubble')) {
      this.speechBubble = document.createElement('div');
      this.speechBubble.className = 'nori-speech-bubble';
      this.wrapper.appendChild(this.speechBubble);
    } else {
      this.speechBubble = this.wrapper.querySelector('.nori-speech-bubble');
    }

    // Mouth Flash Glow Overlay
    if (!this.wrapper.querySelector('.nori-mouth-glow-beam')) {
      this.mouthGlowEl = document.createElement('div');
      this.mouthGlowEl.className = 'nori-mouth-glow-beam';
      this.wrapper.appendChild(this.mouthGlowEl);
    } else {
      this.mouthGlowEl = this.wrapper.querySelector('.nori-mouth-glow-beam');
    }

    // Canvas Element Overlay for Particles & Expressions
    if (!this.wrapper.querySelector('canvas.nori-pixel-canvas')) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'nori-pixel-canvas' + (this.compact ? ' compact-canvas' : '');
      this.canvas.width = 36;
      this.canvas.height = 36;
      this.ctx = this.canvas.getContext('2d');
      if (this.ctx) this.ctx.imageSmoothingEnabled = false;

      // If SVG exists, overlay canvas on top of SVG
      const svg = this.wrapper.querySelector('svg');
      if (svg) {
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
      }

      this.wrapper.appendChild(this.canvas);
    } else {
      this.canvas = this.wrapper.querySelector('canvas.nori-pixel-canvas');
      if (this.canvas) this.ctx = this.canvas.getContext('2d');
    }

    // Click Interactivity
    this.wrapper.addEventListener('click', () => this.onClickTufy());

    // Start Render Loop
    this.loop();
  }

  setState(newState, customSpeech = null) {
    if (this.state === newState && !customSpeech) return;
    this.state = newState;

    if (newState === 'responding' || newState === 'thinking') {
      this.flashMouth(2500);
    }

    if (customSpeech) {
      this.say(customSpeech);
    } else if (newState === 'happy') {
      const list = this.phrases[newState];
      const p = list[Math.floor(Math.random() * list.length)];
      this.say(p);
    }
  }

  flashMouth(duration = 2500) {
    this.mouthBeamActive = true;
    this.mouthBeamTimer = duration;
    if (this.mouthGlowEl) {
      this.mouthGlowEl.classList.add('active');
    }
    this.spawnMouthParticles(25);
  }

  spawnMouthParticles(count = 15) {
    // Mouth origin (x: 17, y: 16)
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * 1.2;
      this.particles.push({
        x: 17,
        y: 16 + (Math.random() * 2 - 1),
        vx: (Math.random() - 0.5) * 2.2,
        vy: -0.8 - Math.random() * 1.5,
        alpha: 1.0,
        size: 1.2 + Math.random() * 2,
        color: ['#FF6584', '#3B82F6', '#60A5FA', '#FFB6C1', '#FFFFFF'][Math.floor(Math.random() * 5)]
      });
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

  onClickTufy() {
    this.flashMouth(2000);
    this.setState('happy', 'Hey! I\'m Tufy your personal companion.');
  }

  loop() {
    this.tick++;
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    // Blinking
    this.blinkTimer++;
    if (this.blinkTimer > 160 + Math.random() * 120) {
      this.isBlinking = true;
      if (this.blinkTimer > 172 + Math.random() * 120) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Mouth Flash Timer
    if (this.mouthBeamActive) {
      this.mouthBeamTimer -= 16;
      if (this.tick % 3 === 0) {
        this.spawnMouthParticles(2);
      }
      if (this.mouthBeamTimer <= 0) {
        this.mouthBeamActive = false;
        if (this.mouthGlowEl) this.mouthGlowEl.classList.remove('active');
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 36, 36);

    // Floating animation
    const floatY = Math.sin(this.tick * 0.05) * 1.2;
    const baseY = 3 + floatY;

    // Palette for Tufy: Cute Peach-Pink Droplet with Blue Scarf
    const C = {
      outline: '#3B2229',
      body: '#FFAEC1',
      bodyLight: '#FFE2E8',
      bodyDark: '#E5889C',
      cheek: '#FF6584',
      scarf: '#4361EE',
      scarfDark: '#2B37A0',
      scarfText: '#FFFFFF',
      eye: '#1C1014',
      eyeGleam: '#FFFFFF',
      beamGlow: '#FF6584'
    };

    if (this.state === 'thinking') { C.body = '#FFC2D1'; C.bodyLight = '#FFF0F5'; }
    if (this.state === 'listening') { C.body = '#FF9ebb'; C.bodyLight = '#FFC2D1'; }

    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), 1, 1);
    };

    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), w, h);
    };

    // --- 1. TOP FLAME / DROPLET TIP ---
    px(17, 1, C.bodyLight); px(18, 1, C.bodyLight);
    rect(16, 2, 4, 2, C.bodyLight);
    rect(15, 4, 6, 2, C.body);
    rect(14, 6, 8, 2, C.body);

    // --- 2. SIDE ROUND EARS ---
    rect(8, 12, 3, 4, C.bodyDark);
    rect(25, 12, 3, 4, C.bodyDark);

    // --- 3. MAIN CUTE ROUNDED HEAD & CHEEKS ---
    rect(11, 8, 14, 11, C.body);
    rect(10, 10, 16, 8, C.body);
    rect(12, 7, 12, 2, C.bodyLight);

    // Forehead highlight
    rect(15, 7, 6, 2, C.bodyLight);

    // --- 4. FACIAL FEATURES ---
    // Left Eye
    if (this.isBlinking) {
      rect(13, 12, 3, 1, C.eye);
    } else if (this.state === 'happy') {
      px(13, 13, C.eye); px(14, 12, C.eye); px(15, 13, C.eye);
    } else {
      rect(13, 11, 3, 4, C.eye);
      px(13, 11, C.eyeGleam);
    }

    // Right Eye
    if (this.isBlinking) {
      rect(20, 12, 3, 1, C.eye);
    } else if (this.state === 'happy') {
      px(20, 13, C.eye); px(21, 12, C.eye); px(22, 13, C.eye);
    } else {
      rect(20, 11, 3, 4, C.eye);
      px(20, 11, C.eyeGleam);
    }

    // Rosy Pink Blush Cheeks
    rect(11, 15, 3, 2, C.cheek);
    rect(22, 15, 3, 2, C.cheek);

    // Sweet Smile Mouth
    px(17, 16, C.eye); px(18, 16, C.eye);
    px(16, 15, C.eye); px(19, 15, C.eye);

    // Glowing Mouth Flash Beam Effect
    if (this.mouthBeamActive) {
      const beamCol = (this.tick % 4 < 2) ? '#FFFFFF' : '#FF6584';
      rect(16, 15, 4, 3, beamCol);
    }

    // --- 5. ROYAL BLUE SCARF / BANDANA ---
    rect(11, 19, 14, 3, C.scarf);
    rect(12, 21, 12, 1, C.scarfDark);
    // Scarf knot & hanging tail
    rect(17, 22, 3, 3, C.scarf);
    px(18, 23, C.scarfDark);
    // White text detail "Tufy" on scarf
    px(13, 20, C.scarfText);
    px(15, 20, C.scarfText);
    px(20, 20, C.scarfText);
    px(22, 20, C.scarfText);

    // --- 6. CUTE LOWER BODY & STUBBY ARMS ---
    // Body
    rect(13, 22, 10, 6, C.body);
    rect(14, 28, 8, 2, C.bodyDark);
    
    // Stubby Arms
    rect(9, 21, 3, 3, C.body);
    rect(24, 21, 3, 3, C.body);

    // --- 7. MOUTH FLASH BEAM PARTICLES ---
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillRect(Math.round(p.x), Math.round(p.y + baseY), p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }
}

// Global Singleton Access (Supporting MochiCompanion, TufyCompanion and NoriCompanion for 100% backward compatibility)
window.MochiCompanion = NoriCompanion;
window.NoriCompanion = NoriCompanion;
window.TufyCompanion = NoriCompanion;
