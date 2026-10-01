/**
 * ==========================================================================
 * NORI PIXEL COMPANION ENGINE
 * Original Cute Expressive Pixel Mascot for Second Brain AI
 * ==========================================================================
 */

class NoriCompanion {
  constructor(options = {}) {
    this.containerId = options.containerId || 'nori-companion-target';
    this.size = options.size || 160;
    this.compact = options.compact || false;
    this.state = 'idle'; // idle | listening | thinking | responding | happy | confused | success | sleeping
    this.tick = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.speechTimeout = null;
    this.particles = [];

    this.phrases = {
      idle: [
        "Hey! What are we working on today?",
        "I'm ready to help you think!",
        "Your Second Brain is synced and ready.",
        "Got an idea? Let's talk about it!"
      ],
      listening: [
        "Listening closely...",
        "Tell me more!",
        "Taking note..."
      ],
      thinking: [
        "Thinking through this...",
        "Searching your Second Brain...",
        "Connecting your notes..."
      ],
      responding: [
        "Here is what I found!",
        "Let me explain this simply.",
        "Here's my thought..."
      ],
      happy: [
        "I love working together! ✨",
        "Awesome idea!",
        "Memory stored safely! 🧠"
      ],
      success: [
        "Saved to your Second Brain! 🧠",
        "Thought stored cleanly!"
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
    this.canvas.width = 32;
    this.canvas.height = 32;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);

    // Interactivity
    this.wrapper.addEventListener('click', () => this.onClickNori());

    // Start Render Loop
    this.loop();
  }

  setState(newState, customSpeech = null) {
    if (this.state === newState && !customSpeech) return;
    this.state = newState;

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
    this.spawnSparkles(8);
    this.setState('happy', 'Hey! I\'m Nori, your AI friend.');
    setTimeout(() => {
      if (this.state === 'happy') this.setState('idle');
    }, 4000);
  }

  spawnSparkles(count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 16 + (Math.random() * 12 - 6),
        y: 12 + (Math.random() * 12 - 6),
        vx: (Math.random() - 0.5) * 1.0,
        vy: -0.8 - Math.random() * 1.0,
        alpha: 1.0,
        color: ['#FF8A80', '#FFB74D', '#81D4FA', '#F48FB1'][Math.floor(Math.random() * 4)]
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
    if (this.blinkTimer > 160 + Math.random() * 140) {
      this.isBlinking = true;
      if (this.blinkTimer > 172 + Math.random() * 140) {
        this.isBlinking = false;
        this.blinkTimer = 0;
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

    if (this.state === 'thinking' && this.tick % 12 === 0) {
      this.particles.push({
        x: 22 + (Math.random() * 6 - 3),
        y: 8 + (Math.random() * 6 - 3),
        vx: 0.15,
        vy: -0.5,
        alpha: 0.9,
        color: '#FFB74D'
      });
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 32, 32);

    // Cute Gentle Float Wave Y Offset
    const floatY = Math.sin(this.tick * 0.05) * 1.0;
    const baseY = 4 + floatY;

    // Palette: Soft Cute Coral Peach Flame Buddy with Rosy Scarf
    const C = {
      outline: '#1E1B2E',
      body: '#FFB09C',         // Soft Cute Warm Peach Coral
      bodyDark: '#E07A65',     // Cozy Shadow Coral
      bodyLight: '#FFD4C8',    // Cute Highlight Soft Peach
      tipLight: '#FFE8DF',     // Top Sprout Soft Light
      belly: '#FFF5F2',        // White Soft Cream Belly
      cheek: '#FF6B8B',        // Rosy Pink Blush
      scarf: '#6C5CE7',        // Cute Soft Violet Bandana Scarf
      scarfDark: '#5345C5',
      eye: '#1E1B2E',          // Dark Cute Eyes
      eyeGleam: '#FFFFFF',
      spark: '#FFD166'         // Sparkle Yellow
    };

    if (this.state === 'thinking') { C.body = '#C084FC'; C.bodyDark = '#9333EA'; C.bodyLight = '#E9D5FF'; }
    if (this.state === 'listening') { C.body = '#4ADE80'; C.bodyDark = '#16A34A'; C.bodyLight = '#BBF7D0'; }
    if (this.state === 'happy' || this.state === 'success') { C.body = '#FF9999'; C.scarf = '#EC4899'; }

    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), 1, 1);
    };

    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), w, h);
    };

    // --- 1. TOP CUTE HEAD SPROUT / TIP (Soft Drop Shape) ---
    rect(15, 2, 2, 2, C.outline);
    rect(15, 3, 2, 1, C.tipLight);
    rect(14, 4, 4, 2, C.outline);
    rect(14, 4, 4, 1, C.bodyLight);

    // --- 2. CUTE CHIBI ROUND BODY SILHOUETTE ---
    // Outer Outline
    rect(11, 6, 10, 18, C.outline);
    rect(9, 8, 14, 15, C.outline);
    rect(8, 10, 16, 12, C.outline);
    rect(7, 12, 18, 9, C.outline);

    // Body Fill
    rect(11, 6, 10, 17, C.body);
    rect(9, 8, 14, 14, C.body);
    rect(8, 10, 16, 11, C.body);
    rect(8, 12, 16, 8, C.body);

    // Body Highlights & Soft Shading
    rect(11, 6, 8, 1, C.bodyLight);
    rect(9, 8, 3, 10, C.bodyLight);
    rect(22, 11, 2, 10, C.bodyDark);
    rect(10, 22, 12, 1, C.bodyDark);

    // --- 3. INNER CREAM FACE / BELLY ---
    rect(11, 12, 10, 9, C.belly);
    rect(12, 11, 8, 11, C.belly);

    // --- 4. ROSY CHEEKS ---
    rect(9, 16, 3, 2, C.cheek);
    rect(20, 16, 3, 2, C.cheek);

    // --- 5. ADORABLE BIG GLOSSY EYES ---
    if (this.isBlinking || this.state === 'sleeping') {
      // Curved Closed Line Eyes
      rect(11, 14, 3, 1, C.eye);
      rect(18, 14, 3, 1, C.eye);
    } else if (this.state === 'happy' || this.state === 'success') {
      // Cute Happy Eyes ^ ^
      px(11, 14, C.eye); px(12, 13, C.eye); px(13, 14, C.eye);
      px(18, 14, C.eye); px(19, 13, C.eye); px(20, 14, C.eye);
    } else if (this.state === 'thinking') {
      // Looking up-right thinking
      rect(12, 13, 3, 3, C.eye);
      px(13, 13, C.eyeGleam); px(14, 14, C.eyeGleam);
      rect(19, 13, 3, 3, C.eye);
      px(20, 13, C.eyeGleam); px(21, 14, C.eyeGleam);
    } else {
      // Big Chibi Glossy Eyes with double gleam dots
      rect(11, 13, 3, 4, C.eye);
      px(11, 13, C.eyeGleam); px(12, 13, C.eyeGleam); px(12, 14, C.eyeGleam);

      rect(18, 13, 3, 4, C.eye);
      px(18, 13, C.eyeGleam); px(19, 13, C.eyeGleam); px(19, 14, C.eyeGleam);
    }

    // --- 6. CUTE MOUTH ---
    if (this.state === 'responding') {
      const mouthH = (this.tick % 8 < 4) ? 3 : 1;
      rect(15, 17, 2, mouthH, C.eye);
    } else if (this.state === 'happy' || this.state === 'success') {
      // Open Happy Smile
      px(15, 17, C.eye); px(16, 17, C.eye); px(14, 16, C.eye); px(17, 16, C.eye);
    } else {
      // Cute Small Wavy Dot Smile
      px(15, 17, C.eye); px(16, 17, C.eye);
    }

    // --- 7. BANDANA SCARF AROUND NECK ---
    rect(9, 20, 14, 2, C.scarf);
    rect(10, 21, 12, 1, C.scarfDark);
    // Cute Scarf Knot / Tail
    rect(19, 21, 3, 3, C.scarf);
    rect(20, 23, 2, 2, C.scarfDark);

    // --- 8. LITTLE CHIBI HANDS ---
    if (this.state === 'listening' || this.state === 'happy') {
      // Raised little paws
      rect(7, 15, 2, 3, C.body); rect(7, 15, 1, 1, C.bodyLight);
      rect(23, 15, 2, 3, C.body); rect(23, 15, 1, 1, C.bodyLight);
    } else {
      // Side little paws
      rect(7, 17, 2, 3, C.body);
      rect(23, 17, 2, 3, C.body);
    }

    // --- 9. RENDER PARTICLES ---
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1.8, 1.8);
    });
    ctx.globalAlpha = 1.0;
  }
}

// Global Singleton Access
window.NoriCompanion = NoriCompanion;
