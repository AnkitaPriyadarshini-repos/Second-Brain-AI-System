/**
 * Second Brain AI System — Gemini Color Flow Engine
 * Dynamic, fluid mesh color-changing gradient backdrop engine with state reactivity
 */

(function (global) {
  'use strict';

  const GeminiColorFlowEngine = {
    canvas: null,
    ctx: null,
    animId: null,
    theme: 'aqua-aesthetic', // 'aqua-aesthetic' | 'summer-ocean' | 'golden-harmony'
    speedPreset: 'swift',  // 'gentle' | 'swift' | 'hyper'
    speedMultiplier: 1.2,
    currentState: 'idle',  // 'idle' | 'listening' | 'thinking' | 'responding'
    stateIntensity: 1.0,
    time: 0,

    nodes: [],

    // Color palettes for different themes tailored for Second Brain Aqua Aesthetic
    palettes: {
      'aqua-aesthetic': [
        { r: 6,   g: 182, b: 212, a: 0.85 }, // #06B6D4 Electric Aqua Cyan
        { r: 0,   g: 242, b: 254, a: 0.90 }, // #00F2FE Neon Cyan
        { r: 34,  g: 211, b: 238, a: 0.80 }, // #22D3EE Turquoise Aqua
        { r: 56,  g: 189, b: 248, a: 0.75 }, // #38BDF8 Sky Cyan
        { r: 236, g: 254, b: 255, a: 0.95 }  // #ECFEFF Ice Aqua Platinum
      ],
      'golden-harmony': [
        { r: 255, g: 225, b: 86,  a: 0.60 }, // #FFE156 (Light bright lemon yellow)
        { r: 255, g: 217, b: 61,  a: 0.65 }, // #FFD93D (Warm cheerful yellow)
        { r: 251, g: 192, b: 45,  a: 0.70 }, // #FBC02D (Vibrant golden yellow)
        { r: 255, g: 179, b: 0,   a: 0.65 }, // #FFB300 (Warm amber yellow)
        { r: 255, g: 160, b: 0,   a: 0.60 }  // #FFA000 (Golden sunrise orange yellow)
      ],
      'sunflower-sunrise': [
        { r: 255, g: 245, b: 157, a: 0.85 }, // #FFF59D (Light Morning Yellow)
        { r: 255, g: 227, b: 110, a: 0.90 }, // #FFE36E (Warm Canary Yellow)
        { r: 255, g: 209, b: 64,  a: 0.95 }, // #FFD140 (Golden Sunflower Accent)
        { r: 255, g: 190, b: 0,   a: 0.85 }, // #FFBE00 (Deep Amber Gold)
        { r: 255, g: 173, b: 1,   a: 0.80 }, // #FFAD01 (Vibrant Amber Orange)
        { r: 255, g: 160, b: 0,   a: 0.90 }  // #FFA000 (Rich Sunflower Sunrise Orange)
      ],
      'gold-glassmorphism': [
        { r: 255, g: 245, b: 157, a: 0.85 },
        { r: 255, g: 209, b: 64,  a: 0.90 },
        { r: 255, g: 190, b: 0,   a: 0.95 },
        { r: 255, g: 160, b: 0,   a: 0.80 },
        { r: 242, g: 230, b: 198, a: 1.00 }
      ],
      'atlassian-azure': [
        { r: 245, g: 176, b: 65,  a: 0.85 }, // Warm 3D Amber Orb Core
        { r: 214, g: 137, b: 16,  a: 0.90 }, // Rich Golden Sphere Shadow
        { r: 255, g: 230, b: 153, a: 0.95 }, // Specular Gold Highlight
        { r: 230, g: 126, b: 34,  a: 0.80 }, // Warm Amber Glow
        { r: 242, g: 230, b: 198, a: 1.00 }  // Warm Golden Champagne Canvas
      ],
      'royal-gold': [
        { r: 245, g: 176, b: 65,  a: 0.85 }, // Warm 3D Amber Orb Core
        { r: 214, g: 137, b: 16,  a: 0.90 }, // Rich Golden Sphere Shadow
        { r: 255, g: 230, b: 153, a: 0.95 }, // Specular Gold Highlight
        { r: 230, g: 126, b: 34,  a: 0.80 }, // Warm Amber Glow
        { r: 242, g: 230, b: 198, a: 1.00 }  // Warm Golden Champagne Canvas
      ],
      'emerald-luxe': [
        { r: 245, g: 176, b: 65,  a: 0.85 },
        { r: 214, g: 137, b: 16,  a: 0.90 },
        { r: 255, g: 230, b: 153, a: 0.95 },
        { r: 230, g: 126, b: 34,  a: 0.80 },
        { r: 242, g: 230, b: 198, a: 1.00 }
      ],
      'sapphire-platinum': [
        { r: 245, g: 176, b: 65,  a: 0.85 },
        { r: 214, g: 137, b: 16,  a: 0.90 },
        { r: 255, g: 230, b: 153, a: 0.95 },
        { r: 230, g: 126, b: 34,  a: 0.80 },
        { r: 242, g: 230, b: 198, a: 1.00 }
      ],
      'platinum-gold': [
        { r: 245, g: 158, b: 11,  a: 0.35 }, // Bright Amber Gold
        { r: 217, g: 119, b: 6,   a: 0.35 }, // Champagne Glow
        { r: 124, g: 58,  b: 237, a: 0.25 }, // Royal Violet Accent
        { r: 234, g: 179, b: 8,   a: 0.30 }, // Light Sparkle
        { r: 248, g: 250, b: 252, a: 0.50 }  // Ivory Light Shadow
      ],
      'gemini-light': [
        { r: 66,  g: 133, b: 244, a: 0.15 }, // Subtle Blue Glow
        { r: 155, g: 81,  b: 224, a: 0.15 }, // Subtle Purple Glow
        { r: 245, g: 158, b: 11,  a: 0.15 }, // Subtle Amber Accent
        { r: 30,  g: 41,  b: 59,  a: 0.50 }, // Dark Slate Shadow
        { r: 233, g: 30,  b: 99,  a: 0.15 }, // Pink accent
        { r: 16,  g: 185, b: 129, a: 0.15 }  // Emerald accent
      ],
      'gemini-dark': [
        { r: 245, g: 158, b: 11,  a: 0.35 }, // Golden Moon Glow
        { r: 217, g: 119, b: 6,   a: 0.40 }, // Warm Amber Core
        { r: 234, g: 179, b: 8,   a: 0.30 }, // Royal Yellow Aura
        { r: 30,  g: 41,  b: 59,  a: 0.50 }, // Slate Obsidian Shadow
        { r: 250, g: 204, b: 21,  a: 0.25 }  // Moonlight Spark
      ],
      'obsidian': [
        { r: 245, g: 158, b: 11,  a: 0.25 },
        { r: 30,  g: 41,  b: 59,  a: 0.60 },
        { r: 15,  g: 23,  b: 42,  a: 0.80 },
        { r: 217, g: 119, b: 6,   a: 0.30 }
      ]
    },

    /**
     * Initializes the canvas and nodes
     * @param {HTMLCanvasElement|string} canvasSelector 
     */
    init: function (canvasSelector) {
      if (typeof window === 'undefined') return;

      this.canvas = typeof canvasSelector === 'string' 
        ? document.querySelector(canvasSelector) 
        : canvasSelector;

      if (!this.canvas) {
        this.createFallbackCanvas();
      }

      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }

      this.initNodes();
      this.start();
    },

    createFallbackCanvas: function () {
      if (typeof document === 'undefined') return;
      let existing = document.getElementById('gemini-flow-canvas');
      if (existing) {
        this.canvas = existing;
        return;
      }
      const c = document.createElement('canvas');
      c.id = 'gemini-flow-canvas';
      c.style.position = 'fixed';
      c.style.top = '0';
      c.style.left = '0';
      c.style.width = '100vw';
      c.style.height = '100vh';
      c.style.zIndex = '-2';
      c.style.pointerEvents = 'none';
      document.body.prepend(c);
      this.canvas = c;
    },

    initNodes: function () {
      const palette = this.palettes[this.theme] || this.palettes['gemini-light'];
      this.nodes = palette.map((color, idx) => {
        return {
          baseX: (0.15 + (idx * 0.16)) % 1.0,
          baseY: (0.10 + (idx * 0.22)) % 1.0,
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          phase: idx * (Math.PI / 3),
          radiusRatio: 0.35 + (idx % 3) * 0.12,
          color: { ...color }
        };
      });
    },

    lastFrameTime: 0,
    fpsInterval: 1000 / 30, // Throttle background canvas to 30 FPS for max performance

    resize: function () {
      if (!this.canvas) return;
      // Performance Optimization: Downscale canvas size for 90% GPU load reduction
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      this.canvas.width = Math.max(Math.floor(window.innerWidth * scale), 320);
      this.canvas.height = Math.max(Math.floor(window.innerHeight * scale), 240);
    },

    setTheme: function (newTheme) {
      if (!this.palettes[newTheme]) return;
      this.theme = newTheme;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      this.initNodes();
    },

    setThemePalette: function (newTheme) {
      this.setTheme(newTheme);
    },

    setSpeed: function (preset) {
      this.speedPreset = preset;
      if (preset === 'gentle') this.speedMultiplier = 0.6;
      else if (preset === 'swift') this.speedMultiplier = 1.3;
      else if (preset === 'hyper') this.speedMultiplier = 2.8;
    },

    triggerState: function (state, duration = 3000) {
      this.currentState = state;
      if (state === 'listening') {
        this.stateIntensity = 2.2;
      } else if (state === 'thinking') {
        this.stateIntensity = 3.0;
      } else if (state === 'responding') {
        this.stateIntensity = 1.8;
      } else {
        this.stateIntensity = 1.0;
      }

      if (duration > 0) {
        setTimeout(() => {
          this.currentState = 'idle';
          this.stateIntensity = 1.0;
        }, duration);
      }
    },

    start: function () {
      if (this.animId) cancelAnimationFrame(this.animId);
      
      // Auto-pause when tab is inactive to save battery and CPU
      if (typeof document !== 'undefined' && !this.visibilityListenerAdded) {
        this.visibilityListenerAdded = true;
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else {
            this.start();
          }
        });
      }

      const renderStep = (timestamp) => {
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const elapsed = timestamp - this.lastFrameTime;

        if (elapsed > this.fpsInterval) {
          this.lastFrameTime = timestamp - (elapsed % this.fpsInterval);
          this.render();
        }

        if (typeof window !== 'undefined' && !document.hidden) {
          this.animId = requestAnimationFrame(renderStep);
        }
      };
      renderStep(performance.now());
    },

    stop: function () {
      if (this.animId && typeof window !== 'undefined') {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    },

    render: function () {
      if (!this.ctx || !this.canvas) return;

      const width = this.canvas.width;
      const height = this.canvas.height;
      const ctx = this.ctx;

      const effectiveSpeed = 0.008 * this.speedMultiplier * this.stateIntensity;
      this.time += effectiveSpeed;

      // Base background color depending on theme
      if (this.theme === 'obsidian' || this.theme === 'gemini-dark') {
        ctx.fillStyle = '#0d1018';
        ctx.globalCompositeOperation = 'screen';
      } else {
        ctx.fillStyle = '#FFF8E1'; // Golden Harmony Luminous Yellow Canvas
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillRect(0, 0, width, height);

      // Render blended floating radial gradient nodes
      const maxDim = Math.max(width, height);

      this.nodes.forEach((node, i) => {
        const sineOffsetX = Math.sin(this.time + node.phase) * 0.22 * maxDim;
        const cosineOffsetY = Math.cos(this.time * 0.8 + node.phase) * 0.20 * maxDim;

        const x = (node.baseX * width) + sineOffsetX;
        const y = (node.baseY * height) + cosineOffsetY;
        const radius = node.radiusRatio * maxDim * (1 + Math.sin(this.time * 1.5 + i) * 0.15);

        const radGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const { r, g, b, a } = node.color;
        const dynamicAlpha = Math.min(1.0, a * (0.85 + Math.sin(this.time * 2 + i) * 0.15));

        radGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dynamicAlpha})`);
        radGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${dynamicAlpha * 0.4})`);
        radGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiColorFlowEngine;
  } else {
    global.GeminiColorFlowEngine = GeminiColorFlowEngine;
  }

})(typeof window !== 'undefined' ? window : this);
