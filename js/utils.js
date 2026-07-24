// ============================================
// AlgoVerse — Interactive Backtracking Visualizer
// Module: Utility Engine, Sound Synth & State Scrubber
// Author: Ankita Priyadarshini Pallai
// ============================================

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playNote(freq, duration, type = 'sine', gainVal = 0.05) {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context catch
    }
  }

  playTrySound() {
    this.playNote(523.25 + Math.random() * 60, 0.04, 'sine', 0.03);
  }

  playBacktrackSound() {
    this.playNote(220, 0.07, 'triangle', 0.04);
  }

  playSuccessSound() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playNote(freq, 0.25, 'sine', 0.07);
      }, idx * 90);
    });
  }
}

class StepHistoryRecorder {
  constructor() {
    this.steps = [];
    this.currentIndex = -1;
  }

  reset() {
    this.steps = [];
    this.currentIndex = -1;
  }

  push(stepData) {
    if (this.currentIndex < this.steps.length - 1) {
      this.steps = this.steps.slice(0, this.currentIndex + 1);
    }
    this.steps.push(JSON.parse(JSON.stringify(stepData)));
    this.currentIndex = this.steps.length - 1;
  }

  canStepBack() {
    return this.currentIndex > 0;
  }

  canStepForward() {
    return this.currentIndex < this.steps.length - 1;
  }

  stepBack() {
    if (this.canStepBack()) {
      this.currentIndex--;
      return this.steps[this.currentIndex];
    }
    return null;
  }

  stepForward() {
    if (this.canStepForward()) {
      this.currentIndex++;
      return this.steps[this.currentIndex];
    }
    return null;
  }

  seekTo(index) {
    if (index >= 0 && index < this.steps.length) {
      this.currentIndex = index;
      return this.steps[this.currentIndex];
    }
    return null;
  }

  getCurrentStep() {
    if (this.currentIndex >= 0 && this.currentIndex < this.steps.length) {
      return this.steps[this.currentIndex];
    }
    return null;
  }
}

class ExecutionStats {
  constructor() {
    this.steps = 0;
    this.backtracks = 0;
    this.visitedStates = 0;
    this.startTime = 0;
    this.elapsedMs = 0;
    this.timerId = null;
    this.isRunning = false;
    this.maxDepth = 0;
    this.currentDepth = 0;
    this.solutionCount = 0;
  }

  reset() {
    this.stopTimer();
    this.steps = 0;
    this.backtracks = 0;
    this.visitedStates = 0;
    this.startTime = 0;
    this.elapsedMs = 0;
    this.maxDepth = 0;
    this.currentDepth = 0;
    this.solutionCount = 0;
    this.updateUI();
  }

  startTimer() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() - this.elapsedMs;
    this.timerId = setInterval(() => {
      this.elapsedMs = performance.now() - this.startTime;
      const el = document.getElementById('stat-time');
      if (el) el.textContent = `${(this.elapsedMs / 1000).toFixed(2)}s`;
    }, 50);
  }

  stopTimer() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  recordStep(isBacktrack = false, depth = 0, isSolution = false) {
    this.steps++;
    this.visitedStates++;
    this.currentDepth = depth;
    if (depth > this.maxDepth) this.maxDepth = depth;
    if (isBacktrack) this.backtracks++;
    if (isSolution) this.solutionCount++;
    this.updateUI();
  }

  updateUI() {
    const elSteps = document.getElementById('stat-steps');
    const elBacktracks = document.getElementById('stat-backtracks');
    const elVisited = document.getElementById('stat-visited');
    const elDepth = document.getElementById('stat-depth');
    const elSolutions = document.getElementById('stat-solutions');

    if (elSteps) elSteps.textContent = this.steps.toLocaleString();
    if (elBacktracks) elBacktracks.textContent = this.backtracks.toLocaleString();
    if (elVisited) elVisited.textContent = this.visitedStates.toLocaleString();
    if (elDepth) elDepth.textContent = `${this.currentDepth} (Max: ${this.maxDepth})`;
    if (elSolutions) elSolutions.textContent = this.solutionCount.toLocaleString();
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
    </div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

window.soundEngine = new SoundEngine();
window.historyRecorder = new StepHistoryRecorder();
window.executionStats = new ExecutionStats();
window.showToast = showToast;
