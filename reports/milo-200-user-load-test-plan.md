# Milo AI — 200+ User Load Testing Plan & Harness Architecture

**Document Reference:** `reports/milo-200-user-load-test-plan.md`  
**Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Branch:** `scalability/milo-200-user-certification`  
**Audited Commit SHA:** `2227728`  
**Date:** October 28, 2026  
**Auditor:** Performance Engineering & QA Lead  

---

## 1. Executive Summary & Strategy

The 200+ user load testing system for Milo AI is designed to validate system stability, concurrency handling, backpressure enforcement, latency characteristics, and data isolation under realistic multi-user workloads without exposing upstream AI budgets to uncontrolled cloud spend.

The harness maintains **three distinct, isolated test modes**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOAD TEST HARNESS MODES                               │
├────────────────────┬────────────────────────────────────────────────────────┤
│ Mode A:            │ In-process server mounting production route handlers.  │
│ Local Mock         │ Upstream AI provider is deterministically intercepted. │
│ Benchmark          │ Concurrency: 10, 25, 50, 100, 150, 200, 250, 300.     │
│                    │ Label: LOCAL MOCK — NOT CLOUD CERTIFICATION.           │
├────────────────────┼────────────────────────────────────────────────────────┤
│ Mode B:            │ Deployed Vercel Staging URL with synthetic users.      │
│ Real Staging       │ Gradual ramp: 10 → 25 → 50 → 100 → 150 → 200 → 250.   │
│ Application        │ Requires verified staging SHA and operator approval.   │
│                    │ Status: BLOCKED pending operator staging deployment.   │
├────────────────────┼────────────────────────────────────────────────────────┤
│ Mode C:            │ Strictly bounded live Google Gemini provider test.     │
│ Bounded Live AI    │ Enforces <= 2–3 sequential calls and $0.10 spend cap.  │
│ Validation         │ Status: BLOCKED pending operator live key approval.    │
└────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Realistic Multi-Step Virtual User Workflows

Each virtual user executes an 8-step synthetic workflow representing typical personal knowledge management and AI interactions:

```
[Virtual User] ──(1: GET /api/health)────────────────────────► 200 OK
      │
      ├──(2: POST /api/ai/gateway "Hello")──────────────────► 200 OK (Fast Model)
      │
      ├──(3: POST /api/ai/gateway + Context Notes)──────────► 200 OK (RAG Query)
      │
      ├──(4: POST /api/ai/gateway Rapid Burst)──────────────► 200 OK or 429 Limit
      │
      ├──(5: POST /api/media/video Action: Create)──────────► 202 Accepted (jobId)
      │
      ├──(6: POST /api/media/video Action: Status)──────────► 200 OK (Owner)
      │
      ├──(7: POST /api/media/video Intruder Token)──────────► 403 FORBIDDEN (Isolation Asserted)
      │
      └──(8: POST /api/media/video Action: Cancel)──────────► 200 OK (Cleanup)
```

### Detailed Workflow Step Definitions:
1. **Step 1: Application Health Probe (Non-AI)**  
   `GET /api/ai/health` and `GET /api/health` — Verifies HTTP connection pooling, router readiness, and response headers.
2. **Step 2: Low-Latency Greeting (AI Route)**  
   `POST /api/ai/gateway` with prompt `"Hello Milo, what is your system status?"` — Tests intent classification (`classifyRequest`), routing to `gemini-3.5-flash-lite`, and response serialization.
3. **Step 3: Private Memory Grounded Query (AI Route)**  
   `POST /api/ai/gateway` with synthetic private context note (`Confidential Architecture Doc for user X`). Tests relevance filtering, prompt construction, XML boundary protection, and citation tracking.
4. **Step 4: Rapid Burst Submission (Rate Limiting & Concurrency Guard)**  
   `POST /api/ai/gateway` with repeated prompt within <1 second. Asserts in-flight deduplication and per-client rate limiting (expected: HTTP 200 or HTTP 429).
5. **Step 5: Asynchronous Media Creation (Non-AI Core)**  
   `POST /api/media/video` `{ action: 'create' }` — Generates unique job ID, stores metadata in `JobStore`, and assigns user ownership.
6. **Step 6: Status Inquiry (Owner Token)**  
   `POST /api/media/video` `{ action: 'status', jobId }` — Retrieves job status using the authorized owner token.
7. **Step 7: Dynamic Security Intrusion Check (Crucial Isolation Gate)**  
   Synthetic intruder token (`intruder_<userId>`) attempts to query the job status. **Mandatory Acceptance Criterion:** Must return HTTP 403 Forbidden with zero data exposure.
8. **Step 8: Job Cancellation & Resource Cleanup**  
   `POST /api/media/video` `{ action: 'cancel', jobId }` — Marks job cancelled and frees active concurrency slots.

---

## 3. Concurrency Matrix & Ramp-Up Stages (Mode A)

The Mode A test harness executes a multi-stage ramp-up evaluating throughput, latency, memory stability, and isolation at each stage:

| Stage # | Target Concurrency | Target Requests | Arrival Stagger | Stage Objective |
| :---: | :---: | :---: | :---: | :--- |
| **Stage 1** | 10 Users | 80 | 3ms / user | Baseline engine sanity & minimal connection pool |
| **Stage 2** | 25 Users | 200 | 3ms / user | Low concurrency validation |
| **Stage 3** | 50 Users | 400 | 3ms / user | Moderate concurrency validation |
| **Stage 4** | 100 Users | 800 | 3ms / user | 100-user capacity gate |
| **Stage 5** | 150 Users | 1,200 | 3ms / user | Stress ramp-up towards 200 users |
| **Stage 6** | **200 Users** | **1,600** | **3ms / user** | **Target Capacity Certification Gate** |
| **Stage 7** | 250 Users | 2,000 | 3ms / user | Burst capacity spike (+25% over target) |
| **Stage 8** | 300 Users | 2,400 | 3ms / user | Extreme burst capacity peak (+50% over target) |
| **Stage 9** | 200 Users (x3) | 4,800 | 3ms / user | Sustained soak test across 3 successive waves |

---

## 4. Acceptance Criteria & Certification Gates

To pass each stage, the following criteria must be satisfied simultaneously:

1. **Success Rate:** $\ge 90.0\%$ (allowing for expected 429 rate-limiting during burst steps).
2. **Non-AI p95 Latency:** $< 2,500$ ms (target: $< 500$ ms for local mock).
3. **Data Isolation:** **Zero cross-user data leaks** (100% of intruder requests return HTTP 403).
4. **Memory Stability:** Zero progressive heap accumulation across successive soak waves.
5. **No Uncontrolled Crash:** Server must not exit, throw uncaught exceptions, or deadlock socket pools.

---

## 5. Mode B (Staging) & Mode C (Live AI) Protocols

### 5.1 Mode B: Staging Deployment Verification Protocol
- Target URL must be an authorized Vercel preview/staging domain (never production).
- Operator must verify that `MILO_SESSION_SECRET` is set in Vercel preview environment.
- Ramp gradually: 10 → 25 → 50 → 100 → 150 → 200 users.
- Automated stop condition if error rate exceeds 5% or latency exceeds 5 seconds.
- **Current Status: BLOCKED** pending staging URL deployment by operator.

### 5.2 Mode C: Bounded Live Provider Protocol
- Live provider test is strictly capped:
  - Maximum requests: 2–3 sequential calls.
  - Concurrency: 1–2 workers.
  - Spend cap: $0.10 hard ceiling.
  - Overall timeout: 10,000 ms.
- If `GEMINI_API_KEY` is missing or `--run-live=true` is omitted, the test safely skips with status `BLOCKED / SKIPPED`.
- **Current Status: BLOCKED / SKIPPED** to protect provider quotas and prevent unapproved billing.
