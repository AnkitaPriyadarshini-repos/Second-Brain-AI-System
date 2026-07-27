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

      const entityMap = new Map();
      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      // 1. Create Note Nodes
      notes.forEach((note, idx) => {
        const angle = (idx / notes.length) * Math.PI * 2;
        const radius = 160 + Math.random() * 140;
        const node = {
          id: note.id,
          label: note.title || 'Untitled Note',
          type: 'note',
          sourceType: note.sourceType || 'typing',
          tags: note.tags || [],
          noteObj: note,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: 9 + Math.min((note.content || '').length / 250, 7)
        };
        this.allNodes.push(node);

        if (note.entities) {
          Object.entries(note.entities).forEach(([cat, list]) => {
            (list || []).forEach(ent => {
              if (!entityMap.has(ent)) {
                entityMap.set(ent, { label: ent, category: cat, noteIds: [] });
              }
              entityMap.get(ent).noteIds.push(note.id);
            });
          });
        }
      });

      // 2. Create Shared Entity Nodes & Links
      entityMap.forEach((entData, entName) => {
        if (entData.noteIds.length >= 1) {
          const entNode = {
            id: `ent-${entName}`,
            label: entName,
            type: 'entity',
            category: entData.category,
            x: width / 2 + (Math.random() - 0.5) * 360,
            y: height / 2 + (Math.random() - 0.5) * 360,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: 5
          };
          this.allNodes.push(entNode);

          entData.noteIds.forEach(nId => {
            this.allLinks.push({
              source: nId,
              target: entNode.id
            });
          });
        }
      });

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
      } else if (this.activeFilter === 'entities') {
        this.nodes = this.allNodes.filter(n => n.type === 'entity');
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
        const entCount = this.nodes.filter(n => n.type === 'entity').length;
        badge.textContent = `● ${notesCount} Notes | ${entCount} Entities | ${this.links.length} Links`;
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

    updatePhysics: function () {
      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      for (let i = 0; i < this.nodes.length; i++) {
        const n1 = this.nodes[i];
        if (n1 === this.draggedNode) continue;

        // Center gravity
        n1.vx += (width / 2 - n1.x) * 0.00025;
        n1.vy += (height / 2 - n1.y) * 0.00025;

        // Repulsion between nodes
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 130) {
            const force = (130 - dist) / dist * 0.04;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }

        n1.vx *= 0.88;
        n1.vy *= 0.88;
        n1.x += n1.vx;
        n1.y += n1.vy;
      }
    },

    draw: function () {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const width = this.cssWidth || 800;
      const height = this.cssHeight || 600;

      const isLight = document.documentElement.getAttribute('data-theme') === 'sunflower-yellow' || !document.documentElement.getAttribute('data-theme');

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(this.transform.x, this.transform.y);
      ctx.scale(this.transform.k, this.transform.k);

      // Background Grid Dots
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      // Draw Links
      this.links.forEach(link => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          ctx.beginPath();
          const isHighlighted = (this.hoveredNode && (this.hoveredNode.id === s.id || this.hoveredNode.id === t.id));
          ctx.strokeStyle = isHighlighted ? (isLight ? '#d97706' : '#fbbf24') : (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)');
          ctx.lineWidth = isHighlighted ? 2.5 : 1;
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      this.nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.type === 'note') {
          switch (node.sourceType) {
            case 'voice': ctx.fillStyle = '#10b981'; break;   // Emerald
            case 'clip': ctx.fillStyle = '#f59e0b'; break;    // Amber
            case 'file': ctx.fillStyle = '#ec4899'; break;    // Pink
            case 'bookmark': ctx.fillStyle = '#3b82f6'; break;// Blue
            default: ctx.fillStyle = '#8b5cf6'; break;         // Violet
          }
        } else {
          ctx.fillStyle = isLight ? '#475569' : '#94a3b8'; // Slate
        }

        ctx.fill();

        // Node Glow Ring
        if (node === this.hoveredNode || node === this.selectedNode) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = isLight ? '#d97706' : '#ffffff';
          ctx.stroke();
        }

        // Draw Labels
        if (node.type === 'note' || node === this.hoveredNode) {
          ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif';
          ctx.fillStyle = isLight ? '#422006' : '#f3f4f6';
          const labelText = node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label;
          ctx.fillText(labelText, node.x + node.radius + 5, node.y + 4);
        }
      });

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
