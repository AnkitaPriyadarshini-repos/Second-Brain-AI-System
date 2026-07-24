// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: N-Queens Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator function for N-Queens Backtracking Solver.
 * Places 1 Queen per row and checks for column and diagonal attacks.
 */
function* solveNQueensGenerator(n, board = null, row = 0, depth = 0) {
  if (!board) {
    board = Array.from({ length: n }, () => Array(n).fill(0));
  }

  if (row === n) {
    yield {
      type: 'SUCCESS',
      row: -1,
      col: -1,
      line: 1,
      message: `Successfully placed all ${n} queens on the board!`,
      board: board.map(r => [...r]),
      conflicts: [],
      depth
    };
    return true;
  }

  for (let col = 0; col < n; col++) {
    const conflicts = checkNQueensConflicts(board, row, col);

    yield {
      type: 'CHECK',
      row,
      col,
      line: 4,
      message: `Testing Queen placement at row ${row + 1}, col ${col + 1}`,
      board: board.map(r => [...r]),
      conflicts,
      depth
    };

    if (conflicts.length === 0) {
      board[row][col] = 1;
      yield {
        type: 'TRY',
        row,
        col,
        line: 6,
        message: `Placed Queen at (${row + 1}, ${col + 1}) — Safe square`,
        board: board.map(r => [...r]),
        conflicts: [],
        depth
      };

      const solved = yield* solveNQueensGenerator(n, board, row + 1, depth + 1);
      if (solved) return true;

      board[row][col] = 0; // Backtrack
      yield {
        type: 'BACKTRACK',
        row,
        col,
        line: 10,
        message: `Backtracking Queen from (${row + 1}, ${col + 1})`,
        board: board.map(r => [...r]),
        conflicts: [],
        depth
      };
    }
  }

  return false;
}

function checkNQueensConflicts(board, row, col) {
  const n = board.length;
  const conflicts = [];

  for (let r = 0; r < row; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 1) {
        // Same column conflict
        if (c === col) {
          conflicts.push([r, c]);
        }
        // Diagonal conflict
        if (Math.abs(r - row) === Math.abs(c - col)) {
          conflicts.push([r, c]);
        }
      }
    }
  }

  return conflicts;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveNQueensGenerator, checkNQueensConflicts };
} else {
  window.solveNQueensGenerator = solveNQueensGenerator;
  window.checkNQueensConflicts = checkNQueensConflicts;
}
