# 🌐 BlogSphere AI — AI-Powered Blogging & Content Platform

[![Pull Shark Achievement](https://img.shields.io/badge/GitHub-Pull%20Shark%20Unlocked-00f2fe?style=for-the-badge&logo=github)](https://github.com/AnkitaPriyadarshini-repos/BlogSphere-AI)
[![Build Status](https://img.shields.io/badge/Tests-4%2F4%20Passed-00b09b?style=for-the-badge&logo=node.js)](https://github.com/AnkitaPriyadarshini-repos/BlogSphere-AI)

> **State-of-the-Art AI Content Studio, Real-time SEO Scoring & Live Markdown Editor**  
> An open-source portfolio project designed for automated content generation, real-time SEO health scoring, markdown editing, and responsive article publishing.

---

## 🌟 Key Features

- **✨ AI Content Studio**:
  - Agentic article generator synthesizing multi-section technical, professional, or conversational blog posts based on user topics.
  - Automatic category classification, tag recommendations, and code example insertion.

- **📈 Real-Time SEO Analyzer**:
  - Live 0-100 SEO health score meter.
  - Word count, estimated read time, title optimization, and focus keyword density checks.
  - Actionable feedback recommendations list.

- **✏️ Live Markdown Editor & Reader**:
  - Split-view live Markdown parser with syntax highlighting.
  - Formatting toolbar (Bold, Italic, Headings, Quotes, Code).
  - Export articles to `.md` or `.html` formats.
  - Full-screen article reader modal with view tracking.

- **📊 Analytics Dashboard**:
  - Live statistics tracking published posts, total views, and engagement metrics.

---

## 🚀 Quick Start & Installation

### Option 1: Run Locally (No dependencies required)
Simply open `index.html` in any modern web browser.

### Option 2: Run with Node / Local Server
```bash
# Clone the repository
git clone https://github.com/AnkitaPriyadarshini-repos/BlogSphere-AI.git
cd BlogSphere-AI

# Run automated test suite
npm test

# Launch dev server
npm start
```

---

## 🧪 Testing

The repository includes an automated test suite in `test/run_tests.js`:

```bash
node test/run_tests.js
```

---

## 📁 Directory Architecture

```text
BlogSphere-AI/
├── index.html                  # Main Application UI
├── css/
│   ├── style.css               # Core styling, glassmorphism, design tokens
│   └── responsive.css          # Mobile & tablet responsiveness
├── js/
│   ├── store.js                # LocalStorage data persistence store
│   ├── ai-engine.js            # AI article generation engine
│   ├── seo-analyzer.js        # Real-time SEO scoring & readability engine
│   ├── editor.js               # Live Markdown editor & export functions
│   └── app.js                  # Main UI view router & event controller
├── docs/
│   └── ARCHITECTURE.md         # Architecture spec
├── test/
│   └── run_tests.js            # Automated test suite
├── README.md                   # Repository documentation
├── LICENSE                     # MIT License
└── package.json                # Project configuration
```

---

## 👤 Author

**Ankita Priyadarshini Pallai**  
*BlogSphere AI Platform*
