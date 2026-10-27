# Milo AI — Controlled Pilot Release Checklist & Staged Rollout Plan

**Document Reference:** `reports/milo-pilot-release-checklist.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Effective Date:** 2026-10-27  
**Audience:** Project Owner, Engineering Leads, Deployment Operators

---

## 1. Staged Rollout Overview

```
[Stage A: Local & Preview] ──► [Stage B: Internal Testing] ──► [Stage C: 10-User Pilot]
        │ (100% Passed)                 │ (1-5 Users)                  │ (Invited Cohort)
        ▼                               ▼                              ▼
[Stage D: 25-User Pilot]  ──► [Stage E: 50-User Scale]   ──► [Stage F: 100-User Multi-Instance]
        (Expanded Cohort)          (Distributed KV Backing)       (Postgres + Gemini Tier 1)
```

---

## 2. Stage-by-Stage Rollout Definitions

### Stage A: Local & Preview Verification
- **Target Concurrency:** 1 user (Automated harnesses)
- **Environment:** Local environment (`http://localhost:3000`) and Vercel Preview Deployments
- **Entry Criteria:**
  - [x] All 21 repository test suites pass (`npm test`).
  - [x] 13 production hardening regression tests pass (`node test/run_production_hardening_regression_tests.js`).
  - [x] Browser chat E2E release gate passes (`npm run test:e2e`).
  - [x] Welcome screen and assistant mode tests pass (`npm run test:welcome`).
- **Success Metrics:** Exit Code 0 across all suites; 0 test regressions.
- **Stop Conditions:** Any assertion failure, unhandled promise rejection, or secret exposure.
- **Operator Approval:** Automated CI / Local Developer sign-off.
- **Status:** **APPROVED & COMPLETED.**

---

### Stage B: Internal Testing (Dogfooding)
- **Target Concurrency:** 1–5 internal team users
- **Environment:** Staging / Vercel Preview URL
- **Entry Criteria:**
  - [x] Branch `audit/milo-100-user-certification` code reviewed.
  - [ ] `MILO_SESSION_SECRET` provisioned in Preview environment.
  - [ ] `GEMINI_API_KEY` active.
- **Test Procedure:**
  - Internal engineers execute daily workflows: creating notes, asking math/code questions in Coach and Coding modes, creating video generation jobs, and testing offline PWA capability.
- **Success Metrics:**
  - 0 unhandled 5xx errors in serverless logs.
  - Latency for non-AI queries < 200ms; AI queries < 3,000ms.
  - Note creation immediately reflected in UI list queries.
- **Stop Conditions:** Any cross-user note leakage, token forgery vulnerability, or unexpected crash.
- **Rollback Procedure:** Redeploy previous preview commit or close preview deployment.
- **Operator Approval:** Lead Architect approval.
- **Status:** **READY FOR EXECUTION (GO).**

---

### Stage C: 10-User Invited Pilot
- **Target Concurrency:** 10 invited external researchers / beta testers
- **Environment:** Production (`https://second-brain-ai-system.vercel.app`)
- **Entry Criteria:**
  - [ ] Stage B internal testing completed with 0 high-severity issues.
  - [ ] `MILO_SESSION_SECRET` configured in Vercel Production settings.
  - [ ] Google Gemini API key confirmed to have at least 15–60 RPM available.
  - [ ] User invitation list confirmed with distinct identities.
- **Test Procedure:**
  - 10 users onboarded via interactive welcome screen.
  - Users create notes, query Milo in various assistant modes, and evaluate answer quality.
- **Success Metrics:**
  - >= 99% successful requests (excluding intentional rate-limit rejections).
  - 0 session authentication failures for legitimate tokens.
  - 0 secret or internal prompt leaks in network responses.
- **Stop Conditions:** Elevated error rate (> 2%), Gemini API quota burnout, or reported data loss.
- **Rollback Procedure:** Vercel Instant Rollback to stable commit `e194187`.
- **Operator Approval:** Project Owner approval.
- **Status:** **APPROVED (CONDITIONAL GO ON SESSION SECRET CONFIGURATION).**

---

### Stage D: 25-User Invited Pilot
- **Target Concurrency:** 25 simultaneous users
- **Environment:** Production
- **Entry Criteria:**
  - [ ] Stage C 10-user pilot ran stably for at least 72 hours.
  - [ ] Google Gemini Pay-as-you-go billing account active (avoiding Free Tier 15 RPM cap).
  - [ ] Spending alert set in Google Cloud Console at $25.00.
- **Success Metrics:**
  - AI Gateway p95 latency < 2,500ms.
  - Non-AI p95 latency < 300ms.
  - Rate-limit headers (`X-RateLimit-Remaining`) accurately decrementing.
- **Stop Conditions:** Upstream 429 quota exhaustion exceeding 1% of total queries.
- **Rollback Procedure:** Temporarily reduce active invite count or initiate Vercel Instant Rollback.
- **Operator Approval:** Lead Backend Engineer & Project Owner.
- **Status:** **APPROVED (CONDITIONAL GO ON PAID GEMINI QUOTA).**

---

### Stage E: 50-User Scale Validation
- **Target Concurrency:** 50 simultaneous active users
- **Environment:** Production Multi-Instance
- **Entry Criteria:**
  - [ ] Stage D completed successfully.
  - [ ] **Infrastructure Prerequisite:** Connect Upstash Redis / Vercel KV for synchronized distributed token-bucket rate limiting across multiple serverless micro-containers.
  - [ ] Google Gemini Quota >= 500 RPM.
- **Success Metrics:**
  - Rate limiting correctly shared across different Vercel container instances.
  - Zero event-loop stalls under concurrent load.
- **Stop Conditions:** Redis connection timeout > 500ms or persistent rate-limit synchronization mismatch.
- **Operator Approval:** SRE Lead & Lead Architect.
- **Status:** **CONDITIONAL ON UPSTASH REDIS PROVISIONING.**

---

### Stage F: 100-Concurrent-User Multi-Instance Production
- **Target Concurrency:** 100+ simultaneous users (800+ requests per minute)
- **Environment:** Production High-Availability Cluster
- **Entry Criteria:**
  - [ ] **Infrastructure Prerequisite 1:** PostgreSQL (`DATABASE_URL`) provisioned and schema migrated using `services/PostgresStoreService.js` DDL for durable multi-instance note persistence.
  - [ ] **Infrastructure Prerequisite 2:** Google Gemini Pay-as-you-go Tier 1 quota verified (>= 1,000 RPM).
  - [ ] **Infrastructure Prerequisite 3:** Datadog / Vercel Log Drain configured with latency and 5xx alerts.
  - [ ] Stage 6 soak load test benchmark verified in production-like staging environment.
- **Success Metrics:**
  - Internal application throughput sustained at > 600 RPS with < 200ms p95 latency.
  - Zero lost writes or note sync discrepancies.
  - Zero security isolation violations.
- **Stop Conditions:** Any database connection exhaustion, sustained 5xx rate > 1%, or uncontrolled provider spend.
- **Rollback Procedure:** Automatic traffic diversion to read-only mode or instant deployment rollback.
- **Operator Approval:** Full Executive / Project Owner Authorization.
- **Status:** **CONDITIONAL GO (READY ONCE POSTGRES & GEMINI TIER 1 ARE CONNECTED).**

---

## 3. Operator Pre-Flight Checklist

Before deploying changes to production, the operator must verify each item:

- [x] 1. Working tree is clean on isolated branch `audit/milo-100-user-certification`.
- [x] 2. All 22 test suites pass with 0 failures (`npm test` and `node test/run_production_hardening_regression_tests.js`).
- [x] 3. Zero secrets, tokens, or private credentials committed to Git history.
- [x] 4. URL Ingestion rate limiting (15/min), length bounds (2048), and SSRF filters active.
- [x] 5. Cryptographic bearer tokens verified using timing-safe comparison (`timingSafeEqual`).
- [x] 6. Legacy predictable secret (`sb_second_brain_secure_jwt_secret_key_2026`) explicitly rejected.
- [x] 7. Imagen 3 timeout bounded to 22s to prevent Vercel 30s cutoff.
- [x] 8. Media job store disk cleanup throttled to 60s to prevent event-loop starvation.
- [x] 9. `NoteController` cache invalidated on note creation, pin toggling, and deletion.
- [x] 10. `js/storage-adapters.js` persistent `nodeStorage` singleton active in Node runtime.
- [ ] 11. `MILO_SESSION_SECRET` generated (`openssl rand -hex 32`) and pasted into Vercel Project Settings.
- [ ] 12. `GEMINI_API_KEY` pasted into Vercel Project Settings.
- [ ] 13. PR #21 reviewed and authorized for merge by repository owner.
