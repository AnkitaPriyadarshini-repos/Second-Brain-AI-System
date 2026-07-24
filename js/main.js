// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Main Orchestration & UI Controller
// Author: Ankita Priyadarshini Pallai
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let currentAlgo = 'sudoku';
  let isRunning = false;
  let isPaused = false;
  let executionSpeed = 100; // ms delay
  let generator = null;
  let timerId = null;

  // Visualizer Instances
  const sudokuVis = new SudokuVisualizer('visualizer-grid-container');
  const mazeVis = new MazeVisualizer('visualizer-grid-container');
  const queensVis = new NQueensVisualizer('visualizer-grid-container');
  const knightVis = new KnightTourVisualizer('visualizer-grid-container');
  const graphVis = new GraphVisualizer('canvas-visualizer');

  // Algorithm Data Presets
  const sudokuPresets = {
    easy: [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9]
    ]
  };

  const defaultMazeGrid = [
    [1, 0, 0, 0, 1, 1],
    [1, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 0, 1],
    [0, 0, 0, 1, 1, 1],
    [1, 1, 1, 0, 0, 1]
  ];

  const defaultGraph = {
    nodes: [
      { x: 120, y: 80, label: '1' },
      { x: 280, y: 80, label: '2' },
      { x: 360, y: 220, label: '3' },
      { x: 200, y: 320, label: '4' },
      { x: 60, y: 220, label: '5' }
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 4]
    ]
  };

  let currentSudokuBoard = JSON.parse(JSON.stringify(sudokuPresets.easy));
  let initialSudokuBoard = JSON.parse(JSON.stringify(sudokuPresets.easy));
  let currentMazeGrid = JSON.parse(JSON.stringify(defaultMazeGrid));
  let currentQueensN = 4;
  let currentKnightSize = 5;

  // Pseudocode Definitions
  const pseudocodeMap = {
    sudoku: [
      'function solveSudoku(board):',
      '  for each empty cell (row, col):',
      '    for num from 1 to 9:',
      '      if isValid(board, row, col, num):',
      '        board[row][col] = num',
      '        if solveSudoku(board) return true',
      '        board[row][col] = 0 // Backtrack',
      '    return false // Trigger backtrack',
      '  return true // Puzzle solved'
    ],
    maze: [
      'function solveMaze(grid, x, y, path):',
      '  if (x, y) is target: return true',
      '  mark (x, y) as visited & add to path',
      '  for each direction (Down, Right, Up, Left):',
      '    if isValid(x + dx, y + dy):',
      '      if solveMaze(newX, newY) return true',
      '  remove (x, y) from path // Backtrack',
      '  return false'
    ],
    nqueens: [
      'function solveNQueens(board, row):',
      '  if row == N: return true // Solved',
      '  for col from 0 to N-1:',
      '    if isSafe(board, row, col):',
      '      board[row][col] = 1',
      '      if solveNQueens(board, row + 1) return true',
      '      board[row][col] = 0 // Backtrack',
      '  return false'
    ],
    knighttour: [
      'function solveKnightTour(board, x, y, moveCount):',
      '  if moveCount == N * N: return true',
      '  for each of 8 knight L-jumps:',
      '    if isValidMove(newX, newY):',
      '      board[newX][newY] = moveCount',
      '      if solveKnightTour(nextX, nextY, moveCount + 1) return true',
      '      board[newX][newY] = -1 // Backtrack',
      '  return false'
    ],
    graphcoloring: [
      'function solveGraphColoring(graph, colors, node):',
      '  if node == V: return true // All colored',
      '  for color c from 1 to M:',
      '    if isSafeColor(node, c):',
      '      colors[node] = c',
      '      if solveGraphColoring(graph, colors, node + 1) return true',
      '      colors[node] = -1 // Backtrack',
      '  return false'
    ],
    hamiltonian: [
      'function solveHamiltonian(graph, path, pos):',
      '  if pos == V:',
      '    if hasEdge(path[pos-1], path[0]) return true',
      '    return false',
      '  for v from 1 to V-1:',
      '    if isSafeVertex(v, path, pos):',
      '      path[pos] = v',
      '      if solveHamiltonian(graph, path, pos + 1) return true',
      '      path[pos] = -1 // Backtrack',
      '  return false'
    ]
  };

  // Complexity & Information Map
  const complexityMap = {
    sudoku: { time: 'O(9^(N*N))', space: 'O(N*N)', desc: 'Brute-force constraint checking with 9x9 recursion depth.' },
    maze: { time: 'O(4^(N*N))', space: 'O(N*N)', desc: 'Explores 4 movement directions per cell until destination or dead-end.' },
    nqueens: { time: 'O(N!)', space: 'O(N)', desc: 'Prunes illegal columns and diagonal attack lines at each recursive row depth.' },
    knighttour: { time: 'O(8^(N*N))', space: 'O(N*N)', desc: 'Warnsdorff heuristic prioritizes moves with minimum onward onward degree.' },
    graphcoloring: { time: 'O(M^V)', space: 'O(V)', desc: 'Tries M colors for V vertices checking adjacency list conflicts.' },
    hamiltonian: { time: 'O(N!)', space: 'O(N)', desc: 'Checks all permutation paths searching for a simple closed vertex loop.' }
  };

  // Switch Algorithm Handler
  function selectAlgorithm(algoName) {
    currentAlgo = algoName;
    resetExecution();

    document.querySelectorAll('.algo-card').forEach(card => {
      card.classList.toggle('active', card.dataset.algo === algoName);
    });

    const isGraph = algoName === 'graphcoloring' || algoName === 'hamiltonian';
    document.getElementById('visualizer-grid-container').style.display = isGraph ? 'none' : 'grid';
    document.getElementById('canvas-visualizer').style.display = isGraph ? 'block' : 'none';

    updatePseudocodeUI(algoName);
    updateComplexityUI(algoName);
    renderInitialVisualizer();
  }

  function renderInitialVisualizer() {
    if (currentAlgo === 'sudoku') {
      currentSudokuBoard = JSON.parse(JSON.stringify(sudokuPresets.easy));
      sudokuVis.render(currentSudokuBoard, initialSudokuBoard);
    } else if (currentAlgo === 'maze') {
      mazeVis.render(currentMazeGrid);
    } else if (currentAlgo === 'nqueens') {
      const board = Array.from({ length: currentQueensN }, () => Array(currentQueensN).fill(0));
      queensVis.render(board);
    } else if (currentAlgo === 'knighttour') {
      const board = Array.from({ length: currentKnightSize }, () => Array(currentKnightSize).fill(-1));
      knightVis.render(board);
    } else if (currentAlgo === 'graphcoloring') {
      graphVis.renderGraph(defaultGraph, Array(defaultGraph.nodes.length).fill(-1));
    } else if (currentAlgo === 'hamiltonian') {
      graphVis.renderGraph(defaultGraph, [], -1, null);
    }
  }

  function updatePseudocodeUI(algo) {
    const box = document.getElementById('pseudocode-lines');
    if (!box) return;
    box.innerHTML = '';
    const lines = pseudocodeMap[algo] || [];
    lines.forEach((lineText, idx) => {
      const div = document.createElement('div');
      div.className = `code-line line-${idx + 1}`;
      div.textContent = lineText;
      box.appendChild(div);
    });
  }

  function updateComplexityUI(algo) {
    const data = complexityMap[algo] || { time: 'O(2^N)', space: 'O(N)', desc: '' };
    document.getElementById('comp-time').textContent = data.time;
    document.getElementById('comp-space').textContent = data.space;
    document.getElementById('comp-desc').textContent = data.desc;
  }

  function highlightCodeLine(lineNum) {
    document.querySelectorAll('.code-line').forEach(el => el.classList.remove('active'));
    if (lineNum > 0) {
      const target = document.querySelector(`.code-line.line-${lineNum}`);
      if (target) target.classList.add('active');
    }
  }

  // Execution Step Processing Loop
  function startExecution() {
    if (isRunning && !isPaused) return;

    if (!generator) {
      window.executionStats.reset();
      window.historyRecorder.reset();
      initGenerator();
    }

    isRunning = true;
    isPaused = false;
    window.executionStats.startTimer();
    document.getElementById('btn-play').innerHTML = '<span>⏸ Pause</span>';

    stepLoop();
  }

  function pauseExecution() {
    isPaused = true;
    isRunning = false;
    window.executionStats.stopTimer();
    if (timerId) clearTimeout(timerId);
    document.getElementById('btn-play').innerHTML = '<span>▶ Play</span>';
  }

  function resetExecution() {
    pauseExecution();
    generator = null;
    window.executionStats.reset();
    window.historyRecorder.reset();
    highlightCodeLine(0);
    renderInitialVisualizer();
    showToast('Execution reset to initial state.', 'info');
  }

  function initGenerator() {
    if (currentAlgo === 'sudoku') {
      generator = solveSudokuGenerator(currentSudokuBoard);
    } else if (currentAlgo === 'maze') {
      generator = solveMazeGenerator(currentMazeGrid);
    } else if (currentAlgo === 'nqueens') {
      generator = solveNQueensGenerator(currentQueensN);
    } else if (currentAlgo === 'knighttour') {
      generator = solveKnightTourGenerator(currentKnightSize, 0, 0, true);
    } else if (currentAlgo === 'graphcoloring') {
      generator = solveGraphColoringGenerator(defaultGraph, 3);
    } else if (currentAlgo === 'hamiltonian') {
      generator = solveHamiltonianGenerator(defaultGraph);
    }
  }

  function stepLoop() {
    if (!isRunning || isPaused || !generator) return;

    const res = generator.next();

    if (res.done) {
      pauseExecution();
      showToast('Algorithm execution completed!', 'success');
      window.soundEngine.playSuccessSound();
      return;
    }

    const step = res.value;
    window.historyRecorder.push(step);
    applyStep(step);

    timerId = setTimeout(stepLoop, executionSpeed);
  }

  function applyStep(step) {
    const isBacktrack = step.type === 'BACKTRACK';
    window.executionStats.recordStep(isBacktrack, step.depth || 0);
    highlightCodeLine(step.line || 0);

    if (isBacktrack) {
      window.soundEngine.playBacktrackSound();
    } else {
      window.soundEngine.playTrySound();
    }

    if (currentAlgo === 'sudoku') {
      sudokuVis.render(step.board, initialSudokuBoard, step.row, step.col, step.type);
    } else if (currentAlgo === 'maze') {
      mazeVis.render(currentMazeGrid, step.path || [], step.row, step.col, step.type);
    } else if (currentAlgo === 'nqueens') {
      queensVis.render(step.board, step.row, step.col, step.type, step.conflicts || []);
    } else if (currentAlgo === 'knighttour') {
      knightVis.render(step.board, step.moveNum, step.row, step.col, step.type);
    } else if (currentAlgo === 'graphcoloring') {
      graphVis.renderGraph(defaultGraph, step.colors || [], step.activeNode, step.activeEdge, step.type);
    } else if (currentAlgo === 'hamiltonian') {
      graphVis.renderGraph(defaultGraph, [], step.activeNode, step.activeEdge, step.type);
    }
  }

  // Event Listeners
  document.querySelectorAll('.algo-card').forEach(card => {
    card.addEventListener('click', () => selectAlgorithm(card.dataset.algo));
  });

  document.getElementById('btn-play').addEventListener('click', () => {
    if (isRunning && !isPaused) pauseExecution();
    else startExecution();
  });

  document.getElementById('btn-reset').addEventListener('click', resetExecution);

  document.getElementById('btn-step-forward').addEventListener('click', () => {
    pauseExecution();
    if (!generator) initGenerator();
    const res = generator.next();
    if (!res.done) {
      applyStep(res.value);
    }
  });

  document.getElementById('speed-slider').addEventListener('input', (e) => {
    executionSpeed = 1000 / parseInt(e.target.value);
    document.getElementById('speed-label').textContent = `${e.target.value}x`;
  });

  document.getElementById('btn-sound-toggle').addEventListener('click', () => {
    const enabled = window.soundEngine.toggleSound();
    document.getElementById('btn-sound-toggle').innerHTML = enabled ? '🔊 Sound On' : '🔇 Muted';
  });

  // Init default algorithm
  selectAlgorithm('sudoku');
});
