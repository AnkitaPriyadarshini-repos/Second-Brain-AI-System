# 🧠 Second Brain AI System (HGM-12)

> **A personal knowledge system that does not hinder learning.**  
> *Zero-Friction Multi-Surface Capture • Grounded Conversational RAG ("Talk to Jarvis") • Proactive Resurfacing • Interactive Knowledge Graph Network*

---

## 🌟 Overview & Philosophy

Existing Personal Knowledge Management (PKM) tools like Obsidian, Notion, and Roam suffer from a fundamental architectural flaw: **they are built around capture, but fail at retrieval and use.** Notes accumulate into a dumping ground, resurface rarely, and require manual tagging friction that destroys focus.

The **Second Brain AI System** fixes this by making **capture zero-friction across all devices** and making **retrieval as simple as asking a colleague out loud ("Talk to Jarvis")**.

---

## ✨ Deliverables & Core Features

### 1. ⚡ Zero-Friction Multi-Surface Capture Hub
Ingest knowledge from every surface without app-swapping or manual tagging:
- **Typing Note Entry**: Rich text note entry with live auto-tagging preview.
- **Voice Memo Recording**: Speech-to-text audio recording with live waveform visualizer & auto-transcription.
- **Browser Extension & Web Clipper**: One-click URL bookmarking with automated page summaries and text clipping.
- **File Upload (OCR)**: Drag-and-drop PDF and image parser simulating Tesseract OCR + PyMuPDF text extraction.
- **Email Forwarding**: Forward emails directly to your second brain address (`notes@brain.ai`).
- **Automated NLP Pipeline**: Auto-extracts entities (*People, Places, Concepts, Dates, Tech*) and topic labels without user effort.

### 2. 🎙️ Grounded Conversational RAG ("Talk to Jarvis")
Natural voice and text query interface built on top of a local vector similarity engine (TF-IDF & Cosine Similarity over note embeddings):
- **Zero Hallucination Guardrails**: Answers strictly using saved notes as source context.
- **Explicit Source Citations**: Every answer provides clickable citation links back to exact note sources.
- **Multi-Turn Session Memory**: Remembers context across follow-up queries (e.g. *"What did I save about deep learning last month?"* -> *"What else did I save on this topic?"*).
- **Spoken Audio Responses**: Built-in Speech Synthesis (TTS) with voice orb animations.

### 3. 💡 Daily Proactive Resurfacing Engine ("From your past notes")
Prevents your note vault from becoming a dumping ground:
- Analyzes 7-day activity vectors (recent queries, recent captures, viewed tags).
- Finds older notes (saved > 14 days ago) that are semantically relevant to current work but haven't been accessed recently.
- Generates 3–5 daily recommendation cards with contextual explanation badges.
- Supports Pin and Dismiss actions.

### 4. 🕸️ Interactive Knowledge Graph Network
- 2D force-directed HTML5 Canvas network.
- Automatically connects notes via shared NLP entities and topics.
- Interactive drag, pan, zoom, node selection, and note detail drawer modal.

### 5. 🔒 On-Device Privacy Mode
- Toggle for running voice transcription and embeddings 100% locally on-device.
- Audio and raw personal notes never leave your browser.

### 6. 📚 100 Pre-seeded Realistic Notes
- Pre-populated on first load with 100+ realistic personal notes across AI, urban planning, startup ideas, habit formation, sleep & memory, book highlights, and web clips.

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

## 🚀 Getting Started

### 1. Run Locally
No build step or complex compiler required! Serve using any simple HTTP server:

```bash
# Option A: npx serve
npx serve .

# Option B: Python HTTP server
python -m http.server 8000
```
Open `http://localhost:3000` (or `http://localhost:8000`) in any modern browser.

### 2. Run Automated Test Suite
Validate all 6 modules (100 notes pre-seeding, NLP entity extraction, RAG vector retrieval, resurfacing digest, CRUD operations):

```bash
npm test
```

---

## 🛠️ Tech Stack

| Component | Approach / Technology |
|---|---|
| **Frontend UI** | HTML5, ES6 JavaScript, Vanilla CSS (Glassmorphism Theme) |
| **Voice Interface** | Web Speech API (`SpeechRecognition`, `SpeechSynthesis`) & HTML5 Canvas Waveform |
| **NLP Engine** | Custom Regex & Rule-Based Named Entity Extractor, TF-IDF Vectorizer |
| **Vector Search / RAG** | Cosine Similarity Engine over Note Embeddings |
| **Graph Visualizer** | HTML5 Canvas 2D Physics-Based Force Layout |
| **Storage & Sync** | LocalStorage / IndexedDB with Event-Driven Sync Badge |
| **Testing** | Node.js Test Runner (`npm test`) |

---

## 📄 License

Distributed under the MIT License.
