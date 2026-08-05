/**
 * ==========================================================================
 * AMBIENT AUTUMN LEAVES & AMBER PARTICLE ENVIRONMENT ENGINE
 * Inspired by Pinterest autumn leaves animation environment layout
 * ==========================================================================
 */

(function () {
  'use strict';

  const ParticlesEngine = {
    isEnabled: true,
    containerEl: null,

    init: function () {
      this.createContainer();
      if (this.isEnabled) {
        this.spawnLeaves();
      }
    },

    createContainer: function () {
      if (document.getElementById('ambient-leaves-container')) return;

      const container = document.createElement('div');
      container.id = 'ambient-leaves-container';
      container.className = 'ambient-leaves-container';
      document.body.appendChild(container);
      this.containerEl = container;
    },

    spawnLeaves: function () {
      if (!this.containerEl) return;
      this.containerEl.innerHTML = '';

      const leafSymbols = ['🍂', '🍁', '✨', '🍃', '🌟'];
      const totalLeaves = 18;

      for (let i = 0; i < totalLeaves; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'ambient-leaf';
        const symbol = leafSymbols[i % leafSymbols.length];
        leaf.innerText = symbol;

        const leftPos = Math.random() * 100;
        const duration = 8 + Math.random() * 12;
        const delay = Math.random() * 8;
        const size = 14 + Math.random() * 16;
        const opacity = 0.35 + Math.random() * 0.45;

        leaf.style.left = `${leftPos}vw`;
        leaf.style.animationDuration = `${duration}s`;
        leaf.style.animationDelay = `${delay}s`;
        leaf.style.fontSize = `${size}px`;
        leaf.style.opacity = opacity;

        this.containerEl.appendChild(leaf);
      }
    },

    toggle: function () {
      this.isEnabled = !this.isEnabled;
      if (this.containerEl) {
        this.containerEl.style.display = this.isEnabled ? 'block' : 'none';
      }
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      if (typeof showToast === 'function') {
        showToast(this.isEnabled ? '🍂 Ambient Leaf Particles Enabled' : '🍂 Leaf Particles Disabled');
      }
      return this.isEnabled;
    }
  };

  if (typeof window !== 'undefined') {
    window.ParticlesEngine = ParticlesEngine;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ParticlesEngine.init());
    } else {
      ParticlesEngine.init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticlesEngine;
  }
})();
