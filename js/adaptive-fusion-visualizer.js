// ==========================================================================
// Claves Adaptive Fusion AI — HTML5 Interactive Neural Fusion Canvas Visualizer
// Author: Antigravity AI Engine
// ==========================================================================

class AdaptiveFusionVisualizer {
  constructor(canvasId) {
    this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.isRunning = false;
    this.time = 0;
    
    // Core positions (ratio based)
    this.coreXRatio = 0.55;
    this.coreYRatio = 0.50;

    // Strands definition matching the 5 intelligence forms
    this.strands = [
      { id: 'research', label: 'RESEARCH', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.8)', startRatio: { x: 0.1, y: 0.22 }, curveOffset: -40 },
      { id: 'analyze', label: 'ANALYZE', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.8)', startRatio: { x: 0.08, y: 0.42 }, curveOffset: -15 },
      { id: 'challenge', label: 'CHALLENGE', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.8)', startRatio: { x: 0.12, y: 0.82 }, curveOffset: 35 },
      { id: 'audit', label: 'AUDIT', color: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.8)', startRatio: { x: 0.28, y: 0.88 }, curveOffset: 25 },
      { id: 'fuse', label: 'FUSE', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.95)', isOutputBeam: true, startRatio: { x: 0.55, y: 0.50 }, endRatio: { x: 0.95, y: 0.50 } }
    ];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.createParticles();
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 220;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  createParticles() {
    this.particles = [];
    // Generate particles for each input strand
    this.strands.forEach(strand => {
      if (strand.isOutputBeam) return;
      const particleCount = 28;
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          strandId: strand.id,
          color: strand.color,
          progress: Math.random(),
          speed: 0.004 + Math.random() * 0.008,
          size: 1.5 + Math.random() * 2.5,
          offset: (Math.random() - 0.5) * 8
        });
      }
    });

    // Beam output particles
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        strandId: 'fuse',
        color: '#fbbf24',
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        size: 2.0 + Math.random() * 3.0,
        offset: (Math.random() - 0.5) * 6
      });
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const renderLoop = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animId = requestAnimationFrame(renderLoop);
    };
    this.animId = requestAnimationFrame(renderLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  getQuadraticPoint(p0, p1, p2, t) {
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
      y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
    };
  }

  draw() {
    if (!this.ctx || !this.width || !this.height) return;
    this.time += 0.02;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const coreX = w * this.coreXRatio;
    const coreY = h * this.coreYRatio;

    // 1. Dark Background Fill with Gradient Depth
    ctx.clearRect(0, 0, w, h);
    const bgGrad = ctx.createRadialGradient(coreX, coreY, 10, coreX, coreY, Math.max(w, h));
    bgGrad.addColorStop(0, '#0c111e');
    bgGrad.addColorStop(0.5, '#07090e');
    bgGrad.addColorStop(1, '#030407');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Curved Neural Intelligence Strands
    this.strands.forEach(strand => {
      if (strand.isOutputBeam) return;

      const p0 = { x: w * strand.startRatio.x, y: h * strand.startRatio.y };
      const p2 = { x: coreX, y: coreY };
      const p1 = {
        x: (p0.x + p2.x) / 2,
        y: (p0.y + p2.y) / 2 + strand.curveOffset
      };

      // Outer glow line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.strokeStyle = strand.glow;
      ctx.lineWidth = 4;
      ctx.shadowColor = strand.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.restore();

      // Inner crisp core line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.strokeStyle = strand.color;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.restore();

      // Label text
      ctx.save();
      ctx.font = '700 9px "Outfit", "Inter", sans-serif';
      ctx.fillStyle = strand.color;
      ctx.shadowColor = strand.color;
      ctx.shadowBlur = 8;
      ctx.fillText(strand.label, p0.x + 8, p0.y + (strand.curveOffset > 0 ? 12 : -6));
      ctx.restore();
    });

    // 3. Draw FUSE Radiant Beam (Output)
    const beamStart = { x: coreX, y: coreY };
    const beamEnd = { x: w * 0.95, y: coreY };

    ctx.save();
    // Beam Outer Glow
    ctx.beginPath();
    ctx.moveTo(beamStart.x, beamStart.y);
    ctx.lineTo(beamEnd.x, beamEnd.y);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 25;
    ctx.stroke();

    // Beam Core Light
    ctx.beginPath();
    ctx.moveTo(beamStart.x, beamStart.y);
    ctx.lineTo(beamEnd.x, beamEnd.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // FUSE Label
    ctx.font = '800 10px "Outfit", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('FUSE ➔', beamEnd.x - 45, beamEnd.y - 12);
    ctx.restore();

    // 4. Update and Draw Flowing Energy Particles
    this.particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress >= 1) p.progress = 0;

      let pos;
      const strand = this.strands.find(s => s.id === p.strandId);

      if (p.strandId === 'fuse') {
        pos = {
          x: coreX + p.progress * (beamEnd.x - coreX),
          y: coreY + p.offset
        };
      } else if (strand) {
        const p0 = { x: w * strand.startRatio.x, y: h * strand.startRatio.y };
        const p2 = { x: coreX, y: coreY };
        const p1 = {
          x: (p0.x + p2.x) / 2,
          y: (p0.y + p2.y) / 2 + strand.curveOffset
        };
        const pt = this.getQuadraticPoint(p0, p1, p2, p.progress);
        pos = { x: pt.x + p.offset * (1 - p.progress), y: pt.y + p.offset * (1 - p.progress) };
      }

      if (pos) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = p.strandId === 'fuse' ? (1 - p.progress) : Math.sin(p.progress * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });

    // 5. Central Fusion Energy Core / Nucleus
    ctx.save();
    const pulseRadius = 18 + Math.sin(this.time * 2.5) * 3;

    // Outer Aura
    const auraGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, pulseRadius * 2.5);
    auraGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    auraGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.8)');
    auraGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.3)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(coreX, coreY, pulseRadius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad;
    ctx.fill();

    // Central Luminous Core
    ctx.beginPath();
    ctx.arc(coreX, coreY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 30;
    ctx.fill();

    // Rotating Energy Ring Around Nucleus
    ctx.beginPath();
    ctx.ellipse(coreX, coreY, pulseRadius * 1.5, pulseRadius * 0.7, this.time, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

// Global initialization helper
window.AdaptiveFusionVisualizer = AdaptiveFusionVisualizer;
