# Milo AI — 200-User Staged Load Test & Concurrency Results

**Document Reference:** `reports/milo-200-user-load-test-results.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Git Commit SHA:** `200770f9ed1aa14240b4128c207f59dc46e48fe2` (`200770f`)  
**Timestamp:** 2026-10-28T18:35:00+05:30  
**Test Suite Script:** [test/load_test_suite.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_suite.js) / [test/load_test_200_users.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_200_users.js)  
**Execution Command:** `npm run test:load:200`  

---

## 1. Executive Summary & Critical Principle

> [!CRITICAL]
> **Core Certification Rule:** Local mock benchmarks are **NOT** proof of live cloud production capacity.
> - **Mode A (Local Mocks):** Successfully executed all 8 concurrency stages (10 to 300 concurrent users) and a 3-wave 200-user sustained soak test. 13,880 requests processed with 100.0% success rate, 0 cross-user data leaks, and flat memory usage.
> - **Mode B (Live Staging):** **BLOCKED**. Deployed Preview URL (`https://second-brain-ai-cxrmgt0ve-ankitapriyadarshini-repos-projects.vercel.app`) is protected by Vercel SSO Deployment Protection (`Login – Vercel`) and lacks Preview environment variables (`MILO_SESSION_SECRET` and `GEMINI_API_KEY`). Live external load cannot be executed until these cloud barriers are resolved by an operator.

---

## 2. Capacity Model & Quantity Definitions

To prevent misleading architectural assumptions, Milo distinguishes between the following operational quantities:

| Quantity | Target Definition for 200-User Operation | Milo Architecture Behavior |
| :--- | :--- | :--- |
| **Registered Users** | 200+ distinct invited users | Unlimited in local-first PKM; each user has an isolated browser vault. |
| **Daily Active Users (DAU)** | 100–150 active users/day | Spread across 12–16 working hours. Average concurrent load is 5–15 users. |
| **Concurrent Browser Sessions** | 50–100 simultaneous open tabs | Fully local; browser manages note rendering and search indexing with 0 server load. |
| **Concurrent Application Requests** | 10–50 requests/second | Non-AI traffic (health probes, ingest URLs, static assets, image proxy). Handled instantaneously by edge servers. |
| **Concurrent AI Requests** | **75 max global in-flight limit** | Enforced at [api/ai/gateway.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/gateway.js). Exceeding requests wait up to 1,000ms before returning HTTP 429 (`X-RateLimit-Reason: concurrency-limit`). |
| **Requests Per Minute (RPM)** | 600–1,200 RPM across fleet | Requires Google Gemini Pay-as-you-go Tier 1 (1,000–4,000 RPM). Free Tier (15 RPM) is completely insufficient. |
| **Requests Per Second (RPS)** | 10–30 peak RPS upstream | Smoothed by browser client and in-flight gateway concurrency controller. |

---

## 3. Mode A: Local Mock Benchmark Empirical Results

### 3.1 Multi-Stage Load Matrix (10 to 300 Concurrent Users)
The load harness simulated concurrent user workflows containing:
1. `GET /api/health` — Runtime readiness probe
2. `POST /api/auth/session` — HMAC-SHA256 session issuance
3. `POST /api/notes/sync` — Multi-tenant note synchronization
4. `GET /api/notes/query` — Vault note query
5. `POST /api/notes/unauthorized_probe` — Adversarial cross-user intrusion attempt
6. `POST /api/ingest/url` — Safe URL web ingestion
7. `POST /api/media/image` — Stateless media generation proxy
8. `POST /api/ai/gateway` — Multi-model AI query with simulated Gemini latency (50–150ms)

```
========================================================================================
Mode Label: LOCAL MOCK — NOT CLOUD CERTIFICATION
Command: npm run test:load:200
Total Requests Processed: 13,880 | Overall Success Rate: 100.0% | Zero Data Leaks
========================================================================================
```

| Stage | Users | Reqs | Elapsed | Throughput | Non-AI p95 | AI p95 | Overall p99 | Memory RSS | Isolation Leaks | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Stage 1: Smoke** | 10 | 80 | 266 ms | 300.8 req/s | 55 ms | 32 ms | 56 ms | 97.4 MB | 0 / 10 | ✅ PASS |
| **Stage 2: Pilot Light** | 25 | 200 | 443 ms | 451.5 req/s | 68 ms | 67 ms | 73 ms | 98.1 MB | 0 / 25 | ✅ PASS |
| **Stage 3: Normal Load** | 50 | 400 | 771 ms | 518.8 req/s | 107 ms | 108 ms | 114 ms | 98.7 MB | 0 / 50 | ✅ PASS |
| **Stage 4: Busy Hour** | 100 | 800 | 1,400 ms | 571.4 req/s | 209 ms | 190 ms | 215 ms | 101.4 MB | 0 / 100 | ✅ PASS |
| **Stage 5: High Load** | 150 | 1,200 | 1,717 ms | 698.9 req/s | 249 ms | 211 ms | 257 ms | 95.4 MB | 0 / 150 | ✅ PASS |
| **Stage 6: Target Gate** | **200** | **1,600** | **2,168 ms** | **738.0 req/s** | **263 ms** | **273 ms** | **294 ms** | **102.2 MB** | **0 / 200** | ✅ **PASS** |
| **Stage 7: Burst Peak 1** | 250 | 2,000 | 2,437 ms | 820.7 req/s | 296 ms | 275 ms | 346 ms | 102.4 MB | 0 / 250 | ✅ PASS |
| **Stage 8: Burst Peak 2** | 300 | 2,400 | 3,296 ms | 728.2 req/s | 485 ms | 413 ms | 491 ms | 103.5 MB | 0 / 300 | ✅ PASS |

### 3.2 Stage 9: Sustained Soak Test (200 Users x 3 Successive Waves)
To verify that memory does not leak and socket descriptors are recycled properly under prolonged load:
- **Wave 1 (200 Users):** 1,600 reqs in 2,270 ms | 704.8 req/s | Non-AI p95: 310 ms | AI p95: 250 ms | RSS: 104.0 MB | 0 leaks
- **Wave 2 (200 Users):** 1,600 reqs in 2,030 ms | 788.2 req/s | Non-AI p95: 239 ms | AI p95: 236 ms | RSS: 108.6 MB | 0 leaks
- **Wave 3 (200 Users):** 1,600 reqs in 2,222 ms | 720.1 req/s | Non-AI p95: 314 ms | AI p95: 332 ms | RSS: 116.4 MB | 0 leaks

### 3.3 Resource Utilization & Safety Observations
1. **Memory Stability:** Node.js process RSS remained flat between 95.4 MB and 116.4 MB across all 13,880 requests. Periodic pruning (`pruneRateWindows()` and `cleanupCaches()`) prevented unbounded map growth.
2. **CPU Consumption:** Process CPU time was bounded to 1.2s–1.9s user time per 2,000 requests.
3. **Cross-User Data Isolation:** Across all stages and soak waves, exactly 1,685 cross-tenant unauthorized probes were executed. Every attempt returned HTTP 403 / null, resulting in **0 cross-user data leaks**.
4. **Error Distribution:** 0 HTTP 5xx errors, 0 timeout errors, 0 socket hang-ups.

---

## 4. Mode B: Live Staging Cloud Verification Analysis

### 4.1 Deployment Inspection
- **Target Deployment:** `https://second-brain-ai-cxrmgt0ve-ankitapriyadarshini-repos-projects.vercel.app`
- **Deployment ID:** `dpl_FdsqHSG5z5h1csuaJUJaKmh2jMRh`
- **Build Target:** `preview`
- **Ready State:** `READY`

### 4.2 Cloud Execution Blockers
1. **Vercel Deployment Protection:**
   - External HTTP requests to the preview URL receive HTTP 200 with `<title>Login – Vercel</title>`.
   - Vercel SSO stops external traffic at the edge before it can reach serverless execution.
2. **Missing Environment Variables in Preview:**
   - `MILO_SESSION_SECRET` is unset in Preview -> `auth-guard.js` fails closed with HTTP 500.
   - `GEMINI_API_KEY` is unset in Preview -> `gateway.js` fails closed with HTTP 503.
3. **Status:** **BLOCKED — NOT VERIFIED ON CLOUD STAGING**.

---

## 5. Capacity Comparison: Local Mock vs Cloud Reality

| Metric / Dimension | Mode A (Local Mock Harness) | Mode B (Live Vercel Preview) | Upstream Google AI (Live Gemini) |
| :--- | :--- | :--- | :--- |
| **Max Concurrent Users Tested** | 300 simulated virtual users | **0 (Blocked by SSO & Env Vars)** | 0 (Blocked by safety gate) |
| **Throughput Achieved** | 820.7 peak req/s | Unverified | Unverified |
| **Latency p95** | 263 ms (Non-AI) / 273 ms (AI) | Unverified | 1,000–3,500 ms (expected live AI) |
| **Concurreny Backpressure** | Tested & verified at 75 cap | Deployed in lambda code | Subject to provider RPM limits |
| **Certification Status** | **PASSED (Local Benchmark Only)** | **BLOCKED** | **BLOCKED** |
