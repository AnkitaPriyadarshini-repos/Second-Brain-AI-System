// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Knight's Tour Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator for Knight's Tour.
 * Supports standard Backtracking & Warnsdorff's Heuristic for fast tour completion.
 */
function* solveKnightTourGenerator(n = 8, startRow = 0, startCol = 0, useWarnsdorff = true) {
  const board = Array.from({ length: n }, () => Array(n).fill(-1));
  
  // 8 possible L-shaped knight moves
  const moveR = [2, 1, -1, -2, -2, -1, 1, 2];
  const moveC = [1, 2, 2, 1, -1, -2, -2, -1];

  board[startRow][startCol] = 0;

  yield {
    type: 'TRY',
    row: startRow,
    col: startCol,
    moveNum: 0,
    line: 1,
    message: `Knight starts at (${startRow + 1}, ${startCol + 1})`,
    board: board.map(r => [...r])
  };

  const solved = yield* knightTourUtil(board, startRow, startCol, 1, n, moveR, moveC, useWarnsdorff);

  if (solved) {
    yield {
      type: 'SUCCESS',
      row: -1,
      col: -1,
      moveNum: n * n,
      line: 2,
      message: `Knight's Tour completed successfully covering all ${n * n} squares!`,
      board: board.map(r => [...r])
    };
  } else {
    yield {
      type: 'BACKTRACK',
      row: -1,
      col: -1,
      moveNum: -1,
      line: 15,
      message: `No complete tour found from (${startRow + 1}, ${startCol + 1})`,
      board: board.map(r => [...r])
    };
  }
}

function* knightTourUtil(board, r, c, moveCount, n, moveR, moveC, useWarnsdorff) {
  if (moveCount === n * n) return true;

  let moves = [];
  for (let i = 0; i < 8; i++) {
    const nextR = r + moveR[i];
    const nextC = c + moveC[i];
    if (isKnightMoveValid(board, nextR, nextC, n)) {
      const degree = useWarnsdorff ? getKnightDegree(board, nextR, nextC, n, moveR, moveC) : 0;
      moves.push({ r: nextR, c: nextC, degree });
    }
  }

  // Warnsdorff heuristic: Sort next moves by lowest degree (fewer onward options)
  if (useWarnsdorff) {
    moves.sort((a, b) => a.degree - b.degree);
  }

  for (const move of moves) {
    board[move.r][move.c] = moveCount;

    yield {
      type: 'TRY',
      row: move.r,
      col: move.c,
      moveNum: moveCount,
      line: 6,
      message: `Jumped Knight to (${move.r + 1}, ${move.c + 1}) — Step ${moveCount + 1}`,
      board: board.map(row => [...row])
    };

    const isComplete = yield* knightTourUtil(board, move.r, move.c, moveCount + 1, n, moveR, moveC, useWarnsdorff);
    if (isComplete) return true;

    board[move.r][move.c] = -1; // Backtrack

    yield {
      type: 'BACKTRACK',
      row: move.r,
      col: move.c,
      moveNum: moveCount - 1,
      line: 12,
      message: `Backtracked Knight from (${move.r + 1}, ${move.c + 1})`,
      board: board.map(row => [...row])
    };
  }

  return false;
}

function isKnightMoveValid(board, r, c, n) {
  return r >= 0 && r < n && c >= 0 && c < n && board[r][c] === -1;
}

function getKnightDegree(board, r, c, n, moveR, moveC) {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    const nr = r + moveR[i];
    const nc = c + moveC[i];
    if (isKnightMoveValid(board, nr, nc, n)) count++;
  }
  return count;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveKnightTourGenerator, isKnightMoveValid };
} else {
  window.solveKnightTourGenerator = solveKnightTourGenerator;
  window.isKnightMoveValid = isKnightMoveValid;
}
