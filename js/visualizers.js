// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Render Engine & Canvas/DOM Visualizers
// Author: Ankita Priyadarshini Pallai
// ============================================

class SudokuVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(board, initialBoard = null, activeRow = -1, activeCol = -1, stateType = null) {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.className = 'visualizer-grid sudoku-grid';

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        if (initialBoard && initialBoard[r][c] !== 0) {
          cell.classList.add('fixed');
        }

        if (r === activeRow && c === activeCol) {
          cell.classList.add('active');
          if (stateType === 'TRY') cell.classList.add('trying');
          if (stateType === 'BACKTRACK') cell.classList.add('backtracking');
          if (stateType === 'SUCCESS') cell.classList.add('success');
        } else if (r === activeRow || c === activeCol || 
                   (Math.floor(r / 3) === Math.floor(activeRow / 3) && Math.floor(c / 3) === Math.floor(activeCol / 3))) {
          cell.classList.add('highlight-box');
        }

        const val = board[r][c];
        cell.textContent = val !== 0 ? val : '';
        cell.dataset.row = r;
        cell.dataset.col = c;

        this.container.appendChild(cell);
      }
    }
  }
}

class MazeVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.onWallToggle = null;
  }

  render(grid, path = [], activeRow = -1, activeCol = -1, stateType = null) {
    if (!this.container) return;
    const n = grid.length;
    this.container.innerHTML = '';
    this.container.className = 'visualizer-grid maze-grid';
    this.container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    const pathSet = new Set(path.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = document.createElement('div');
        cell.className = 'maze-cell';

        if (grid[r][c] === 0) {
          cell.classList.add('wall');
        } else {
          cell.classList.add('open');
        }

        if (r === 0 && c === 0) {
          cell.classList.add('start');
          cell.innerHTML = '🐭'; // Rat start
        } else if (r === n - 1 && c === n - 1) {
          cell.classList.add('target');
          cell.innerHTML = '🧀'; // Cheese target
        }

        if (pathSet.has(`${r},${c}`)) {
          cell.classList.add('in-path');
        }

        if (r === activeRow && c === activeCol) {
          cell.classList.add('active');
          if (stateType === 'TRY') cell.classList.add('trying');
          if (stateType === 'BACKTRACK') cell.classList.add('backtracking');
          if (stateType === 'SUCCESS') cell.classList.add('success');
        }

        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => {
          if (this.onWallToggle && !(r === 0 && c === 0) && !(r === n - 1 && c === n - 1)) {
            this.onWallToggle(r, c);
          }
        });

        this.container.appendChild(cell);
      }
    }
  }
}

class NQueensVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(board, activeRow = -1, activeCol = -1, stateType = null, conflicts = []) {
    if (!this.container) return;
    const n = board.length;
    this.container.innerHTML = '';
    this.container.className = 'visualizer-grid nqueens-grid';
    this.container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    const conflictSet = new Set(conflicts.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = document.createElement('div');
        cell.className = `nqueens-cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;

        if (board[r][c] === 1) {
          cell.classList.add('has-queen');
          cell.innerHTML = '<span class="queen-icon">👑</span>';
        }

        if (conflictSet.has(`${r},${c}`)) {
          cell.classList.add('conflict');
        }

        if (r === activeRow && c === activeCol) {
          cell.classList.add('active');
          if (stateType === 'TRY') cell.classList.add('trying');
          if (stateType === 'BACKTRACK') cell.classList.add('backtracking');
          if (stateType === 'SUCCESS') cell.classList.add('success');
        }

        this.container.appendChild(cell);
      }
    }
  }
}

class KnightTourVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(board, currentMove = 0, activeRow = -1, activeCol = -1, stateType = null) {
    if (!this.container) return;
    const n = board.length;
    this.container.innerHTML = '';
    this.container.className = 'visualizer-grid knight-grid';
    this.container.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = document.createElement('div');
        cell.className = `knight-cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;

        const moveNum = board[r][c];
        if (moveNum !== -1) {
          cell.classList.add('visited');
          cell.innerHTML = `<span class="move-num">${moveNum + 1}</span>`;
        }

        if (r === activeRow && c === activeCol) {
          cell.classList.add('active');
          cell.innerHTML = `<span class="knight-icon">♞</span><span class="move-num">${moveNum !== -1 ? moveNum + 1 : ''}</span>`;
          if (stateType === 'TRY') cell.classList.add('trying');
          if (stateType === 'BACKTRACK') cell.classList.add('backtracking');
          if (stateType === 'SUCCESS') cell.classList.add('success');
        }

        this.container.appendChild(cell);
      }
    }
  }
}

class GraphVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.colorPalette = [
      '#00f2fe', '#ff4b2b', '#00b09b', '#f6d365', '#9b51e0', '#ff007f', '#00e676'
    ];
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height || 420;
  }

  renderGraph(graph, colors = [], activeNode = -1, activeEdge = null, stateType = null) {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    const ctx = this.ctx;
    const { nodes, edges } = graph;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Edges
    edges.forEach(([u, v]) => {
      const n1 = nodes[u];
      const n2 = nodes[v];
      if (!n1 || !n2) return;

      const isCurrentEdge = activeEdge && ((activeEdge[0] === u && activeEdge[1] === v) || (activeEdge[0] === v && activeEdge[1] === u));

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = isCurrentEdge ? '#ff4b2b' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isCurrentEdge ? 4 : 2;
      if (isCurrentEdge) {
        ctx.shadowColor = '#ff4b2b';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Nodes
    nodes.forEach((node, i) => {
      const colorIdx = colors[i];
      const hasColor = colorIdx !== undefined && colorIdx !== -1;
      const nodeColor = hasColor ? this.colorPalette[colorIdx % this.colorPalette.length] : '#1e293b';

      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Border glow if active
      if (i === activeNode) {
        ctx.strokeStyle = stateType === 'BACKTRACK' ? '#ff4b2b' : stateType === 'SUCCESS' ? '#00b09b' : '#00f2fe';
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;
      } else {
        ctx.strokeStyle = hasColor ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label !== undefined ? node.label : `${i}`, node.x, node.y);
    });
  }
}

window.SudokuVisualizer = SudokuVisualizer;
window.MazeVisualizer = MazeVisualizer;
window.NQueensVisualizer = NQueensVisualizer;
window.KnightTourVisualizer = KnightTourVisualizer;
window.GraphVisualizer = GraphVisualizer;
