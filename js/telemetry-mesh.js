/**
 * ==========================================================================
 * CYBERNETIC NEURAL MESH & SPATIAL TELEMETRY HUD ENGINE
 * Inspired by futuristic cybernetic 3D coordinate vector overlay design
 * ==========================================================================
 */

(function () {
  'use strict';

  const TelemetryMeshEngine = {
    isEnabled: false,
    hudLayerEl: null,
    coordsLabelEl: null,
    reticleEl: null,

    init: function () {
      this.createHUDLayer();
      this.bindMouseTracking();
    },

    createHUDLayer: function () {
      if (document.getElementById('cybernetic-hud-layer')) return;

      const layer = document.createElement('div');
      layer.id = 'cybernetic-hud-layer';
      layer.className = 'cybernetic-hud-layer';
      layer.style.display = 'none';

      layer.innerHTML = `
        <div class="hud-grid-overlay"></div>
        <div id="hud-reticle" class="hud-reticle">
          <div class="reticle-box"></div>
          <div class="reticle-line-h"></div>
          <div class="reticle-line-v"></div>
          <span id="hud-coords-label" class="hud-coords-tag">x: 732 y: 424</span>
        </div>
        <div class="hud-status-badge">
          <span class="hud-dot pulsing"></span>
          <span>NEURAL MESH ACTIVE // 120 FPS</span>
        </div>
      `;

      document.body.appendChild(layer);
      this.hudLayerEl = layer;
      this.reticleEl = layer.querySelector('#hud-reticle');
      this.coordsLabelEl = layer.querySelector('#hud-coords-label');
    },

    bindMouseTracking: function () {
      document.addEventListener('mousemove', (e) => {
        if (!this.isEnabled || !this.reticleEl) return;
        const x = e.clientX;
        const y = e.clientY;

        this.reticleEl.style.transform = `translate3d(${x - 30}px, ${y - 30}px, 0)`;
        if (this.coordsLabelEl) {
          this.coordsLabelEl.innerText = `x: ${x} y: ${y}`;
        }
      });
    },

    toggle: function () {
      this.isEnabled = !this.isEnabled;
      if (this.hudLayerEl) {
        this.hudLayerEl.style.display = this.isEnabled ? 'block' : 'none';
      }
      if (typeof SoundEngine !== 'undefined') SoundEngine.playClick();
      if (typeof showToast === 'function') {
        showToast(this.isEnabled ? '🛰️ Cybernetic Telemetry HUD Active' : '🛰️ Telemetry HUD Disabled');
      }
      return this.isEnabled;
    }
  };

  window.TelemetryMeshEngine = TelemetryMeshEngine;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TelemetryMeshEngine.init());
  } else {
    TelemetryMeshEngine.init();
  }
})();
