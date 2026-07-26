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
    theme: 'gemini-light', // 'gemini-light' | 'gemini-dark' | 'obsidian'
    speedPreset: 'swift',  // 'gentle' | 'swift' | 'hyper'
    speedMultiplier: 1.2,
    currentState: 'idle',  // 'idle' | 'listening' | 'thinking' | 'responding'
    stateIntensity: 1.0,
    time: 0,

    nodes: [],

    // Color palettes for different themes
    palettes: {
      'gemini-light': [
        { r: 167, g: 243, b: 208, a: 0.75 }, // Mint Green (#a7f3d0)
        { r: 165, g: 243, b: 252, a: 0.80 }, // Cyan Aqua (#a5f3fc)
        { r: 147, g: 197, b: 253, a: 0.70 }, // Soft Sky Blue (#93c5fd)
        { r: 221, g: 214, b: 254, a: 0.65 }, // Lavender Violet (#ddd6fe)
        { r: 252, g: 231, b: 243, a: 0.60 }, // Soft Rose (#fce7f3)
        { r: 110, g: 231, b: 183, a: 0.70 }  // Soft Emerald (#6ee7b7)
      ],
      'gemini-dark': [
        { r: 6,   g: 182, b: 212, a: 0.45 }, // Cyan Neon
        { r: 99,  g: 102, b: 241, a: 0.50 }, // Indigo Glow
        { r: 139, g: 92,  b: 246, a: 0.45 }, // Violet Aura
        { r: 16,  g: 185, b: 129, a: 0.40 }, // Emerald Spark
        { r: 236, g: 72,  b: 153, a: 0.35 }, // Pink Pulsar
        { r: 59,  g: 130, b: 246, a: 0.40 }  // Deep Blue
      ],
      'obsidian': [
        { r: 30,  g: 41,  b: 59,  a: 0.30 },
        { r: 79,  g: 70,  b: 229, a: 0.25 },
        { r: 124, g: 58,  b: 237, a: 0.25 },
        { r: 15,  g: 23,  b: 42,  a: 0.40 }
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

    resize: function () {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    },

    setTheme: function (newTheme) {
      if (!this.palettes[newTheme]) return;
      this.theme = newTheme;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      this.initNodes();
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
      const renderStep = () => {
        this.render();
        if (typeof window !== 'undefined') {
          this.animId = requestAnimationFrame(renderStep);
        }
      };
      renderStep();
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
      if (this.theme === 'gemini-light') {
        ctx.fillStyle = '#f8fafc';
      } else if (this.theme === 'gemini-dark') {
        ctx.fillStyle = '#070a12';
      } else {
        ctx.fillStyle = '#04060a';
      }
      ctx.fillRect(0, 0, width, height);

      // Render blended floating radial gradient nodes
      const maxDim = Math.max(width, height);

      ctx.globalCompositeOperation = this.theme === 'gemini-light' ? 'multiply' : 'screen';

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
