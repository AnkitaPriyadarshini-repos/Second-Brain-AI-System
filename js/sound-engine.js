/**
 * Second Brain AI System — Web Audio API Sound Engine
 * Synthesizes crisp UI audio effects (click, save chime, bot whisper, success) locally using Web Audio API oscillators
 */

(function (global) {
  'use strict';

  const SoundEngine = {
    audioCtx: null,
    enabled: true,
    muted: false,

    toggleMute: function () {
      this.muted = !this.muted;
      this.enabled = !this.muted;
      if (typeof VoiceEngine !== 'undefined' && VoiceEngine.stopSpeak) {
        VoiceEngine.stopSpeak();
      }
      return this.muted;
    },

    stopAllAudio: function () {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },

    init: function () {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    },

    resumeCtx: function () {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    },

    playClick: function () {
      if (!this.enabled || !this.audioCtx) return;
      this.resumeCtx();
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.04);
      } catch (e) {}
    },

    playSaveChime: function () {
      if (!this.enabled || !this.audioCtx) return;
      this.resumeCtx();
      try {
        const now = this.audioCtx.currentTime;
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

        freqs.forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + (idx * 0.06));

          gain.gain.setValueAtTime(0.1, now + (idx * 0.06));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.06) + 0.25);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + (idx * 0.06));
          osc.stop(now + (idx * 0.06) + 0.25);
        });
      } catch (e) {}
    },

    playBotWhisper: function () {
      if (!this.enabled || !this.audioCtx) return;
      this.resumeCtx();
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {}
    },

    playSuccess: function () {
      if (!this.enabled || !this.audioCtx) return;
      this.resumeCtx();
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundEngine;
  } else {
    global.SoundEngine = SoundEngine;
  }

})(typeof window !== 'undefined' ? window : this);
