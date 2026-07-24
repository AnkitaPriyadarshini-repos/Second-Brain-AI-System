// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Sudoku Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator function for 9x9 Sudoku Backtracking Solver.
 * Yields state object on each trial placement and backtrack step.
 */
function* solveSudokuGenerator(board, depth = 0) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          yield {
            type: 'CHECK',
            row,
            col,
            num,
            line: 4,
            message: `Checking if number ${num} can be placed at (${row + 1}, ${col + 1})`,
            board: board.map(r => [...r]),
            depth
          };

          if (isValidSudokuPlacement(board, row, col, num)) {
            board[row][col] = num;
            yield {
              type: 'TRY',
              row,
              col,
              num,
              line: 6,
              message: `Placed ${num} at (${row + 1}, ${col + 1}) — valid move`,
              board: board.map(r => [...r]),
              depth
            };

            const isSolved = yield* solveSudokuGenerator(board, depth + 1);
            if (isSolved) return true;

            board[row][col] = 0; // Backtrack
            yield {
              type: 'BACKTRACK',
              row,
              col,
              num: 0,
              line: 10,
              message: `Backtracking from (${row + 1}, ${col + 1}) — reset to 0`,
              board: board.map(r => [...r]),
              depth
            };
          }
        }
        return false; // Triggers backtrack
      }
    }
  }

  yield {
    type: 'SUCCESS',
    row: -1,
    col: -1,
    line: 1,
    message: 'Sudoku puzzle solved successfully!',
    board: board.map(r => [...r]),
    depth
  };
  return true;
}

function isValidSudokuPlacement(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveSudokuGenerator, isValidSudokuPlacement };
} else {
  window.solveSudokuGenerator = solveSudokuGenerator;
  window.isValidSudokuPlacement = isValidSudokuPlacement;
}
