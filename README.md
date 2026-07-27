# 🧠 Second Brain AI System (HGM-12)

[![Live Web App](https://img.shields.io/badge/Vercel-Live%20Deployment-indigo?logo=vercel)](https://second-brain-ai-system.vercel.app)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?logo=github)](https://ankitapriyadarshini-repos.github.io/Second-Brain-AI-System/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests: 18/18 Passed](https://img.shields.io/badge/Tests-18%2F18%20Passed-emerald)](test/run_tests.js)

> **A personal knowledge system that does not hinder learning.**  
> *Zero-Friction Multi-Surface Capture • Grounded Conversational RAG ("Talk to Jarvis") • Proactive Resurfacing • Interactive Knowledge Graph Network*

---

## 🌐 Live Application & Demo Links

- 🚀 **Primary Live Web Application**: [https://second-brain-ai-system.vercel.app](https://second-brain-ai-system.vercel.app)
- 📡 **Secondary Vercel Mirror**: [https://second-brain-ai-app.vercel.app](https://second-brain-ai-app.vercel.app)
- 📡 **GitHub Pages Live Demo**: [https://ankitapriyadarshini-repos.github.io/Second-Brain-AI-System/](https://ankitapriyadarshini-repos.github.io/Second-Brain-AI-System/)

---

## 📹 Feature Walkthrough Showcase

```
+-----------------------------------------------------------------------------------+
| 🎙️ JARVIS VOICE & GROUNDED RAG DEMO                                              |
|                                                                                   |
|  [ User ] ──▶ "What did I save about deep learning last month?"                  |
|                   │                                                               |
|                   ▼                                                               |
|  [ Vector RAG ] ──▶ Cosine Similarity Search (TF-IDF Note Embeddings)              |
|                   │                                                               |
|                   ▼                                                               |
|  [ Jarvis AI ] ──▶ "Based on your notes from Jan 14: Transformers rely on          |
|                      multi-head self-attention mechanisms..."                     |
|                      📌 Source: [Note #1 (Jan 14, 2026)]                           |
+-----------------------------------------------------------------------------------+
```

### 🎬 System Capabilities Breakdown

#### 1. 🎙️ Jarvis Voice RAG & Grounded Retrieval
- **Voice-to-Text Input**: Speak questions naturally out loud. Live canvas audio waveform visualizer tracks audio frequencies.
- **Strict Grounding**: Answers derive strictly from your saved notes without hallucination.
- **Source Citations**: Interactive citation links open exact note source cards in a slide-out drawer.
- **Multi-Turn Session Memory**: Handles follow-up questions (*"What else did I save on this topic?"*).

#### 2. ⚡ Zero-Friction Multi-Surface Capture Hub
- **Typing Notes**: Rich text entry with real-time NLP auto-tagging.
- **Voice Memos**: Stream-of-consciousness audio recordings transcribed via Whisper.
- **Web Clipper & Extension**: One-click bookmarking (URL, title, summary) and text clipping.
- **File Upload (OCR)**: Drag-and-drop PDF & image parser extracting text via Tesseract OCR simulation.
- **Email Forwarding**: Forward emails directly to `notes@brain.ai`.

#### 3. 💡 Proactive Resurfacing Engine ("From your past notes")
- Daily background algorithm analyzing 7-day activity vectors.
- Surfaces 3–5 older notes relevant to current work with contextual explanation badges (*"You saved this note on distributed systems earlier. You've been reading about Kafka this week. Here it is."*).

#### 4. 🕸️ Interactive Knowledge Graph Visualizer
- 2D force-directed HTML5 canvas mapping note-entity networks.
- Drag, pan, zoom, hover connection highlights, and click node to view note details.

---

## 🏗️ Technical Architecture

```
                                  [ Capture Surfaces ]
      Typing | Voice Recording | Browser Extension | File OCR | Email Forward
                                           │
                                           ▼
                                 [ NLP Ingest Pipeline ]
                      Entity Extraction | Topic Classifier | Vectorizer
                                           │
                                           ▼
                               [ Persistent Data Store ]
                       LocalStorage / IndexedDB (100+ Notes)
                                  /                 \
                                 /                   \
                                ▼                     ▼
                    [ Vector RAG Engine ]      [ Resurfacing Digest ]
                  Semantic Cosine Retrieval    7-Day Activity Analysis
                           │
                           ▼
                 [ Jarvis Voice Output ]
                Web Speech API / Canvas Orb
```

---

## 🚀 Local Setup & Testing

### 1. Run Server Locally
```bash
# Serve via npx serve
npx serve . -l 3000
```
Open `http://localhost:3000` in your browser.

### 2. Run Automated Test Suite
```bash
npm test
```
*Executes all 10 automated test suites (100 notes pre-seeding, NLP entity extraction, RAG vector retrieval, resurfacing digest, CRUD operations).*

---

## 📄 License

Distributed under the MIT License.
