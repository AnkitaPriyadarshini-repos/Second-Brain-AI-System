/**
 * Second Brain AI System — Voice Engine
 * Speech Recognition, Speech Synthesis (Jarvis Voice), & Animated Canvas Waveform
 */

(function (global) {
  'use strict';

  const VoiceEngine = {
    isListening: false,
    isSpeaking: false,
    ttsEnabled: true,
    recognition: null,
    synth: typeof window !== 'undefined' ? window.speechSynthesis : null,
    canvasAnimId: null,

    state: 'IDLE',

    /**
     * Initializes speech recognition and synthesis
     * @param {Object} callbacks {onTranscript, onError, onStateChange}
     */
    init: function (callbacks = {}) {
      this.callbacks = callbacks;
      this.setState('IDLE');

      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.setState('LISTENING');
          };

          this.recognition.onresult = (event) => {
            this.setState('PROCESSING');
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            const currentTranscript = finalTranscript || interimTranscript;
            if (finalTranscript) {
              this.setState('READY_TO_SEND');
            } else {
              this.setState('TRANSCRIBING');
            }

            if (this.callbacks.onTranscript) {
              this.callbacks.onTranscript(currentTranscript, !!finalTranscript);
            }
          };

          this.recognition.onerror = (err) => {
            this.isListening = false;
            this.setState('ERROR');
            let errMsg = 'Voice recognition error occurred.';
            if (err && err.error === 'not-allowed') {
              errMsg = 'Microphone access is blocked. Please allow microphone permission in your browser settings and try again.';
            } else if (err && err.error === 'no-speech') {
              errMsg = 'No speech was detected. Please try speaking again.';
            }
            if (typeof window.showToast === 'function') {
              window.showToast(`🎙️ ${errMsg}`);
            }
            if (this.callbacks.onError) this.callbacks.onError(err);
          };

          this.recognition.onend = () => {
            this.isListening = false;
            if (this.state !== 'READY_TO_SEND' && this.state !== 'ERROR') {
              this.setState('IDLE');
            }
          };
        }
      }
    },

    setState: function (newState) {
      this.state = newState;
      if (this.callbacks && typeof this.callbacks.onStateChange === 'function') {
        this.callbacks.onStateChange(newState);
      }
    },

    /**
     * Toggle listening state
     */
    toggleListen: function () {
      if (this.isListening || this.state === 'LISTENING') {
        this.stopListen();
      } else {
        this.startListen();
      }
    },

    /**
     * Start listening to voice input
     */
    startListen: function () {
      if (this.recognition) {
        try {
          this.setState('REQUESTING_PERMISSION');
          this.recognition.start();
        } catch (e) {
          console.warn('Speech recognition already started or failed:', e);
          this.stopListen();
        }
      } else {
        this.setState('ERROR');
        if (typeof window.showToast === 'function') {
          window.showToast("🎙️ Voice input isn't supported by this browser. You can still type your message.");
        }
      }
    },

    /**
     * Stop listening
     */
    stopListen: function () {
      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {}
      }
      this.isListening = false;
      this.setState('IDLE');
    },

    /**
     * Speaks response using SpeechSynthesis (Jarvis Voice)
     * @param {string} text 
     * @param {Function} onEnd 
     */
    speak: function (text, onEnd) {
      if (!this.ttsEnabled || !this.synth) {
        if (onEnd) onEnd();
        return;
      }

      this.synth.cancel(); // Stop any ongoing speech

      // Clean markdown formatting for clean vocal reading
      const cleanText = text
        .replace(/[*_#`[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .substring(0, 300); // Read first 300 chars out loud cleanly

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select a crisp English voice if available
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Daniel') || v.name.includes('Samantha')));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (this.callbacks.onStateChange) this.callbacks.onStateChange('speaking');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    },

    /**
     * Stop ongoing speech
     */
    stopSpeak: function () {
      if (this.synth) {
        this.synth.cancel();
      }
      this.isSpeaking = false;
      if (this.callbacks.onStateChange) this.callbacks.onStateChange('idle');
    },

    stopSpeech: function () {
      this.stopSpeak();
    },

    /**
     * Renders animated waveform on canvas element
     * @param {HTMLCanvasElement} canvas 
     */
    startWaveformAnimation: function (canvas) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let step = 0;

      const render = () => {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        if (this.isListening || this.isSpeaking) {
          step += 0.08;
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = this.isListening ? '#10b981' : '#6366f1'; // Green for listen, Indigo for speaking

          for (let x = 0; x < width; x += 5) {
            const y = height / 2 + Math.sin(x * 0.05 + step) * (this.isListening ? 14 : 22) * Math.sin(step * 0.5);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else {
          // Flat pulse line when idle
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
        }

        this.canvasAnimId = requestAnimationFrame(render);
      };

      if (this.canvasAnimId) cancelAnimationFrame(this.canvasAnimId);
      render();
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceEngine;
  } else {
    global.VoiceEngine = VoiceEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);
