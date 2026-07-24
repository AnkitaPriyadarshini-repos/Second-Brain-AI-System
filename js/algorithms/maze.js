// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Rat in a Maze Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator function for Rat in a Maze Backtracking Solver.
 * Explores directions: Right (R), Down (D), Left (L), Up (U).
 */
function* solveMazeGenerator(grid, row = 0, col = 0, path = [], visited = null, depth = 0) {
  const n = grid.length;
  if (!visited) {
    visited = Array.from({ length: n }, () => Array(n).fill(false));
  }

  // Base Case: Reached Cheese target (n-1, n-1)
  if (row === n - 1 && col === n - 1) {
    path.push([row, col]);
    yield {
      type: 'SUCCESS',
      row,
      col,
      line: 1,
      message: `Rat reached the target cheese at (${row}, ${col})! Path found!`,
      path: [...path],
      depth
    };
    return true;
  }

  visited[row][col] = true;
  path.push([row, col]);

  yield {
    type: 'TRY',
    row,
    col,
    line: 5,
    message: `Exploring position (${row}, ${col})`,
    path: [...path],
    depth
  };

  // Direction vectors: Down, Right, Up, Left
  const dRow = [1, 0, -1, 0];
  const dCol = [0, 1, 0, -1];
  const dirNames = ['Down', 'Right', 'Up', 'Left'];

  for (let i = 0; i < 4; i++) {
    const nextRow = row + dRow[i];
    const nextCol = col + dCol[i];

    if (isValidMazeStep(grid, nextRow, nextCol, visited)) {
      yield {
        type: 'CHECK',
        row: nextRow,
        col: nextCol,
        line: 8,
        message: `Moving ${dirNames[i]} to (${nextRow}, ${nextCol})`,
        path: [...path],
        depth: depth + 1
      };

      const reached = yield* solveMazeGenerator(grid, nextRow, nextCol, path, visited, depth + 1);
      if (reached) return true;
    }
  }

  // Backtrack
  path.pop();
  visited[row][col] = false;
  yield {
    type: 'BACKTRACK',
    row,
    col,
    line: 15,
    message: `Dead end at (${row}, ${col}) — Backtracking!`,
    path: [...path],
    depth
  };

  return false;
}

function isValidMazeStep(grid, r, c, visited) {
  const n = grid.length;
  return r >= 0 && r < n && c >= 0 && c < n && grid[r][c] === 1 && !visited[r][c];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveMazeGenerator, isValidMazeStep };
} else {
  window.solveMazeGenerator = solveMazeGenerator;
  window.isValidMazeStep = isValidMazeStep;
}
