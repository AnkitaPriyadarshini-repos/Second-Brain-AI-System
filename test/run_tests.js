// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Automated Test Suite Harness
// Author: Ankita Priyadarshini Pallai
// ============================================

const { solveSudokuGenerator } = require('../js/algorithms/sudoku.js');
const { solveMazeGenerator } = require('../js/algorithms/maze.js');
const { solveNQueensGenerator } = require('../js/algorithms/nqueens.js');
const { solveKnightTourGenerator } = require('../js/algorithms/knighttour.js');
const { solveGraphColoringGenerator } = require('../js/algorithms/graphcoloring.js');
const { solveHamiltonianGenerator } = require('../js/algorithms/hamiltonian.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASSED: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✕ FAILED: ${testName}`);
  }
}

function runAllTests() {
  console.log('\n=============================================');
  console.log('  AlgoVerse — Backtracking Solvers Test Suite');
  console.log('=============================================\n');

  // Test 1: Sudoku Solver
  console.log('[Test 1] Sudoku Backtracking Solver');
  const sudokuBoard = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],

    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],

    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9]
  ];
  const sudokuGen = solveSudokuGenerator(sudokuBoard);
  let lastSudokuStep = null;
  for (const step of sudokuGen) {
    lastSudokuStep = step;
  }
  assert(lastSudokuStep && lastSudokuStep.type === 'SUCCESS', 'Sudoku solver solves classic 9x9 board');

  // Test 2: Rat in a Maze
  console.log('\n[Test 2] Rat in a Maze Backtracking Solver');
  const mazeGrid = [
    [1, 0, 0, 0],
    [1, 1, 0, 1],
    [0, 1, 0, 0],
    [1, 1, 1, 1]
  ];
  const mazeGen = solveMazeGenerator(mazeGrid);
  let lastMazeStep = null;
  for (const step of mazeGen) {
    lastMazeStep = step;
  }
  assert(lastMazeStep && lastMazeStep.type === 'SUCCESS', 'Rat in a Maze finds path to cheese');

  // Test 3: N-Queens Solver (N=4)
  console.log('\n[Test 3] N-Queens Backtracking Solver');
  const queensGen = solveNQueensGenerator(4);
  let lastQueenStep = null;
  for (const step of queensGen) {
    lastQueenStep = step;
  }
  assert(lastQueenStep && lastQueenStep.type === 'SUCCESS', 'N-Queens solver places 4 queens successfully');

  // Test 4: Knight's Tour (5x5 Warnsdorff)
  console.log('\n[Test 4] Knight Tour Backtracking Solver (Warnsdorff 5x5)');
  const knightGen = solveKnightTourGenerator(5, 0, 0, true);
  let lastKnightStep = null;
  for (const step of knightGen) {
    lastKnightStep = step;
  }
  assert(lastKnightStep && lastKnightStep.type === 'SUCCESS', 'Knight Tour solves 5x5 board');

  // Test 5: Graph Coloring
  console.log('\n[Test 5] Graph M-Coloring Solver');
  const sampleGraph = {
    nodes: [{x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:0,y:1}],
    edges: [[0,1], [1,2], [2,3], [3,0]]
  };
  const colorGen = solveGraphColoringGenerator(sampleGraph, 3);
  let lastColorStep = null;
  for (const step of colorGen) {
    lastColorStep = step;
  }
  assert(lastColorStep && lastColorStep.type === 'SUCCESS', 'Graph coloring solves 4-node ring with 3 colors');

  // Test 6: Hamiltonian Cycle
  console.log('\n[Test 6] Hamiltonian Cycle Solver');
  const hamGen = solveHamiltonianGenerator(sampleGraph);
  let lastHamStep = null;
  for (const step of hamGen) {
    lastHamStep = step;
  }
  assert(lastHamStep && lastHamStep.type === 'SUCCESS', 'Hamiltonian solver finds cycle in 4-node ring');

  console.log('\n=============================================');
  console.log(`  Results: ${passedTests} / ${totalTests} Passed`);
  console.log('=============================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests();
