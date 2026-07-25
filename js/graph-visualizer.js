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
    links: [],
    selectedNode: null,
    hoveredNode: null,
    animId: null,
    transform: { x: 0, y: 0, k: 1 },
    isDragging: false,
    draggedNode: null,
    lastMouse: { x: 0, y: 0 },
    onNodeSelectCallback: null,

    /**
     * Initializes the canvas graph visualizer
     * @param {HTMLCanvasElement} canvasElement 
     * @param {Function} onNodeSelect 
     */
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
      this.canvas.width = rect.width || 800;
      this.canvas.height = rect.height || 500;
    },

    /**
     * Builds nodes and links from notes dataset
     * @param {Array} notes 
     */
    buildGraph: function (notes) {
      if (!notes || notes.length === 0) return;

      this.nodes = [];
      this.links = [];

      const entityMap = new Map();
      const width = this.canvas ? this.canvas.width : 800;
      const height = this.canvas ? this.canvas.height : 500;

      // 1. Create Note Nodes
      notes.forEach((note, idx) => {
        const angle = (idx / notes.length) * Math.PI * 2;
        const radius = 150 + Math.random() * 120;
        const node = {
          id: note.id,
          label: note.title,
          type: 'note',
          sourceType: note.sourceType,
          tags: note.tags || [],
          noteObj: note,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 8 + Math.min((note.content || '').length / 200, 6)
        };
        this.nodes.push(node);

        // Map entities to connect notes
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

      // 2. Create Entity Nodes & Links for entities shared by multiple notes
      entityMap.forEach((entData, entName) => {
        if (entData.noteIds.length >= 1) {
          const entNode = {
            id: `ent-${entName}`,
            label: entName,
            type: 'entity',
            category: entData.category,
            x: width / 2 + (Math.random() - 0.5) * 300,
            y: height / 2 + (Math.random() - 0.5) * 300,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: 5
          };
          this.nodes.push(entNode);

          entData.noteIds.forEach(nId => {
            this.links.push({
              source: nId,
              target: entNode.id
            });
          });
        }
      });

      this.startSimulation();
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
      const width = this.canvas ? this.canvas.width : 800;
      const height = this.canvas ? this.canvas.height : 500;

      // Simple force layout iteration
      for (let i = 0; i < this.nodes.length; i++) {
        const n1 = this.nodes[i];
        if (n1 === this.draggedNode) continue;

        // Center gravity
        n1.vx += (width / 2 - n1.x) * 0.0003;
        n1.vy += (height / 2 - n1.y) * 0.0003;

        // Repulsion between nodes
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 120) {
            const force = (120 - dist) / dist * 0.05;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }

        // Apply velocities with damping
        n1.vx *= 0.85;
        n1.vy *= 0.85;
        n1.x += n1.vx;
        n1.y += n1.vy;
      }
    },

    draw: function () {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw background grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Quick index for link nodes
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      // Draw Links
      ctx.lineWidth = 1;
      this.links.forEach(link => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          ctx.beginPath();
          const isHighlighted = (this.hoveredNode && (this.hoveredNode.id === s.id || this.hoveredNode.id === t.id));
          ctx.strokeStyle = isHighlighted ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = isHighlighted ? 2 : 1;
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
          ctx.fillStyle = '#64748b'; // Slate gray for entities
        }

        ctx.fill();

        // Node outline if hovered/selected
        if (node === this.hoveredNode || node === this.selectedNode) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }

        // Draw Labels for Notes or Hovered Nodes
        if (node.type === 'note' || node === this.hoveredNode) {
          ctx.font = '11px Outfit, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label, node.x + node.radius + 4, node.y + 4);
        }
      });
    },

    bindEvents: function () {
      if (!this.canvas) return;

      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      };

      this.canvas.addEventListener('mousemove', (e) => {
        const pos = getPos(e);
        this.hoveredNode = this.nodes.find(n => {
          const dx = n.x - pos.x;
          const dy = n.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
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
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphVisualizer;
  } else {
    global.GraphVisualizer = GraphVisualizer;
  }

})(typeof window !== 'undefined' ? window : globalThis);
