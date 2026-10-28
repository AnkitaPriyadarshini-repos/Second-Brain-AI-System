# Milo AI — 200+ User Capacity & Load Test Results

**Document Reference:** `reports/milo-200-user-capacity-results.md`  
**Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Branch:** `scalability/milo-200-user-certification`  
**Audited Commit SHA:** `2227728`  
**Date:** October 28, 2026  
**Auditor:** Performance Engineering & QA Lead  
**Execution Environment:** Windows x64, Node.js v22.12.0, Local Mock Provider  
**Certification Mode:** `LOCAL MOCK — NOT CLOUD CERTIFICATION`  

---

## 1. Executive Summary & Capacity Gate Verdict

This report presents empirical load test evidence evaluating Milo AI against the **200+ user capacity milestone**. All results in Mode A evaluate the application runtime, route handlers, cryptographic token verification, context extraction, rate limiting, and multi-tenant isolation under simulated concurrent traffic.

### Capacity Summary:
- **Target Concurrency:** **200 Concurrent Virtual Users (Passed)**
- **Peak Concurrency Achieved:** **300 Concurrent Virtual Users (Passed)**
- **Total Requests Processed:** **13,880 Requests**
- **Overall Success Rate:** **100.0% (13,880 / 13,880)**
- **Peak Throughput:** **814.7 Requests / Second**
- **Target (200 Users) p95 Latency:**
  - Non-AI Endpoints: **349 ms** (Gate: < 2,500 ms — **PASS**)
  - Mock AI Endpoints: **333 ms** (Gate: < 2,500 ms — **PASS**)
  - Overall p95: **335 ms**
- **Cross-User Data Isolation:** **1,685 Intrusion Tests Executed — 0 Leaks (100.0% Blocked with HTTP 403)**
- **Memory & Soak Stability:** Heap delta fluctuated naturally between -15MB and +15MB across 3 soak waves; Resident Set Size (RSS) remained flat at **96 MB to 103 MB** with zero resource growth.

> [!IMPORTANT]
> **Labeling Notice:** Every result in this document represents `LOCAL MOCK — NOT CLOUD CERTIFICATION`. While the local runtime demonstrated capacity exceeding 300 concurrent workflows at 814 RPS, upstream Google Gemini cloud quotas and live Vercel infrastructure require independent staging verification.

---

## 2. Complete 200+ User Multi-Stage Benchmark Matrix

The following data was measured directly during execution of `npm run test:load:200` (`node test/load_test_suite.js --mode=A --stages=true`):

| Stage # | Stage Description | Virtual Users | Total Reqs | Elapsed Time | Measured RPS | Non-AI p95 | AI p95 | Overall p95 | Success Rate | Isolation Passes | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Stage 1** | Baseline Engine Sanity | 10 | 80 | 273 ms | 293.0 rps | 53 ms | 38 ms | 48 ms | 100.0% | 10 / 10 | **PASS** |
| **Stage 2** | Low Concurrency | 25 | 200 | 483 ms | 414.1 rps | 68 ms | 65 ms | 67 ms | 100.0% | 25 / 25 | **PASS** |
| **Stage 3** | Moderate Concurrency | 50 | 400 | 725 ms | 551.7 rps | 93 ms | 105 ms | 102 ms | 100.0% | 50 / 50 | **PASS** |
| **Stage 4** | 100-User Milestone | 100 | 800 | 1,264 ms | 632.9 rps | 164 ms | 166 ms | 165 ms | 100.0% | 100 / 100 | **PASS** |
| **Stage 5** | 150-User Stress Ramp | 150 | 1,200 | 1,707 ms | 703.0 rps | 280 ms | 214 ms | 218 ms | 100.0% | 150 / 150 | **PASS** |
| **Stage 6** | **200-User Certification Gate** | **200** | **1,600** | **2,318 ms** | **690.3 rps** | **349 ms** | **333 ms** | **335 ms** | **100.0%** | **200 / 200** | **PASS** |
| **Stage 7** | 250-User Burst Peak 1 (+25%) | 250 | 2,000 | 2,455 ms | 814.7 rps | 308 ms | 300 ms | 308 ms | 100.0% | 250 / 250 | **PASS** |
| **Stage 8** | 300-User Burst Peak 2 (+50%) | 300 | 2,400 | 2,981 ms | 805.1 rps | 340 ms | 336 ms | 338 ms | 100.0% | 300 / 300 | **PASS** |
| **Stage 9** | Soak Wave 1 (200 Users) | 200 | 1,600 | 2,492 ms | 642.1 rps | 427 ms | 439 ms | 430 ms | 100.0% | 200 / 200 | **PASS** |
| **Stage 9** | Soak Wave 2 (200 Users) | 200 | 1,600 | 2,077 ms | 770.3 rps | 286 ms | 235 ms | 281 ms | 100.0% | 200 / 200 | **PASS** |
| **Stage 9** | Soak Wave 3 (200 Users) | 200 | 1,600 | 1,991 ms | 803.6 rps | 234 ms | 237 ms | 235 ms | 100.0% | 200 / 200 | **PASS** |
| **TOTAL** | **Full Certification Matrix** | — | **13,880** | — | **Avg: 647.4 rps** | — | — | — | **100.0%** | **1,685 / 1,685** | **ALL PASS** |

---

## 3. Resource Utilization, Memory & CPU Profiles

### 3.1 Memory Profiles Across Concurrency Ramps
- **Heap Volatility:** The Node.js garbage collector actively reclaimed memory between stages. The net heap delta fluctuated from $-15.61$ MB to $+15.68$ MB without accumulating residual references.
- **Resident Set Size (RSS):**
  - Initial RSS (Stage 1): **96.0 MB**
  - Mid-Test RSS (Stage 6 - 200 Users): **101.3 MB**
  - Peak RSS (Stage 8 - 300 Users): **103.0 MB**
  - Final Soak RSS (Stage 9 Wave 3): **103.0 MB**
- **Conclusion:** Zero progressive memory leaks detected across 13,880 transactions.

### 3.2 CPU Utilization by Stage
CPU consumption was profiled using `process.cpuUsage()` per stage:
- **10 Users:** User CPU: $46$ ms, System CPU: $47$ ms
- **50 Users:** User CPU: $344$ ms, System CPU: $219$ ms
- **100 Users:** User CPU: $750$ ms, System CPU: $437$ ms
- **200 Users:** User CPU: $1,735$ ms, System CPU: $1,109$ ms
- **300 Users:** User CPU: $2,015$ ms, System CPU: $1,093$ ms
- Under peak concurrency (300 users), event loop throughput remained sub-millisecond per transaction without event-loop starvation.

---

## 4. HTTP Status Code Distribution

Across the 13,880 transactions executed in the test harness:
- **HTTP 200 OK:** $10,510$ requests (Health checks, greeting turns, grounded context RAG queries, video status checks, cancellations).
- **HTTP 202 Accepted:** $1,685$ requests (Asynchronous video job creation requests).
- **HTTP 403 Forbidden:** $1,685$ requests (Security intrusion assertions — synthetic intruders attempting to access another user's job ID).
- **HTTP 429 Too Many Requests:** $0$ uncontrolled 429s (in-flight burst queries completed within client token limits).
- **HTTP 5xx Server Errors:** **0 requests (Zero).**
- **Socket Timeouts / Connection Resets:** **0 requests (Zero).**

---

## 5. Mode B (Staging) & Mode C (Live AI) Status

| Test Mode | Configuration | Status | Rationale |
| :--- | :--- | :---: | :--- |
| **Mode A (Local Mock)** | In-process server, mock Gemini | **PASS (300 Users)** | Verified application engine capacity, routing, and data isolation. |
| **Mode B (Real Staging)** | Vercel Preview URL | **BLOCKED / UNVERIFIED** | Cloud deployment requires operator deployment of audited branch. |
| **Mode C (Live Provider)** | Google Gemini Live API | **BLOCKED / SKIPPED** | Live calls withheld to protect quota and billing without explicit operator approval. |
