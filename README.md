# ⚡ AlgoVerse — Interactive Backtracking Algorithm Visualizer

> **A Flagship, Google & FAANG Ready Portfolio Project**  
> An interactive web platform for visualizing NP-hard constraint satisfaction and backtracking algorithms with real-time state trees, line-by-line pseudocode execution, synthesized Web Audio sound cues, and interactive grid/graph editing.

---

## 🌟 Key Features

- **6 Classic Backtracking Algorithms**:
  1. 🧩 **9x9 Sudoku Solver**: Row, Column, and $3\times3$ box constraint checking with step-by-step trial placement & backtrack highlighting.
  2. 🐭 **Rat in a Maze**: 2D Grid pathfinding from start to cheese target with dead-end backtrack tracing.
  3. 👑 **N-Queens Problem**: Interactive $N\times N$ chessboard queen placements with attack line collision detection.
  4. ♞ **Knight's Tour**: Chessboard traversal visualizer powered by Warnsdorff's minimum onward degree heuristic.
  5. 🎨 **Graph M-Coloring**: Interactive vertex coloring checking adjacent node conflicts.
  6. 🔄 **Hamiltonian Cycle**: Closed loop vertex traversal finding simple Hamiltonian circuits.

- **Real-Time Controls & Metrics**:
  - **Playback Controls**: Play, Pause, Step Forward, Step Back, Reset, Speed Slider ($1\times$ to $50\times$).
  - **Web Audio Sound Effects**: Real-time synthesized chimes for placement, backtracking, and victory fanfare.
  - **Execution Metrics**: Step counter, Backtrack count, Time elapsed (ms), Visited states count, Current recursion depth.
  - **Synchronized Pseudocode Panel**: Active line highlighting synced with execution state.
  - **Complexity Theory Card**: Dynamic Time Complexity $O(\dots)$ and Space Complexity $O(\dots)$ details.

---

## 🚀 Quick Start & Installation

### Option 1: Run Locally (No dependencies required)
Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Run with Node / Local Server
```bash
# Clone the repository
git clone https://github.com/your-username/algoverse-visualizer.git
cd algoverse-visualizer

# Run automated test suite
npm test

# Launch dev server
npm start
```

---

## 🧪 Testing

The repository includes a comprehensive automated test suite in `test/run_tests.js` that verifies all 6 generator algorithm engines deterministically:

```bash
node test/run_tests.js
```

---

## 📐 Project Architecture

```text
BlogSphere AI/
├── index.html                  # Semantic HTML5 & ARIA layout
├── css/
│   ├── style.css               # Dark theme, glassmorphic design & CSS grid
│   └── responsive.css          # Mobile & tablet responsive breakpoints
├── js/
│   ├── utils.js                # Web Audio sound engine & execution stats
│   ├── visualizers.js          # Canvas 2D & DOM visualizer render engines
│   ├── algorithms/             # ES6 Generator Backtracking Solvers
│   │   ├── sudoku.js
│   │   ├── maze.js
│   │   ├── nqueens.js
│   │   ├── knighttour.js
│   │   ├── graphcoloring.js
│   │   └── hamiltonian.js
│   └── main.js                 # App controller & UI event binding
├── docs/
│   └── ARCHITECTURE.md         # Detailed technical architecture spec
├── test/
│   └── run_tests.js            # Node.js automated test harness
├── README.md                   # Project documentation
├── LICENSE                     # MIT License
└── package.json                # Project configuration
```

---

## 👤 Author

**Ankita Priyadarshini Pallai**  
*Built to Google & FAANG Engineering Standards*
