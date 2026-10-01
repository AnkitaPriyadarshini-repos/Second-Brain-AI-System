/**
 * ==========================================================================
 * NORI SEAHARSE PIXEL COMPANION ENGINE
 * Cute Lavender Seahorse with Mouth Flash & Answer Beam Particle Stream
 * ==========================================================================
 */

class NoriCompanion {
  constructor(options = {}) {
    this.containerId = options.containerId || 'nori-companion-target';
    this.size = options.size || 180;
    this.compact = options.compact || false;
    this.state = 'idle'; // idle | listening | thinking | responding | happy | confused | success | sleeping
    this.tick = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.speechTimeout = null;
    this.particles = [];
    this.mouthBeamActive = false;
    this.mouthBeamTimer = 0;

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
        "Pondering your question...",
        "Searching your Second Brain notes...",
        "Synthesizing answer..."
      ],
      responding: [
        "Here comes your answer! ✨",
        "Watch this! ✨",
        "Flashing answer from Second Brain..."
      ],
      happy: [
        "I love exploring ideas together! ✨",
        "Awesome thought!",
        "Memory captured safely! 🧠"
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

    // Mouth Flash Glow Overlay
    this.mouthGlowEl = document.createElement('div');
    this.mouthGlowEl.className = 'nori-mouth-glow-beam';
    this.wrapper.appendChild(this.mouthGlowEl);

    // Canvas Element
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'nori-pixel-canvas';
    this.canvas.width = 36;
    this.canvas.height = 36;
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
    // Snout Mouth Origin Pixel (x: 10, y: 15)
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * 0.8;
      this.particles.push({
        x: 9,
        y: 15 + (Math.random() * 2 - 1),
        vx: -1.2 - Math.random() * 1.5,
        vy: Math.sin(angle) * 1.2 + (Math.random() - 0.5) * 0.8,
        alpha: 1.0,
        size: 1.5 + Math.random() * 2,
        color: ['#FF0F80', '#E9190F', '#FE4E00', '#E67F0D', '#FFAE03', '#FFFFFF'][Math.floor(Math.random() * 6)]
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

  onClickNori() {
    this.flashMouth(2000);
    this.setState('happy', 'Bubbles & knowledge! I\'m Nori the Seahorse.');
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
    if (this.blinkTimer > 150 + Math.random() * 130) {
      this.isBlinking = true;
      if (this.blinkTimer > 162 + Math.random() * 130) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Mouth Beam Timer
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
      p.alpha -= 0.02;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 36, 36);

    // Gentle Seahorse Wave Y Float Offset
    const floatY = Math.sin(this.tick * 0.04) * 1.2;
    const baseY = 3 + floatY;

    // Palette: User Color Swatch Palette (Lime Yellow #D6E85A, Mint Teal #8FD6D3, Coral Grapefruit #E85B4A)
    const C = {
      outline: '#0A1417',
      body: '#8FD6D3',        // Bright Mint Teal Aqua (#8FD6D3)
      bodyDark: '#62B4B1',    // Deep Mint Shadow
      bodyLight: '#C2FAF7',   // Highlight Mint Teal
      spots: '#E85B4A',       // Vibrant Coral Spots (#E85B4A)
      belly: '#D6E85A',       // Electric Lime Yellow (#D6E85A)
      bellyDark: '#B8CB38',   // Lime Segment Line
      cheek: '#E85B4A',       // Vibrant Coral Blush (#E85B4A)
      fin: '#E85B4A',         // Coral Fin
      finLight: '#D6E85A',
      snout: '#E85B4A',       // Snout Trumpet Mouth
      snoutHole: '#8E281C',
      eye: '#0A1417',         // Dark Glossy Eye
      eyeGleam: '#FFFFFF',
      beamGlow: '#D6E85A'     // Mouth Beam Glow
    };

    if (this.state === 'thinking') { C.body = '#D6E85A'; C.bodyLight = '#F0FC93'; }
    if (this.state === 'listening') { C.body = '#E85B4A'; C.bodyLight = '#FF8A7A'; }

    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), 1, 1);
    };

    const rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y + baseY), w, h);
    };

    // --- 1. BACK FIN RIDGE (Wavy Seahorse Crown & Dorsal Fin) ---
    // Crown Ridge on Head
    rect(18, 3, 6, 2, C.fin);
    rect(20, 2, 4, 2, C.finLight);
    rect(22, 1, 3, 2, C.outline);
    rect(17, 5, 8, 2, C.fin);

    // Dorsal Fin on Back
    rect(24, 13, 4, 8, C.fin);
    rect(26, 12, 3, 10, C.finLight);
    rect(27, 14, 2, 6, C.spots);

    // --- 2. SEAHARSE HEAD & BODY SILHOUETTE ---
    // Head Rounding
    rect(13, 5, 10, 10, C.outline);
    rect(14, 4, 8, 12, C.body);
    rect(13, 5, 10, 10, C.body);
    rect(14, 5, 6, 3, C.bodyLight);

    // --- 3. SNOUT TRUMPET MOUTH (Pointing Left) ---
    rect(7, 13, 7, 5, C.outline);
    rect(8, 14, 6, 3, C.snout);
    rect(7, 14, 2, 3, C.snoutHole); // Trumpet mouth opening!

    // Glowing effect on mouth if flashing beam!
    if (this.mouthBeamActive) {
      const beamCol = (this.tick % 6 < 3) ? '#A7F3D0' : '#FFFFFF';
      rect(5, 13, 3, 5, beamCol);
      px(4, 15, '#F472B6');
      px(4, 14, '#38BDF8');
    }

    // --- 4. S-CURVED BODY & CURLY TAIL ---
    // Upper Neck & Chest
    rect(14, 13, 9, 8, C.body);
    rect(13, 14, 9, 7, C.body);
    
    // Segmented Mint Green Belly (Curved Front)
    rect(12, 14, 4, 8, C.belly);
    rect(13, 15, 3, 7, C.belly);
    // Mint belly horizontal segment lines
    px(13, 16, C.bellyDark); px(14, 16, C.bellyDark);
    px(13, 18, C.bellyDark); px(14, 18, C.bellyDark);
    px(13, 20, C.bellyDark); px(14, 20, C.bellyDark);

    // Lower Body & Spiral Tail
    rect(15, 20, 8, 6, C.body);
    rect(14, 23, 7, 5, C.body);
    rect(12, 26, 6, 4, C.body);
    rect(10, 27, 5, 4, C.body);
    // Tail Spiral Curl
    rect(9, 25, 4, 3, C.body);
    rect(11, 24, 3, 2, C.bodyDark);

    // Lavender Spots on Back
    px(21, 8, C.spots); px(22, 9, C.spots);
    px(20, 16, C.spots); px(21, 17, C.spots);
    px(18, 22, C.spots); px(17, 25, C.spots);
    px(12, 28, C.spots);

    // --- 5. CHEEKS (Rosy Pink) ---
    rect(16, 13, 3, 2, C.cheek);

    // --- 6. BIG SPARKLING GLOSSY EYE ---
    if (this.isBlinking || this.state === 'sleeping') {
      // Curved Line Eye
      rect(15, 10, 3, 1, C.eye);
    } else if (this.state === 'happy') {
      // Happy Curve Eye ^
      px(15, 10, C.eye); px(16, 9, C.eye); px(17, 10, C.eye);
    } else {
      // Chibi Eye with Double White Sparkle Gleam
      rect(15, 9, 4, 4, C.eye);
      px(15, 9, C.eyeGleam); px(16, 9, C.eyeGleam);
      px(16, 10, C.eyeGleam);
    }

    // --- 7. CUTE SNOUT SMILE ---
    px(13, 15, C.eye); px(14, 15, C.eye);

    // --- 8. RENDER MOUTH BEAM PARTICLES ---
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }
}

// Global Singleton Access
window.NoriCompanion = NoriCompanion;
