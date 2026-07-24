// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Graph M-Coloring Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator function for Graph M-Coloring Backtracking Solver.
 */
function* solveGraphColoringGenerator(graph, numColors = 3, nodeIdx = 0, colors = null, depth = 0) {
  const { nodes, edges } = graph;
  const numNodes = nodes.length;

  if (!colors) {
    colors = Array(numNodes).fill(-1);
  }

  if (nodeIdx === numNodes) {
    yield {
      type: 'SUCCESS',
      activeNode: -1,
      activeEdge: null,
      line: 1,
      message: `Graph successfully colored using ${numColors} colors!`,
      colors: [...colors],
      depth
    };
    return true;
  }

  const colorNames = ['Cyan', 'Red', 'Emerald', 'Amber', 'Purple', 'Pink'];

  for (let c = 0; c < numColors; c++) {
    const conflictEdge = getGraphColoringConflict(nodeIdx, c, graph, colors);

    yield {
      type: 'CHECK',
      activeNode: nodeIdx,
      activeEdge: conflictEdge,
      line: 4,
      message: `Testing Color ${c + 1} (${colorNames[c] || c}) for Node ${nodeIdx + 1}`,
      colors: [...colors],
      depth
    };

    if (!conflictEdge) {
      colors[nodeIdx] = c;

      yield {
        type: 'TRY',
        activeNode: nodeIdx,
        activeEdge: null,
        line: 6,
        message: `Assigned Color ${c + 1} (${colorNames[c] || c}) to Node ${nodeIdx + 1}`,
        colors: [...colors],
        depth
      };

      const solved = yield* solveGraphColoringGenerator(graph, numColors, nodeIdx + 1, colors, depth + 1);
      if (solved) return true;

      colors[nodeIdx] = -1; // Backtrack

      yield {
        type: 'BACKTRACK',
        activeNode: nodeIdx,
        activeEdge: null,
        line: 10,
        message: `Backtracking Node ${nodeIdx + 1} — Unassigned color`,
        colors: [...colors],
        depth
      };
    }
  }

  return false;
}

function getGraphColoringConflict(node, color, graph, colors) {
  const { edges } = graph;
  for (const [u, v] of edges) {
    if (u === node && colors[v] === color) return [u, v];
    if (v === node && colors[u] === color) return [u, v];
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveGraphColoringGenerator, getGraphColoringConflict };
} else {
  window.solveGraphColoringGenerator = solveGraphColoringGenerator;
  window.getGraphColoringConflict = getGraphColoringConflict;
}
