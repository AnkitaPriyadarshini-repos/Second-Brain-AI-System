# Architecture Decision Record (ADR) — Durable Indexing & Backend Evolution

## Status
Accepted / Phase-1 Implemented (Preserving Static + Vercel Serverless Gateway, with Staged Migration Roadmap)

## Context & Vision
Milo (Second Brain AI System) is evolving from a single-turn conversational assistant into a context-aware personal AI workspace inspired by the product capabilities of Onyx. Onyx utilizes an enterprise multi-service architecture (FastAPI backend, Celery task workers, Redis job queues, PostgreSQL relational state, and Vespa / OpenSearch / Qdrant vector indexing).

Milo currently runs on a high-speed, cost-effective, zero-maintenance architecture:
- Static HTML5/Vanilla JS frontend with responsive glassmorphism aesthetic and animated SVG mascot (Milo)
- Browser-side persistence (`IndexedDB` & `localStorage`) for complete personal data ownership and sub-millisecond retrieval
- Serverless AI Gateway (`/api/ai/gateway` on Vercel) for secure, key-protected Gemini model routing
- Client-side Hybrid Retrieval (`BM25` + TF-IDF Cosine Vector + Reciprocal Rank Fusion)

We need to evaluate whether and when to transition to a persistent server-side database and vector index.

---

## Architectural Comparison

| Dimension | Current Architecture (Static + Vercel Gateway) | Enterprise Architecture (Onyx Style: Postgres + Celery + Vector DB) |
| :--- | :--- | :--- |
| **Hosting & Infrastructure** | Free Vercel Serverless hobby/pro plan | Requires VPS/Kubernetes (e.g., AWS ECS, DigitalOcean Droplet, Render) |
| **Estimated Monthly Cost** | **$0 / month** (deployable on existing services) | **$45 – $120 / month** (Managed Postgres + Redis + Worker VM + Vector DB) |
| **User Privacy & Ownership** | **Maximum**: Notes & chats remain on the user device in encrypted browser storage | Moderate: Notes stored on central server database |
| **Operational Complexity** | Near Zero: Zero database migrations, zero backups, zero background worker monitoring | High: DB migrations, connection pooling, worker health checks, queue monitoring |
| **Retrieval Speed (<1,000 notes)** | **< 5ms** (Deterministic on-device BM25 + RRF) | 80 – 150ms (Network round-trip to remote vector DB) |
| **Scale Threshold (>20,000 documents)** | Browser memory constraints if indexing 100MB+ of PDF/DOCX corpora | Scales horizontally to millions of documents across distributed shards |
| **Multi-Device Synchronization** | Requires export/import file or client-side sync bridge | Instant server-side sync across authenticated user sessions |

---

## Decision

1. **Preserve Current Architecture for Release 1.0**:
   - Keep the static frontend + browser-side persistence + Vercel serverless gateway.
   - Implement the hybrid retrieval pipeline (BM25 + TF-IDF Vector + Reciprocal Rank Fusion + passage chunking) in client memory. For personal workspaces (< 5,000 notes), this provides **instant sub-10ms retrieval with zero server hosting bills**.
   - Implement real file extraction (TXT, MD, PDF, DOCX) and safe SSRF-protected website ingestion (`/api/ingest/url`).

2. **Connector & Repository Abstraction Layer**:
   - Encapsulate storage behind `DataRepositoryInterface` and data fetching behind `BaseConnector`.
   - Ensures zero frontend rewrites when migrating to a remote index.

3. **Staged Evolution Trigger (Phase 2 Roadmap)**:
   - Introduce PostgreSQL (`pgvector`) and background worker queues **only when**:
     a) Multi-device real-time sync with user authentication accounts is explicitly requested.
     b) A user's indexed document library exceeds 10,000 documents (requiring background chunking workers).
     c) Third-party cloud connectors (Google Drive, Notion, Slack) requiring OAuth webhook callbacks are activated.

---

## Security & Data Portability Guarantees
- **No Provider Key Leaks**: AI credentials (`GEMINI_API_KEY`) remain strictly on the serverless gateway.
- **SSRF Defense**: The URL ingestion route validates hostnames and bans loopback (`127.0.0.1`), private RFC1918 subnets, and cloud metadata endpoints (`169.254.169.254`).
- **Prompt Injection Neutralization**: Notes and external web content are scrubbed for instruction overrides before feeding to the LLM context.
- **Complete Data Portability**: Users can export their entire Second Brain (notes, chat threads, artifacts) as JSON or Markdown at any time.
