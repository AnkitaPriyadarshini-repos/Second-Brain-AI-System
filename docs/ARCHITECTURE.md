# AlgoVerse — Architecture & Engineering Specification

## 1. System Overview

**AlgoVerse** is built as an interactive engineering platform for visualizing complex NP-hard and constraint satisfaction backtracking algorithms. The platform employs a decoupled **Generator-Renderer Pattern** in ES6 JavaScript with a time-travel step debugger.

```
       +--------------------------------------------+
       |   UI Controller & Scrubber (main.js)       |
       +--------------------+-----------------------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
+-----------------------+         +-----------------------+
| Async Generator Engine|         | Visualizer Rendering  |
|  (algorithms/*.js)    |         |  (visualizers.js)     |
+-----------------------+         +-----------------------+
           |                                 |
           v                                 v
   Yield Step Object                 DOM / Canvas 2D Update
           |                                 |
           +----------------+----------------+
                            |
                            v
            +-------------------------------+
            | Sound Synth & History Scrubber|
            |          (utils.js)           |
            +-------------------------------+
```

## 2. Key Modules & Design Decisions

### A. Generator-Renderer Execution & Step History Scrubbing
Standard backtracking functions use blocking recursive calls (`solve(x)` calling `solve(x+1)`), which freeze the browser main thread.
In **AlgoVerse**, every solver is implemented as an ES6 Generator function (`function*`):
- Each state transition yields a standardized payload:
  ```ts
  interface StepPayload {
    type: 'TRY' | 'BACKTRACK' | 'SUCCESS' | 'CHECK';
    line: number;           // Synced pseudocode line
    message: string;        // Human readable log
    depth: number;          // Current recursion tree depth
    [key: string]: any;     // Board, path, or colors state
  }
  ```
- This architecture enables:
  1. Non-blocking UI rendering via `requestAnimationFrame` / `setTimeout`.
  2. Granular step scrubbing (Forward, Step-Back, and progress bar time travel).
  3. Dynamic animation speed scaling ($1\times$ to $50\times$).

### B. Sound Synthesis Engine (Web Audio API)
Instead of loading static MP3 audio files over HTTP, `SoundEngine` synthesizes real-time sound frequencies using the browser's native Web Audio API:
- `TRY`: Soft sine wave audio pulse at $523\text{ Hz}$ (C5).
- `BACKTRACK`: Triangle wave low pop at $220\text{ Hz}$ (A3).
- `SUCCESS`: C Major triad chord sweep ($523.25\text{ Hz} \rightarrow 659.25\text{ Hz} \rightarrow 783.99\text{ Hz} \rightarrow 1046.50\text{ Hz}$).

---

## 3. Algorithm Complexity Reference Matrix

| Algorithm | Worst-Case Time | Auxiliary Space | Pruning Technique |
|-----------|-----------------|------------------|-------------------|
| **Sudoku Solver** | $O(9^{N^2})$ | $O(N^2)$ | Row, Column, and $3\times3$ Box Constraint Checks |
| **Rat in a Maze** | $O(4^{N^2})$ | $O(N^2)$ | Wall Collision & Visited Cell Matrix Pruning |
| **N-Queens** | $O(N!)$ | $O(N)$ | Column & Diagonal Attack Line Checks |
| **Knight's Tour** | $O(8^{N^2})$ | $O(N^2)$ | Warnsdorff's Minimum Degree Heuristic |
| **Graph M-Coloring** | $O(M^V)$ | $O(V)$ | Adjacent Vertex Color Conflict Validation |
| **Hamiltonian Cycle** | $O(N!)$ | $O(N)$ | Edge Existence & Visited Vertex List Validation |
