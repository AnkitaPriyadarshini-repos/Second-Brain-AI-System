# Milo AI — Staging-Only Verification Plan & Pilot Rollout Protocol

**Document Reference:** `reports/milo-staging-verification-plan.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audit Baseline Commit:** `10adc59`  
**Date:** 2026-10-28T01:21:00+05:30  
**Target Audience:** SRE Lead, Deployment Operators, QA Automation Lead

---

## 1. Staging-Only Verification Protocol Overview

This document defines the staging verification sequence required before admitting pilot users and establishes clear boundaries between the **10–25-user invited pilot** and **100-user high-concurrency production**.

```
[Phase 1: Local Regression] ──► [Phase 2: Preview Deployment] ──► [Phase 3: Pilot Rehearsal] ──► [Phase 4: 100-User Cloud Gate]
      (100% Hermetic Pass)            (Vercel Preview URL)             (10-25 Invited Cohort)            (Postgres + Redis + Tier 1)
           VERIFIED                        OPERATOR ACTION                 CONDITIONAL GO                       BLOCKED
```

---

## 2. Phase-by-Phase Verification Execution

### Phase 1: Local Regression Pipeline (Executed & Verified)
- **Objective:** Ensure all unit, integration, security, and persistence tests pass without regressions before touching staging.
- **Commands Executed:**
  ```bash
  npm test
  npm run test:hardening
  npm run test:persistence
  npm run test:client-storage
  npm run test:distributed
  npm run test:gemini
  npm run test:all
  ```
- **Exit Code:** `0` across all suites.
- **Passed Suites:** 45 unique test files and suites; zero failures; zero leaked credentials.
- **Status:** **PASS (COMPLETED).**

---

### Phase 2: Vercel Preview Deployment Verification (Operator Action)
- **Objective:** Verify deployed application routes and runtime configuration in an isolated Vercel Preview environment prior to touching production.
- **Prerequisites:**
  1. Generate a high-entropy 32-character session secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
  2. In Vercel Project Settings -> Environment Variables, configure:
     - `MILO_SESSION_SECRET` (Preview and Production)
     - `GEMINI_API_KEY` (Preview and Production)
  3. Deploy branch `audit/milo-100-user-certification` to a **Vercel Preview Deployment** (do NOT merge PR #21 or push to `main`).
- **Preview Route Acceptance Checks:**
  - `GET https://<preview-url>/api/ai/health`: Returns HTTP 200 `{ ok: true, service: "milo-ai-gateway", configured: true }`.
  - `POST https://<preview-url>/api/ai/gateway` with synthetic prompt: Returns HTTP 200 with answer and citations.
  - `POST https://<preview-url>/api/ingest/url`: Verify SSRF blocking on private IP `127.0.0.1` returns HTTP 400.
  - Verify zero real user data or test tokens are exposed in public endpoints.
- **Status:** **UNVERIFIED (PENDING OPERATOR CONFIGURATION).**

---

### Phase 3: Controlled Pilot Rehearsal (10–25 Users)
- **Target Concurrency:** 10–25 simultaneous invited users (~150–500 queries/day).
- **Workload Pattern:**
  - Users create, pin, and search personal notes in the browser vault.
  - Users ask questions across the 4 assistant modes (Milo, Coach, Research, Coding).
  - Users test JSON vault export and restore.
- **Acceptance Thresholds:**
  - Overall HTTP error rate < 1.0% (excluding intentional 429 rate limit tests).
  - Non-AI endpoint latency < 200 ms.
  - AI Gateway p95 latency < 2,500 ms (excluding provider-dependent streaming exceptions).
  - Zero cross-user data leakage (verified by client origin isolation).
- **Stop & Abort Triggers:**
  - Any report of cross-user data leakage.
  - Upstream Google Gemini quota burnout (sustained HTTP 429 > 2%).
  - Unexpected spending rate exceeding $5.00/day.
- **Status:** **CONDITIONAL GO (READY ON PHASE 2 COMPLETION).**

---

### Phase 4: 100-User Cloud Capacity Certification
- **Target Concurrency:** 100+ concurrent live users (800+ requests per minute).
- **Mandatory Cloud Prerequisites:**
  1. Managed PostgreSQL database provisioned with composite primary key `(user_id, id)` and connection pooling (`DATABASE_URL`).
  2. Upstash Redis REST database provisioned with atomic pipelines for distributed rate limiting (`UPSTASH_REDIS_REST_URL`).
  3. Google Cloud Pay-as-you-go Tier 1 quota verified (>= 1,000 RPM) to prevent HTTP 429 exhaustion.
- **Staging Test Command:**
  ```bash
  node test/load_test_suite.js --mode=B --target=https://<staging-url> --concurrency=100
  ```
- **Current Status:** **BLOCKED.** A local mock benchmark cannot certify external cloud capacity. Remains blocked until staging infrastructure is provisioned and authorized.

---

## 3. Monitoring, Privacy & Emergency Procedures

### 3.1 Monitoring & Alerting
1. **Google Cloud Spending Alert:**
   - Configure a budget alert at **$25.00 / month** in the Google Cloud Console.
   - Set warning emails at 50% ($12.50) and 80% ($20.00).
2. **Vercel Function Error Monitoring:**
   - Monitor Vercel Runtime Logs for 5xx status codes or unhandled exceptions.
   - Verify that all logged errors display `Key [REDACTED]` and never expose API keys or session secrets.

### 3.2 Privacy & Data Boundaries
1. **Local-First Boundary:** User notes are never stored on a centralized server database during the pilot.
2. **Context Minimization:** Only top 3–5 matching notes are sent to the AI Gateway for prompt grounding.
3. **User Communication:** The settings panel informs users that notes reside in the browser and should be exported as JSON before clearing browser history.

### 3.3 Emergency Incident & Rollback Playbook
1. **Incident: Upstream Gemini Quota Burnout (HTTP 429)**
   - The AI Gateway automatically fails over across 3 backup models (`gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
   - If all fail, a clear notice is shown with a Retry button.
   - Operator action: Check Google Cloud billing quota or temporarily pause new user invitations.
2. **Incident: Secret Mismatch / Startup Halt**
   - If `MILO_SESSION_SECRET` is invalid, server returns HTTP 500/503.
   - Operator action: Verify that the secret is at least 32 characters in Vercel settings and redeploy without build cache.
3. **Emergency Rollback (< 15 Seconds)**
   - Open Vercel Dashboard -> Deployments.
   - Select stable base commit `e194187`.
   - Click `...` -> **Instant Rollback**.
   - Traffic is redirected globally in < 15 seconds.
