/**
 * Second Brain AI System — Developer Telemetry & Human Engineering HUD
 * Manages live vector latency telemetry, system architecture spec modals, keyboard shortcuts, and vector inspection
 */

(function (global) {
  'use strict';

  const DeveloperHUDEngine = {
    telemetry: {
      lastQueryLatencyMs: 12,
      vectorCount: 100,
      memoryEstimateMb: 14.8,
      buildVersion: 'v3.4-prod',
      commitHash: '8f3a1b4'
    },
    shortcutsModalEl: null,
    archModalEl: null,

    init: function () {
      if (typeof window === 'undefined') return;

      this.shortcutsModalEl = document.getElementById('shortcuts-modal');
      this.archModalEl = document.getElementById('architecture-modal');

      this.bindKeyboardShortcuts();
      this.bindUIEvents();
      this.updateTelemetryHUD();
    },

    bindKeyboardShortcuts: function () {
      if (typeof window === 'undefined') return;

      window.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K: Focus RAG search input
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const ragInput = document.getElementById('rag-query-input');
          if (ragInput) {
            ragInput.focus();
            ragInput.select();
          }
        }

        // Shift+? : Open Shortcuts modal
        if (e.key === '?' && !this.isTypingInInput(e)) {
          e.preventDefault();
          this.toggleShortcutsModal();
        }

        // Esc: Close open modals/drawers
        if (e.key === 'Escape') {
          this.closeAllModals();
        }
      });
    },

    isTypingInInput: function (e) {
      const tag = e.target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
    },

    bindUIEvents: function () {
      if (typeof document === 'undefined') return;

      const archBtn = document.getElementById('view-arch-btn');
      const shortcutsBtn = document.getElementById('view-shortcuts-btn');
      const closeArchBtn = document.getElementById('close-arch-btn');
      const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');

      if (archBtn) archBtn.addEventListener('click', () => this.toggleArchModal());
      if (shortcutsBtn) shortcutsBtn.addEventListener('click', () => this.toggleShortcutsModal());
      if (closeArchBtn) closeArchBtn.addEventListener('click', () => this.closeAllModals());
      if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', () => this.closeAllModals());

      const modalBackdrops = document.querySelectorAll('.spec-modal-overlay');
      modalBackdrops.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) this.closeAllModals();
        });
      });
    },

    recordQueryLatency: function (startTimeMs) {
      const latency = Math.max(1, Math.round(performance.now() - startTimeMs));
      this.telemetry.lastQueryLatencyMs = latency;
      this.updateTelemetryHUD();
      return latency;
    },

    updateTelemetryHUD: function () {
      if (typeof document === 'undefined') return;

      const latencyPill = document.getElementById('hud-latency-pill');
      if (latencyPill) {
        latencyPill.textContent = `⚡ Latency: ${this.telemetry.lastQueryLatencyMs}ms`;
      }
    },

    toggleShortcutsModal: function () {
      if (!this.shortcutsModalEl) return;
      this.shortcutsModalEl.classList.toggle('active');
    },

    toggleArchModal: function () {
      if (!this.archModalEl) return;
      this.archModalEl.classList.toggle('active');
    },

    closeAllModals: function () {
      if (typeof document === 'undefined') return;
      const modals = document.querySelectorAll('.spec-modal-overlay, .note-drawer');
      modals.forEach(m => m.classList.remove('active'));
    },

    inspectNoteVector: function (note) {
      if (!note) return null;
      let nlp = typeof NLPEngine !== 'undefined' ? NLPEngine : null;
      if (!nlp && typeof global !== 'undefined' && global.NLPEngine) nlp = global.NLPEngine;
      if (!nlp && typeof require === 'function') {
        try { nlp = require('./nlp-engine'); } catch (e) {}
      }
      if (!nlp) return null;

      const vector = nlp.createTFVector(note.content || '');
      const terms = Object.keys(vector).map(term => ({
        term,
        weight: vector[term].toFixed(3)
      })).sort((a, b) => b.weight - a.weight);

      return {
        id: note.id,
        title: note.title,
        tokenCount: (note.content || '').split(/\s+/).length,
        distinctTerms: terms.length,
        topTerms: terms.slice(0, 8),
        rawVectorJson: JSON.stringify(vector, null, 2)
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeveloperHUDEngine;
  } else {
    global.DeveloperHUDEngine = DeveloperHUDEngine;
  }

})(typeof window !== 'undefined' ? window : this);
