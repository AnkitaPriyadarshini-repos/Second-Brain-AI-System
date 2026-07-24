# BlogSphere AI — Software Architecture Specification

## 1. System Overview

**BlogSphere AI** is a state-of-the-art AI-powered blogging, editing, and content generation platform designed with modular frontend architecture and real-time SEO score analysis.

```
       +--------------------------------------------+
       |       Main Application UI (app.js)         |
       +--------------------+-----------------------+
                            |
     +----------------------+----------------------+
     |                      |                      |
     v                      v                      v
+------------------+  +------------------+  +------------------+
| Local Data Store |  | AI Generation    |  | SEO & Readability|
|    (store.js)    |  | Engine (ai-*.js) |  | Engine (seo-*.js)|
+------------------+  +------------------+  +------------------+
     |                      |                      |
     +----------------------+----------------------+
                            |
                            v
             +------------------------------+
             | Live Markdown Editor & Export|
             |          (editor.js)         |
             +------------------------------+
```

---

## 2. Core Subsystems

### A. Local Data Store (`store.js`)
- Persists user draft articles, published posts, view counts, and categories in `localStorage`.
- Includes initial curated sample content spanning Artificial Intelligence, Web Development, UI/UX Design, and Software Engineering.

### B. AI Generation & Content Synthesizer (`ai-engine.js`)
- Agentic content synthesizer generating multi-section Markdown articles tailored by category, writing tone (Professional, Technical, Conversational), and topic prompts.
- Synthesizes automated SEO metadata, titles, tags, and code implementation matrices.

### C. Real-Time SEO & Readability Engine (`seo-analyzer.js`)
- Analyzes title length, word density, reading time estimates, heading hierarchy ($H1$, $H2$, $H3$), and focus keyword frequency.
- Computes real-time SEO health score ($0 - 100$) with actionable optimization recommendations.

### D. Live Markdown Editor (`editor.js`)
- Dual-pane layout featuring real-time Markdown parsing, formatting toolbar actions (Bold, Italic, Headings, Code, Quotes), and export functionality (`.md` & `.html`).

---

## 3. Directory Structure

```text
BlogSphere-AI/
├── index.html                  # Semantic HTML5 & ARIA layout
├── css/
│   ├── style.css               # Dark theme, glassmorphic design & CSS grid
│   └── responsive.css          # Mobile & tablet responsive breakpoints
├── js/
│   ├── store.js                # LocalStorage data persistence store
│   ├── ai-engine.js            # AI article generation engine
│   ├── seo-analyzer.js        # Real-time SEO scoring & readability engine
│   ├── editor.js               # Live Markdown editor & export functions
│   └── app.js                  # Main UI view router & event controller
├── docs/
│   └── ARCHITECTURE.md         # Architecture specification
├── test/
│   └── run_tests.js            # Automated test suite
├── README.md                   # Repository documentation
├── LICENSE                     # MIT License
└── package.json                # Project configuration
```
