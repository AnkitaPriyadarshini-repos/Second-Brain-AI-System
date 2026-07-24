// ============================================
// AlgoVerse — Backtracking Algorithm Visualizer
// Module: Hamiltonian Cycle Backtracking Solver
// Author: Ankita Priyadarshini Pallai
// ============================================

/**
 * ES6 Generator function for Hamiltonian Cycle Backtracking Solver.
 */
function* solveHamiltonianGenerator(graph, path = [0], visited = null, depth = 0) {
  const { nodes, edges } = graph;
  const numNodes = nodes.length;

  if (!visited) {
    visited = Array(numNodes).fill(false);
    visited[0] = true;
  }

  // Base Case: All nodes visited, check if last node connects to start node (0)
  if (path.length === numNodes) {
    const lastNode = path[path.length - 1];
    const firstNode = path[0];
    const isCycleEdge = hasEdge(graph, lastNode, firstNode);

    yield {
      type: 'CHECK',
      activeNode: lastNode,
      activeEdge: [lastNode, firstNode],
      line: 3,
      message: `All vertices visited. Checking cycle edge (${lastNode + 1} ➔ ${firstNode + 1})`,
      path: [...path],
      depth
    };

    if (isCycleEdge) {
      path.push(firstNode); // Complete loop
      yield {
        type: 'SUCCESS',
        activeNode: firstNode,
        activeEdge: [lastNode, firstNode],
        line: 1,
        message: `Hamiltonian Cycle found! Path: ${path.map(n => n + 1).join(' ➔ ')}`,
        path: [...path],
        depth
      };
      return true;
    }
    return false;
  }

  const currNode = path[path.length - 1];

  for (let nextNode = 0; nextNode < numNodes; nextNode++) {
    if (!visited[nextNode] && hasEdge(graph, currNode, nextNode)) {
      visited[nextNode] = true;
      path.push(nextNode);

      yield {
        type: 'TRY',
        activeNode: nextNode,
        activeEdge: [currNode, nextNode],
        line: 7,
        message: `Traversed edge (${currNode + 1} ➔ ${nextNode + 1})`,
        path: [...path],
        depth
      };

      const solved = yield* solveHamiltonianGenerator(graph, path, visited, depth + 1);
      if (solved) return true;

      path.pop();
      visited[nextNode] = false;

      yield {
        type: 'BACKTRACK',
        activeNode: currNode,
        activeEdge: [currNode, nextNode],
        line: 12,
        message: `Backtracking from Node ${nextNode + 1} back to Node ${currNode + 1}`,
        path: [...path],
        depth
      };
    }
  }

  return false;
}

function hasEdge(graph, u, v) {
  const { edges } = graph;
  return edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveHamiltonianGenerator, hasEdge };
} else {
  window.solveHamiltonianGenerator = solveHamiltonianGenerator;
  window.hasEdge = hasEdge;
}
