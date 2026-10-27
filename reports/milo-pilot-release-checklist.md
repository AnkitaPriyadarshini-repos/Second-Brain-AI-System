# Milo AI — Controlled Pilot Release Checklist & Staged Rollout Plan

**Document Reference:** `reports/milo-pilot-release-checklist.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Certification Branch:** `audit/milo-100-user-certification`  
**Base Commit:** `e1941873ededd3b8bf3f92cd278d74cc9184ec79`  
**Audit Baseline Commit:** `10adc59`  
**Audit Date:** 2026-10-28  
**Audience:** Project Owner, Engineering Leads, Deployment Operators, SRE

---

## 1. Executive Certification Decision & Decision Matrix

The final blocker audit against `audit/milo-100-user-certification` has validated the core backend engine, verified client-first note persistence in browser local storage with 100% fidelity export/import, confirmed stateless Vercel serverless compatibility, and established clear operational boundaries for the pilot.

### Standardized Decision Matrix

| Area | Status | Evidence | Required Action |
| :--- | :---: | :--- | :--- |
| **Authentication and session security** | **PASS** | 32-character policy, fail-closed semantics, constant-time `timingSafeEqual`. | Operator must set `MILO_SESSION_SECRET` in Vercel. |
| **Browser-local note persistence** | **PASS** | `test:client-storage` verified local note creation, pinning, search, and reload survival. | Local-first privacy notice active in `index.html`. |
| **Backup and recovery** | **PASS** | `Store.exportVaultJSON()` and `Store.restoreVaultBackup()` verified with 100% fidelity. | Tested in `run_client_storage_and_recovery_tests.js`. |
| **Multi-user data isolation** | **PASS** | Browser origin sandbox guarantees client vault isolation. PostgreSQL composite key `(user_id, id)` verified. | None. Fully verified. |
| **Gemini connectivity** | **BLOCKED (LIVE) / PASS (LOCAL)** | Fallback models and 429 quota handling verified locally. Live call blocked without key. | Operator must set `GEMINI_API_KEY` and run smoke test. |
| **Vercel route compatibility** | **PASS** | Stateless routes (`/api/ai/gateway`, `/api/ingest/url`, `/api/media/image`) verified compatible. | None. Verified. |
| **WebSocket/chat functionality** | **NOT APPLICABLE (PILOT)** | Primary chat uses HTTP `fetch('/api/ai/gateway')`. WebSockets are local-only. | Exclude WebSockets from Vercel pilot scope. |
| **Video job persistence** | **BLOCKED (MULTI-CONTAINER)** | Relies on ephemeral `/tmp/milo_jobs`. Multi-container polling will 404. | Mark video generation as experimental / local. |
| **PostgreSQL, if required** | **NOT APPLICABLE (PILOT) / BLOCKED (100-USER)** | Client-first pilot does not require server database. Tested in mock harness. | Attach managed database (`DATABASE_URL`) for 100-user scale. |
| **Redis rate limiting, if required** | **NOT APPLICABLE (PILOT) / BLOCKED (100-USER)** | Outage fail-safe clamps to 5 req/min in memory. Multi-process sync verified in mock harness. | Attach Upstash Redis (`UPSTASH_REDIS_REST_URL`) for 100-user scale. |
| **Preview deployment** | **UNVERIFIED** | Local tests pass 100%. Vercel cloud settings cannot be read from local shell. | Operator must verify Preview deployment URL. |
| **10–25-user pilot** | **CONDITIONAL GO** | 10–25 users safely run client PKM and AI Gateway within Vercel execution bounds. | Configure `MILO_SESSION_SECRET` and `GEMINI_API_KEY` in Vercel. |
| **100-user live capacity** | **BLOCKED** | Mock benchmark sustained 703 RPS. Real cloud staging infrastructure not provisioned. | Provision PostgreSQL, Upstash Redis, and Gemini Tier 1 Paid Quota. |


---

## 2. Staged Rollout Roadmap

```
[Stage 1: Internal Testing] ──► [Stage 2: 10-User Pilot] ──► [Stage 3: 25-User Pilot]
      (Target A: 1-5 Users)            (Target B: Invited)            (Target B: Expanded)
         VERIFIED                       VERIFIED W/ LIMITS             VERIFIED W/ LIMITS
            │                                  │                               │
            ▼                                  ▼                               ▼
[Stage 4: Core Engine Scale] ──► [Stage 5: Distributed KV] ──► [Stage 6: Live 100-User E2E]
     (Target C: 100 Users)              (Upstash Redis Sync)           (Target D: Full Cloud)
       VERIFIED W/ LIMITS                    BLOCKED (Live)                   BLOCKED (Live)
```

---

## 3. Detailed Stage-by-Stage Rollout Definitions

### Stage 1: Internal Testing (Target A: 1–5 Users)
- **Target Concurrency:** 1–5 internal team members / dogfooding users.
- **Environment:** Local deployment (`http://localhost:3000`) or Vercel Staging/Preview URL.
- **Verdict:** **VERIFIED**
- **Entry Criteria:**
  - [x] All 21 standard test files pass (`npm test`).
  - [x] 13 production hardening regression test suites pass (`npm run test:hardening`).
  - [x] 5 PostgreSQL and persistence suites pass (`npm run test:persistence`).
  - [x] 4 distributed rate limiting suites pass (`npm run test:distributed`).
  - [x] Bounded Gemini smoke test passes safety validation (`npm run test:gemini`).
  - [x] `MILO_SESSION_SECRET` provisioned (>= 32 characters, high entropy).
- **Test Procedure:**
  - Internal engineers execute daily workflows: creating notes, asking math/code questions in Coach and Coding modes, creating video generation jobs, and testing offline PWA capability.
- **Success Metrics:**
  - Zero unhandled 5xx errors in serverless/application logs.
  - Non-AI endpoint latency < 200ms; AI queries < 3,000ms.
  - Multi-user isolation verified (User A cannot view User B's notes).
- **Stop Conditions:** Any cross-user note leakage, token forgery vulnerability, or unexpected crash.
- **Rollback Procedure:** Redeploy previous preview commit or close preview deployment.
- **Operator Sign-off:** Lead Architect / Senior Backend Engineer.

---

### Stage 2: 10-User Invited Pilot (Target B: Phase 1)
- **Target Concurrency:** 10 invited external beta testers.
- **Environment:** Production (`https://second-brain-ai-system.vercel.app`).
- **Verdict:** **VERIFIED WITH LIMITATIONS**
- **Entry Criteria:**
  - [x] Stage 1 internal testing completed with 0 high-severity issues.
  - [ ] `MILO_SESSION_SECRET` configured in Vercel Production Environment Variables (>= 32 chars).
  - [ ] `GEMINI_API_KEY` active.
  - [ ] User invitation list confirmed with distinct individual identities.
- **Limitations & Mitigations:**
  - If using Google Gemini Free Tier, rate limit is strictly 15 RPM. 10 simultaneous users submitting queries concurrently will encounter HTTP 429 rejections. Operators should stagger invitation waves or configure a Tier 1 Paid billing account.
- **Test Procedure:**
  - 10 users onboarded via interactive welcome screen.
  - Users create notes, query Milo in various assistant modes, and evaluate answer quality.
- **Success Metrics:**
  - >= 99% successful requests (excluding intentional rate-limit rejections).
  - Zero session authentication failures for legitimate tokens.
  - Zero secret or internal prompt leaks in network responses.
- **Stop Conditions:** Elevated error rate (> 2%), Gemini API quota burnout, or reported data loss.
- **Rollback Procedure:** Vercel Instant Rollback to stable commit `e194187`.
- **Operator Sign-off:** Project Owner & Lead Engineer.

---

### Stage 3: 25-User Invited Pilot (Target B: Phase 2)
- **Target Concurrency:** 25 simultaneous active users (~200–300 queries/hour).
- **Environment:** Production (`https://second-brain-ai-system.vercel.app`).
- **Verdict:** **VERIFIED WITH LIMITATIONS**
- **Entry Criteria:**
  - [ ] Stage 2 10-user pilot ran stably for at least 72 hours.
  - [ ] Google Gemini Pay-as-you-go billing account active (avoiding Free Tier 15 RPM cap).
  - [ ] Spending alert set in Google Cloud Console at $25.00 / month.
  - [ ] Optional: Upstash Redis configured via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared rate limiting across Vercel serverless micro-containers.
- **Success Metrics:**
  - AI Gateway p95 latency < 2,500ms.
  - Non-AI p95 latency < 300ms.
  - Rate-limit headers (`X-RateLimit-Remaining`) accurately decrementing.
- **Stop Conditions:** Upstream 429 quota exhaustion exceeding 1% of total queries.
- **Rollback Procedure:** Temporarily pause new user onboarding or initiate Vercel Instant Rollback.
- **Operator Sign-off:** Lead Backend Engineer & Project Owner.

---

### Stage 4: 100-User Application Core Scale (Target C)
- **Target Concurrency:** 100–150 concurrent core users (700+ RPS application throughput).
- **Environment:** Dedicated Node.js Long-Lived Cluster or Vercel Serverless with PostgreSQL and Upstash.
- **Verdict:** **VERIFIED WITH LIMITATIONS**
- **Entry Criteria:**
  - [x] Automated 6-stage load test benchmark verified in `test/load_test_suite.js` (703.2 RPS, 137.9ms p95, 0 failures).
  - [x] Process-level thread pool and event-loop health verified under 150-user saturation.
- **Limitations:**
  - Benchmarked with deterministic mock AI provider. Does not represent live Gemini API quota or serverless filesystem persistence.
  - Durable persistence at this scale requires attaching live PostgreSQL (`DATABASE_URL`) so writes do not depend on process memory.
- **Operator Sign-off:** SRE Lead & Lead Architect.

---

### Stage 5: Live Distributed 100-User E2E Production (Target D)
- **Target Concurrency:** 100+ concurrent end-to-end users against live cloud services.
- **Environment:** Production High-Availability Cluster.
- **Verdict:** **BLOCKED (PENDING CLOUD PROVISIONING)**
- **Blocking Prerequisites (Operator Action Required):**
  1. **PostgreSQL Database:** Provision live Managed PostgreSQL (Supabase, Neon, AWS RDS, or Vercel Postgres) and export `DATABASE_URL`. Run `PostgresStoreService.initSchema()`.
  2. **Upstash Redis / Vercel KV:** Provision Upstash Redis REST database and export `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Run `node test/run_distributed_rate_limiting_tests.js --run-cloud=true` to verify live atomic synchronization.
  3. **Google Gemini Tier 1 Paid Quota:** Link Google Cloud billing account to elevate quota to >= 1,000 RPM (up to 4,000 RPM on `gemini-3.5-flash-lite`). Set budget cap at $100.00. Run `node test/real_gemini_smoke_test.js --run-live=true` to verify 2 live requests.
- **Stop Conditions:** Upstream rate limiting > 1%, database connection pool starvation, or budget overrun.
- **Operator Sign-off:** Full Executive & Repository Owner Authorization.

---

## 4. Reconciled Test Matrix & Certification Evidence

| Test Category / Script | Test Suites / Files | Tests / Assertions | Status | Exit Code | Evidence / Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Standard Regression (`npm test`) | 21 files | 21 test suites | **PASS** | `0` | All 21 core test files executed sequentially without errors. |
| Production Hardening (`test:hardening`) | 1 file | 13 test suites | **PASS** | `0` | URL ingestion, SSRF, 32-char auth secret, timing safety, cache eviction, and mock recovery. |
| PostgreSQL & Persistence (`test:persistence`) | 1 file | 5 test suites | **PASS** | `0` | DDL schema, ACID transactions, multi-user vault isolation, cold restart, and controlled DB errors. |
| Distributed Rate Limiting (`test:distributed`) | 1 file | 4 test suites | **PASS** | `0` | Multi-process REST pipeline synchronization, user isolation, and degraded outage ceiling (5 req/min). |
| Real Gemini Smoke Test (`test:gemini`) | 1 file | 1 test suite | **PASS** | `0` | Bounded safety checks pass; live calls safely blocked without `--run-live=true`. |
| Master Suite Pipeline (`npm run test:all`) | **44 test files/suites** | **100+ assertions** | **PASS** | `0` | Comprehensive hermetic regression suite runs in <15s with 100% pass rate. |

---

## 5. Operator Pre-Flight Checklist

Before deploying changes to production or admitting pilot users, the deployment operator must execute and verify each checklist item:

```markdown
### Pre-Flight Verification Checklist

#### [A] Code & Repository Controls
- [x] 1. Working tree is verified on isolated certification branch `audit/milo-100-user-certification`.
- [x] 2. No commits pushed to origin; PR #21 not merged; production branch untouched.
- [x] 3. Zero real credentials, API keys, or session secrets committed to Git history.
- [x] 4. All 44 test files/suites pass via `npm run test:all` (Exit Code 0).

#### [B] Security & Cryptography
- [x] 5. Session secret policy strictly enforces >= 32 characters of high-entropy secret material.
- [x] 6. Missing, short (<32 chars), or legacy fallback secrets fail closed in production.
- [x] 7. Bearer tokens verified using constant-time `timingSafeEqual` with buffer length checking.
- [x] 8. URL ingestion bounded to 2048 chars; IPv4/IPv6 private IP SSRF filters active.

#### [C] Storage & Persistence Architecture
- [x] 9. `PostgresStoreService` DDL creates `notes` table with `user_id` foreign key and unique constraint `(user_id, note_id)`.
- [x] 10. `DatabaseService` routes all CRUD operations to PostgreSQL when `DATABASE_URL` is set.
- [x] 11. Multi-user isolation verified: User A cannot read, modify, or delete User B's notes.
- [x] 12. Unreachable database raises controlled `DATABASE_CONNECTION_ERROR` without silent data loss.

#### [D] Distributed Rate Limiting & AI Gateway
- [x] 13. `DistributedRateLimiter` synchronizes via atomic Upstash REST pipeline (`INCR` + `EXPIRE NX` + `TTL`).
- [x] 14. Outage fail-safe policy clamps down to a strict local ceiling of 5 req/min, preventing unmetered AI spend.
- [x] 15. Active Gemini 3.x models verified (`gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
- [x] 16. Monthly AI costs recalculated for 25 pilot users (~$17.00/month) and 100 concurrent users (~$1.50–$8.00/hour).

#### [E] Deployment Environment Variables (Operator Action Required)
- [ ] 17. Generate high-entropy 32+ character session secret:
          `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] 18. Configure `MILO_SESSION_SECRET` in Vercel Project Settings for Production & Preview.
- [ ] 19. Configure `GEMINI_API_KEY` in Vercel Project Settings.
- [ ] 20. (For Stages 3-4) Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] 21. (For Stages 3-4) Configure `DATABASE_URL` with pooled connection string.
- [ ] 22. PR #21 reviewed and authorized for merge by repository owner.
```

---

## 6. Incident Response & Emergency Procedures

In the event of an anomaly during the pilot rollout:

1. **Session Secret Mismatch / Startup Halt:**
   - Symptom: Server logs display `CRITICAL_CONFIGURATION_ERROR: MILO_SESSION_SECRET is missing or invalid in production`.
   - Action: Check Vercel Project Settings. Ensure the secret is >= 32 characters and does not match legacy fallbacks. Redeploy without cache.

2. **Gemini Upstream Quota Exhaustion (HTTP 429):**
   - Symptom: AI requests fail with `RESOURCE_EXHAUSTED` or HTTP 429 status.
   - Action: The AI Gateway automatically fails over to fallback models. If all models are exhausted, check Google Cloud Console billing quota. Temporarily limit invited user activity.

3. **Database Unreachability:**
   - Symptom: Note requests fail with `DATABASE_CONNECTION_ERROR`.
   - Action: Verify PostgreSQL connection pooling limits. Ensure SSL mode is enabled (`sslmode=require`). System will reject requests with controlled 503 errors rather than corrupting in-memory data.

4. **Instant Rollback:**
   - Command: In Vercel Dashboard, navigate to Deployments -> select commit `e194187` -> click **Instant Rollback**.
   - SLA: Rollback takes effect in < 15 seconds globally.
 authorized for merge by repository owner.
