/**
 * Second Brain AI System — Knowledge Graph Visualizer
 * Interactive 2D HTML5 Canvas Force-Directed Network Graph
 */

(function (global) {
  'use strict';
  
  const GraphVisualizer = {
    canvas: null,
    ctx: null,
    nodes: [],
    allNodes: [],
    links: [],
    allLinks: [],
    selectedNode: null,
    hoveredNode: null,
    animId: null,
    transform: { x: 0, y: 0, k: 1 },
    isDragging: false,
    draggedNode: null,
    lastMouse: { x: 0, y: 0 },
    onNodeSelectCallback: null,
    activeFilter: 'all',

    init: function (canvasElement, onNodeSelect) {
      if (!canvasElement) return;
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.onNodeSelectCallback = onNodeSelect;

      this.resize();
      this.bindEvents();
    },

    resize: function () {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width || 800;
      const h = rect.height || 600;

      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      if (this.ctx) this.ctx.scale(dpr, dpr);
      this.cssWidth = w;
      this.cssHeight = h;
    },

    buildGraph: function (notes) {
      if (!notes || notes.length === 0) return;
      this.resize();

      this.nodes = [];
      this.links = [];
      this.allNodes = [];
      this.allLinks = [];

      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      // 1. Define Topic Cluster Hub Centers
      const clusterCenters = [
        { name: 'AI Systems & Deep Learning', x: width * 0.3, y: height * 0.35, color: '#8b5cf6' },
        { name: 'Voice Memos & Audio', x: width * 0.7, y: height * 0.3, color: '#10b981' },
        { name: 'Web Research & Clips', x: width * 0.75, y: height * 0.7, color: '#06b6d4' },
        { name: 'System Architecture', x: width * 0.25, y: height * 0.72, color: '#3b82f6' }
      ];

      // 2. Create Note Nodes with Cluster Gravity
      notes.forEach((note, idx) => {
        const clusterIdx = idx % clusterCenters.length;
        const cluster = clusterCenters[clusterIdx];
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 120;

        const node = {
          id: note.id,
          label: note.title || 'Untitled Note',
          type: 'note',
          sourceType: note.sourceType || 'typing',
          tags: note.tags || [],
          noteObj: note,
          clusterIdx: clusterIdx,
          x: cluster.x + Math.cos(angle) * dist,
          y: cluster.y + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: 10 + Math.min((note.content || '').length / 280, 6)
        };
        this.allNodes.push(node);
      });

      // 3. Connect Notes within the Same Cluster or Shared Primary Tags (Max 2 Links per Note)
      for (let i = 0; i < this.allNodes.length; i++) {
        let linksForNode = 0;
        for (let j = i + 1; j < this.allNodes.length; j++) {
          if (linksForNode >= 2) break;
          const n1 = this.allNodes[i];
          const n2 = this.allNodes[j];

          const sharedTag = (n1.tags || []).some(t => (n2.tags || []).includes(t));
          if (n1.clusterIdx === n2.clusterIdx && (sharedTag || Math.random() < 0.25)) {
            this.allLinks.push({
              source: n1.id,
              target: n2.id
            });
            linksForNode++;
          }
        }
      }

      this.applyFilter(this.activeFilter);
      this.updateNodeCountBadge();
      this.startSimulation();
    },

    applyFilter: function (filterVal) {
      this.activeFilter = filterVal || 'all';
      if (this.activeFilter === 'all') {
        this.nodes = [...this.allNodes];
        this.links = [...this.allLinks];
      } else if (this.activeFilter === 'notes') {
        this.nodes = this.allNodes.filter(n => n.type === 'note');
        const nodeIds = new Set(this.nodes.map(n => n.id));
        this.links = this.allLinks.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
      } else {
        this.nodes = this.allNodes.filter(n => n.type === 'note' && n.sourceType === this.activeFilter);
        const nodeIds = new Set(this.nodes.map(n => n.id));
        this.links = this.allLinks.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
      }
      this.updateNodeCountBadge();
    },

    updateNodeCountBadge: function () {
      const badge = document.getElementById('graph-node-count-badge');
      if (badge) {
        const notesCount = this.nodes.filter(n => n.type === 'note').length;
        badge.textContent = `● ${notesCount} Visual Topic Nodes`;
      }
    },

    startSimulation: function () {
      if (this.animId) cancelAnimationFrame(this.animId);
      const step = () => {
        this.updatePhysics();
        this.draw();
        this.animId = requestAnimationFrame(step);
      };
      step();
    },

    stopSimulation: function () {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    },

    updatePhysics: function () {
      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      for (let i = 0; i < this.nodes.length; i++) {
        const n1 = this.nodes[i];
        if (n1 === this.draggedNode) continue;

        // Gentle center gravity
        n1.vx += (width / 2 - n1.x) * 0.00015;
        n1.vy += (height / 2 - n1.y) * 0.00015;

        // Repulsion between nodes to prevent overlapping clutter
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 180) {
            const force = (180 - dist) / dist * 0.03;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }

        n1.vx *= 0.86;
        n1.vy *= 0.86;
        n1.x += n1.vx;
        n1.y += n1.vy;
      }
    },

    draw: function () {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      const currentTheme = document.documentElement.getAttribute('data-theme') || 'royal-gold';
      const isLight = currentTheme === 'platinum-gold' || currentTheme === 'gemini-light';

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(this.transform.x, this.transform.y);
      ctx.scale(this.transform.k, this.transform.k);

      // Background Grid Dots
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
      for (let x = 25; x < width; x += 45) {
        for (let y = 25; y < height; y += 45) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      // Draw Links (Subtle Unhovered, Glowing Accent when Hovered)
      this.links.forEach(link => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          ctx.beginPath();
          const isHighlighted = (this.hoveredNode && (this.hoveredNode.id === s.id || this.hoveredNode.id === t.id));
          ctx.strokeStyle = isHighlighted ? (isLight ? '#d97706' : '#22d3ee') : (isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)');
          ctx.lineWidth = isHighlighted ? 2.5 : 1;
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      this.nodes.forEach(node => {
        const isHovered = node === this.hoveredNode || node === this.selectedNode;
        const isConnected = this.hoveredNode && this.links.some(l => (l.source === node.id && l.target === this.hoveredNode.id) || (l.target === node.id && l.source === this.hoveredNode.id));

        ctx.globalAlpha = (this.hoveredNode && !isHovered && !isConnected) ? 0.35 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        switch (node.sourceType) {
          case 'voice': ctx.fillStyle = '#10b981'; break;   // Emerald
          case 'clip': ctx.fillStyle = '#06b6d4'; break;    // Amber
          case 'file': ctx.fillStyle = '#ec4899'; break;    // Pink
          case 'bookmark': ctx.fillStyle = '#3b82f6'; break;// Blue
          default: ctx.fillStyle = '#8b5cf6'; break;         // Violet
        }

        ctx.fill();

        // Node Glow Ring on Hover
        if (isHovered) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = isLight ? '#d97706' : '#ffffff';
          ctx.stroke();
        }

        // Draw Crisp Labels ONLY on Hover/Selected or High Zoom Level to Eliminate Clutter
        if (isHovered || this.transform.k > 1.3) {
          ctx.font = '600 12px "Inter", -apple-system, sans-serif';
          const labelText = node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label;
          const textWidth = ctx.measureText(labelText).width;

          // Draw pill backdrop
          ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(22, 18, 40, 0.92)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(node.x + node.radius + 4, node.y - 10, textWidth + 10, 18, 5);
            ctx.fill();
          }

          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillText(labelText, node.x + node.radius + 9, node.y + 3);
        }
      });

      ctx.globalAlpha = 1;

      ctx.restore();
    },

    bindEvents: function () {
      if (!this.canvas) return;

      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - this.transform.x) / this.transform.k,
          y: (e.clientY - rect.top - this.transform.y) / this.transform.k
        };
      };

      this.canvas.addEventListener('mousemove', (e) => {
        const pos = getPos(e);
        this.hoveredNode = this.nodes.find(n => {
          const dx = n.x - pos.x;
          const dy = n.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
        });

        if (this.isDragging && this.draggedNode) {
          this.draggedNode.x = pos.x;
          this.draggedNode.y = pos.y;
        }

        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'default';
      });

      this.canvas.addEventListener('mousedown', (e) => {
        const pos = getPos(e);
        if (this.hoveredNode) {
          this.isDragging = true;
          this.draggedNode = this.hoveredNode;
          this.selectedNode = this.hoveredNode;

          if (this.selectedNode.type === 'note' && this.onNodeSelectCallback) {
            this.onNodeSelectCallback(this.selectedNode.noteObj);
          }
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
        this.draggedNode = null;
      });

      window.addEventListener('resize', () => {
        if (this.canvas) {
          this.resize();
        }
      });
    },

    zoom: function (factor) {
      this.transform.k = Math.max(0.4, Math.min(3.0, this.transform.k * factor));
    },

    resetTransform: function () {
      this.transform = { x: 0, y: 0, k: 1 };
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphVisualizer;
  } else {
    global.GraphVisualizer = GraphVisualizer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
