/**
 * Second Brain AI System — Voice Audio Presets Module
 * Customized voice synthesis presets for Jarvis Conversational Interface
 */

(function (global) {
  'use strict';

  const AudioPresets = {
    presets: {
      jarvis: {
        name: 'Jarvis AI (Default)',
        rate: 1.05,
        pitch: 1.0,
        lang: 'en-US',
        description: 'Crisp, articulate AI voice assistant'
      },
      concise: {
        name: 'Fast Briefing',
        rate: 1.25,
        pitch: 1.0,
        lang: 'en-US',
        description: 'High-speed audio digest for rapid note review'
      },
      calm: {
        name: 'Deep Focus',
        rate: 0.95,
        pitch: 0.9,
        lang: 'en-US',
        description: 'Soothing voice pace for nighttime listening'
      }
    },

    getPreset: function (key) {
      return this.presets[key] || this.presets.jarvis;
    },

    getAllPresets: function () {
      return Object.values(this.presets);
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioPresets;
  } else {
    global.AudioPresets = AudioPresets;
  }

})(typeof window !== 'undefined' ? window : globalThis);
