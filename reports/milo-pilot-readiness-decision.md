# Milo AI — Controlled Pilot Readiness Decision & Release Gate

**Document Reference:** `reports/milo-pilot-readiness-decision.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Current Certified HEAD:** `08acb43`  
**Audit Timestamp:** 2026-10-28T00:48:00+05:30  
**Overall Release Verdict:** **CONDITIONAL GO**

---

## 1. Overall Status Decision

### **OVERALL DECISION: CONDITIONAL GO**

**Decision Rationale:**
- **Safe for Internal Testing & 10–25-User Pilot:** The core application security architecture, session token verification, prompt injection defense, SSRF blocking, client-side PKM storage, and AI Gateway failover logic have achieved a 100% pass rate across 44 automated test suites.
- **Conditions Precedent to Pilot Launch:** Release is conditional upon the deployment operator completing two mandatory administrative configuration actions in the Vercel dashboard:
  1. Provisioning a cryptographically random, high-entropy `MILO_SESSION_SECRET` (>= 32 characters).
  2. Provisioning an active `GEMINI_API_KEY` with Google Cloud billing alerts configured.
- **100+ Concurrent User Certification Remains Blocked:** Full certification for 100 concurrent live end-to-end users against cloud services is **BLOCKED** pending the provisioning of live PostgreSQL (`DATABASE_URL`), live Upstash Redis (`UPSTASH_REDIS_REST_URL`), and elevated Google Cloud Tier 1 quota (>= 1,000 RPM). A successful local mock benchmark (703 RPS) does not constitute proof of external cloud capacity.

---

## 2. Release Gate Decision Matrix

In accordance with Section 11 of the Certification Gate specifications, the status of every architectural area is classified below:

| Area | Status | Evidence | Remaining Blocker |
| :--- | :---: | :--- | :--- |
| **Regression Tests** | **PASS** | `npm test` passed 21 test files with Exit Code 0. `npm run test:all` passed all 44 test suites with Exit Code 0. | None. Fully verified. |
| **Session Security** | **PASS** | [services/AuthService.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/services/AuthService.js) and [api/auth-guard.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/auth-guard.js) strictly enforce 32-character secret minimum, fail closed on legacy secrets, and use `crypto.timingSafeEqual` with buffer length checking. | Operator must set `MILO_SESSION_SECRET` in Vercel. |
| **PostgreSQL Staging Persistence** | **BLOCKED (LIVE) / PASS (LOCAL)** | Hermetic multi-process test ([test/run_postgres_and_persistence_tests.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/run_postgres_and_persistence_tests.js)) verified DDL, transactions, cold restart, and user isolation. | `DATABASE_URL` is not provisioned in staging. Operator must attach managed PostgreSQL database. |
| **Redis Cross-Process Rate Limiting** | **BLOCKED (LIVE) / PASS (LOCAL)** | Multi-process test ([test/run_distributed_rate_limiting_tests.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/run_distributed_rate_limiting_tests.js)) verified atomic REST pipeline synchronization across 2 processes and 5 req/min outage degradation. | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set in staging. Operator must provision Upstash database. |
| **Live Gemini Smoke Test** | **BLOCKED / SKIPPED** | Spend-safe harness ([test/real_gemini_smoke_test.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/real_gemini_smoke_test.js)) validated safety bounds (max 2 reqs, 10s timeout, non-sensitive prompt). External call blocked without key and flag. | Operator must provide `GEMINI_API_KEY` and execute with `--run-live=true`. |
| **Serverless Architecture** | **VERIFIED WITH LIMITATIONS** | Stateless routes (`/api/ai/*`, `/api/ingest/*`) are verified compatible with Vercel. Browser notes use local storage. WebSockets and `/tmp`-based async video jobs require external KV/DB for multi-instance scaling. | Video job persistence requires Upstash Redis/Postgres. WebSockets require SSE or external broker on Vercel. |
| **10–25-User Staging Pilot** | **CONDITIONAL GO** | 10–25 users execute client-first PKM and stateless AI Gateway queries within Vercel's execution bounds. Local mock benchmark completed at 373.8 RPS with 100ms p95 latency and 0 errors. | Configure `MILO_SESSION_SECRET` and `GEMINI_API_KEY` in Vercel. Stagger invites if on Free Tier (15 RPM). |
| **100-User Staging Capacity** | **BLOCKED** | Mode A mock benchmark sustained 703.2 RPS at 100–150 concurrency. Mode B live staging test is blocked until staging infrastructure is attached. | Live external infrastructure (PostgreSQL, Upstash Redis, Gemini Tier 1 Paid Quota) is not yet provisioned. |
| **Monitoring and Rollback** | **PASS** | Vercel Instant Rollback to commit `e194187` verified. Controlled error payloads with redacted secrets verified. Runbook updated in `reports/milo-production-runbook.md`. | Operator must configure Google Cloud budget alert ($25.00) in console. |

---

## 3. Mandatory Questions & Direct Responses

### 1. Is Milo safe for internal testing?
**YES (VERIFIED).**  
Milo is completely safe for internal testing with 1–5 team members. All 44 automated test suites pass with zero regressions. Bearer token cryptographic verification, URL ingestion SSRF protection, prompt injection defenses, and cache isolation are strictly active. Internal testers can run locally (`npm start`) or on a private Vercel Preview URL.

### 2. Is Milo ready for a 10–25-user external pilot right now?
**CONDITIONAL GO.**  
Milo is ready for the 10–25-user pilot as soon as the operator completes the two required Vercel environment configurations:
1. Generate and configure `MILO_SESSION_SECRET` (>= 32 random characters).
2. Configure `GEMINI_API_KEY`.
Because the web app uses a Client-First PKM architecture (notes are stored in browser `localStorage` and sent with prompt context), notes persist safely for individual users without requiring a centralized database during the pilot. However, if using the Google Gemini Free Tier, users must be invited in staggered batches because the Free Tier is capped at 15 RPM.

### 3. Is Milo certified for 100 concurrent real users right now?
**NO (BLOCKED).**  
The application core engine is certified at 703.2 RPS and 100–150 concurrency under deterministic local mock workloads. However, the system is **NOT** certified for 100 concurrent real users against live cloud services because:
- Live PostgreSQL is not connected (server-side note persistence cannot survive container recycles).
- Live Upstash Redis is not connected (rate limits cannot synchronize across multiple Vercel containers).
- Upstream Gemini Free Tier (15 RPM) will experience instantaneous HTTP 429 burnout under 100 concurrent users.

### 4. Which checks were performed against live staging infrastructure?
**None were executed against live external cloud resources.**  
During the environment audit, the test runner verified that `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `GEMINI_API_KEY` are not set in the local execution context. In accordance with strict certification safety protocols, tests refused to substitute fake data or send unauthenticated traffic, cleanly classifying live staging checks as **BLOCKED**.

### 5. Which checks used mocks or local services?
The following test suites executed against local in-process services or deterministic mocks:
- `npm test`: 21 test files used mock AI responses and simulated DOM environments.
- `npm run test:hardening`: Suite 13 used simulated 429 quota exhaustion.
- `npm run test:persistence`: Suites 1–5 used an in-memory mock PostgreSQL store and local file cold-restart simulations.
- `npm run test:distributed`: Suites 1–3 used a local atomic mock Upstash Redis HTTP server listening on `127.0.0.1`.
- `node test/load_test_suite.js --stages`: Executed in Mode A (Local test server with mock AI gateway).

### 6. What exact actions must the operator complete next?
The operator must execute the following sequential steps (detailed in `reports/milo-operator-actions.md`):
1. **Generate Session Secret:** Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to create a 64-character hex secret.
2. **Configure Vercel Environment Variables:** Add `MILO_SESSION_SECRET` and `GEMINI_API_KEY` to Vercel Project Settings for Production and Preview.
3. **Run Live Gemini Smoke Test:** Execute `GEMINI_API_KEY=<key> node test/real_gemini_smoke_test.js --run-live=true` to verify 2 live requests.
4. **Deploy Preview & Verify Pilot Cohort:** Deploy commit `08acb43` to a Vercel Preview URL and invite 10 users.

### 7. What evidence would change the decision to GO?
To transition the overall verdict from **CONDITIONAL GO** to an unconditional **GO** for full 100-user production:
1. Direct observation of `MILO_SESSION_SECRET` and `GEMINI_API_KEY` active in production logs with 0 startup errors.
2. Execution of `node test/real_gemini_smoke_test.js --run-live=true` returning HTTP 200 on 2 sequential live calls with < 2,000ms latency.
3. Provisioning of managed PostgreSQL with `npm run test:persistence` passing against the live database URL.
4. Provisioning of Upstash Redis with `node test/run_distributed_rate_limiting_tests.js --run-cloud=true` passing against the live REST endpoint.
5. Successful execution of `node test/load_test_suite.js --mode=B --target=<staging_url> --concurrency=100` sustaining < 2,500ms p95 latency and < 1% error rate.
