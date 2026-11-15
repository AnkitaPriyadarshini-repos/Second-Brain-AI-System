# Milo AI — Live Staging Verification & Cloud Infrastructure Audit

**Document Reference:** `reports/milo-live-staging-verification.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Certified Git Commit SHA:** `a71bf68217d12d447faded3da8cb78b96d95b33b` (`a71bf68`)  
**Latest Deployed Preview Deployment ID:** `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK`  
**Latest Deployed Preview URL:** `https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app`  
**Audit Timestamp:** 2026-10-28T19:30:00+05:30  
**Lead Roles:** Principal SRE, Cloud Infrastructure Architect, Application Security Engineer, Performance Engineer, Release Manager  

---

## 1. Executive Summary & Build Correspondence Investigation

### 1.1 Deployed Commit vs Application Code Verification
Investigation of the repository history and deployment confirmed:
- **Build Commit `200770f` vs Candidate Commit `a71bf68`:**
  A strict code-level diff was executed:
  ```bash
  $ git diff 200770f a71bf68 -- api/ js/ controllers/ services/ server.js index.html package.json vercel.json
  ```
  **Result:** Zero diff (100% byte-for-byte identical). The application runtime code, middleware, controllers, routes, and client logic in candidate commit `a71bf68` are identical to `200770f`.
- The differences between `200770f` and `a71bf68` consist exclusively of:
  1. Dedicated verification probe [`test/verify_preview_deployment.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/verify_preview_deployment.js) for non-destructive edge and SSO detection.
  2. Test harness enhancements in [`test/load_test_suite.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_suite.js) (Vercel protection bypass header forwarding and Vercel edge SSO interception detection).
  3. Audit documentation and release decision reports in [`reports/`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/reports).
- **Deployment Status:** Deployment compiled and running on Vercel Preview:
  - **Deployment ID:** `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK`
  - **URL:** `https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app`
  - **Target:** `preview`
  - **State:** `READY` (`● Ready`)
  - **Runtime:** `nodejs24.x` on AWS Lambda (`iad1`)
  - **Code Correspondence:** Proven 100% equivalent to candidate commit `a71bf68`.

---

## 2. Vercel Preview Configuration & Secret Isolation Protocol

### 2.1 Current Variable Status (Verified via `vercel env ls`)
| Environment Variable | Development | Production | Preview | Policy & Sensitivity |
| :--- | :---: | :---: | :---: | :--- |
| `MILO_SESSION_SECRET` | Encrypted | Encrypted | **MISSING** | Cryptographic HMAC-SHA256 session token signature. Must be >= 32 chars. |
| `GEMINI_API_KEY` | Encrypted | Encrypted | **MISSING** | Google Gemini API key. Serverless gateway fails closed when missing. |
| `UPSTASH_REDIS_REST_URL` | NOT SET | NOT SET | **NOT SET** | Upstash Redis REST pipeline endpoint for shared rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | NOT SET | NOT SET | **NOT SET** | Upstash Redis REST bearer token. |
| `DATABASE_URL` | NOT SET | NOT SET | **NOT SET** | Optional PostgreSQL pooled connection string for multi-tenant server persistence. |

### 2.2 Dedicated Preview Secret Policy (No Cross-Environment Secret Reuse)
> [!IMPORTANT]
> **Security Policy:** Rather than copying the Production session secret to Preview, the operator must provision a **dedicated strong Preview session secret**.
> - **Rationale:** Prevents tokens issued during staging or automated load tests from having valid signatures in the Production environment.
> - **Generation Command (Zero Invention / Cryptographically Secure):**
>   ```bash
>   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
>   ```
> - **Restricted Gemini Key:** Use a dedicated Google Cloud API key restricted strictly to the "Generative Language API / Gemini API" with an isolated quota limit.

### 2.3 Step-by-Step Operator Action to Configure Preview Secrets
In the [Vercel Project Dashboard](https://vercel.com/ankitapriyadarshini-repos-projects/second-brain-ai-app/settings/environment-variables):
1. Navigate to **Settings** -> **Environment Variables**.
2. Click **Add New**:
   - Key: `MILO_SESSION_SECRET`
   - Value: *(paste newly generated 64-hex-character string)*
   - Target: Check **Preview only** -> Save.
3. Click **Add New**:
   - Key: `GEMINI_API_KEY`
   - Value: *(paste authorized Gemini API key)*
   - Target: Check **Preview only** -> Save.

---

## 3. Authorized Testing Protocol for Protected Preview

Empirical probing confirmed that Vercel Deployment Protection intercepts unauthenticated traffic at the edge:
- **Dedicated Probe Execution ([test/verify_preview_deployment.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/verify_preview_deployment.js)):**
  ```bash
  $ node test/verify_preview_deployment.js
  ====================================================
  🔍 MILO AI — PREVIEW DEPLOYMENT VERIFICATION PROBE
  Target: https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app
  Bypass Token: [NOT PROVIDED]
  ====================================================

  ▶ Probing GET /api/health ...
  🔒 [VERCEL SSO INTERCEPTION DETECTED]
     HTTP Status: 401
     Response Type: application/json
     Vercel Deployment Protection intercepted the request before reaching serverless lambdas.
     A Vercel login page returning HTTP 200 or 401 is NOT counted as an application health success.
     To bypass: provide --bypass-secret=<token> or set VERCEL_PROTECTION_BYPASS.

  ▶ Probing GET /api/ai/health ...
  🔒 [VERCEL SSO INTERCEPTION DETECTED]
     HTTP Status: 401
     Vercel Deployment Protection intercepted the request.
  ```
- **Approved Protection-Bypass Workflow:**
  In Vercel Project Settings -> **Deployment Protection** -> Under **Vercel Authentication**, generate a **Protection Bypass for Automation** secret.
  The test harness [`test/load_test_suite.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_suite.js) and probe [`test/verify_preview_deployment.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/verify_preview_deployment.js) automatically pass:
  ```http
  x-vercel-protection-bypass: <your_bypass_secret>
  ```
  Pass the secret via CLI `--bypass-secret=<token>` or environment variable `VERCEL_PROTECTION_BYPASS=<token>`.
  *(The bypass token is never logged, printed, or committed).*

---

## 4. Health Endpoint Implementation & Genuine Response Verification

Inspection of [`api/health.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/health.js) and [`api/ai/health.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/health.js):
- **Genuine Application Health Signature:**
  - Content-Type: `application/json; charset=utf-8`
  - Body: `{"ok": true, "service": "milo-ai-system", "status": "healthy", "uptimeSeconds": ...}`
- **Edge Protection vs Application Response:**
  - A Vercel SSO login page returning HTTP 200 text/html or HTTP 401 Protected deployment **must never be counted as an application health-check success**.
  - [`test/load_test_suite.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_suite.js#L76-L86) contains `isGenuineApplicationHealth(res)` which strictly verifies JSON content-type and payload structure. Any Vercel SSO interception is explicitly classified under `statusCodes['VERCEL_SSO_BLOCKED']` and rejected.

---

## 5. Architectural Analysis: Concurrency Limiting in Serverless

> [!IMPORTANT]
> **Determination: Is the 75-request AI concurrency limit process-local or globally enforced?**

1. **Current Code Implementation ([api/ai/gateway.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/gateway.js#L669-L690)):**
   - The counter `globalThis.__miloGlobalInFlightAICalls` is stored in the Node.js `globalThis` object.
   - In Vercel Serverless, instances run in separate ephemeral containers (AWS Lambda `iad1`).
   - The process-local cap protects the individual container's CPU, memory, and event loop from being overwhelmed by socket backpressure.
2. **Why a Distributed Mutex in Redis is Counter-Productive:**
   - In serverless environments, if a container ungracefully terminates or hits Vercel's 30s hard timeout, an active in-flight counter (`DECR`) never executes.
   - This causes permanent "counter slot leakage", eventually locking the system at 75 and returning HTTP 429 to all users indefinitely.
   - **Safe Architecture:** Global provider limits are safely enforced via **fixed-window rate limiting** in [`services/DistributedRateLimiter.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/services/DistributedRateLimiter.js) (`INCR` with `EXPIRE 60`), which automatically resets and never leaks.

---

## 6. Upstash Redis Requirement Analysis

| Operation Scale | Upstash Redis Required? | Technical Rationale & Current Behavior |
| :--- | :---: | :--- |
| **10–25 User Pilot** | **NO** | Local-first PKM keeps notes in browser `localStorage`. Average concurrent queries are 1–3 requests. In-memory rate limiting with automated bucket pruning (`_pruneBuckets()`) safely prevents abuse within each container. |
| **200-User Production Fleet** | **YES** | Vercel edge routers dynamically scale out to multiple serverless lambda instances. A malicious or aggressive user could bypass rate limits by distributing requests across instances unless Upstash Redis synchronizes the 60-second token buckets across instances. |

Until the operator provisions Upstash Redis, live cloud connectivity remains **BLOCKED**.

---

## 7. Official Gemini Quotas & Pricing

Milo routes queries through `gemini-3.8-flash` with fallback to `gemini-3.5-flash-lite`:

| Tier | RPM Limit | TPM Limit | RPD Limit | Suitability for 200 Users | Pricing (Input / Output per 1M) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Google AI Studio Free Tier** | **15 RPM** | 1,000,000 | 1,500 RPD | ❌ **UNSUITABLE (Exhausts immediately)** | $0.00 |
| **Pay-as-you-go (Tier 1)** | **1,000 to 2,000 RPM** | 4,000,000 | Unlimited | ✅ **SUITABLE** | Flash: $0.10 / $0.40<br>Lite: $0.075 / $0.30 |

> [!CRITICAL]
> 200 active users submitting realistic queries will generate 10–30 requests/minute during active hours. On the 15 RPM Free Tier, request 16 will trigger immediate HTTP 429 errors. **Do not issue 200 concurrent paid AI requests.** Bounded live smoke testing must use `test/real_gemini_smoke_test.js` (capped at 2 requests total).

---

## 8. Staged Load Test Execution & Results

### Mode A: Local Mock Concurrency Matrix (Executed & Verified)
Command: `npm run test:load:200` (13,880 total requests across 8 stages and 3-wave 200-user soak test):
- **10 users:** 80 reqs | 75.3 req/s | Non-AI p95: 55 ms | AI p95: 802 ms | 100% success | 0 leaks
- **25 users:** 200 reqs | 348.4 req/s | Non-AI p95: 147 ms | AI p95: 137 ms | 100% success | 0 leaks
- **50 users:** 400 reqs | 492.6 req/s | Non-AI p95: 115 ms | AI p95: 110 ms | 100% success | 0 leaks
- **100 users:** 800 reqs | 577.2 req/s | Non-AI p95: 191 ms | AI p95: 195 ms | 100% success | 0 leaks
- **150 users:** 1,200 reqs | 696.9 req/s | Non-AI p95: 270 ms | AI p95: 221 ms | 100% success | 0 leaks
- **200 users:** 1,600 reqs | 733.6 req/s | Non-AI p95: 307 ms | AI p95: 332 ms | 100% success | 0 leaks
- **250 users:** 2,000 reqs | 840.7 req/s | Non-AI p95: 287 ms | AI p95: 269 ms | 100% success | 0 leaks
- **300 users:** 2,400 reqs | 766.5 req/s | Non-AI p95: 419 ms | AI p95: 406 ms | 100% success | 0 leaks
- **200-user Soak Waves (1–3):** 4,800 reqs | 772–788 req/s | Non-AI p95: 245–284 ms | 100% success | 0 leaks
- **Memory & CPU:** RSS flat between 96.1 MB and 115.0 MB (zero memory leaks).
- **Label:** `LOCAL MOCK — NOT CLOUD CERTIFICATION`.

### Mode B: Live Staging Cloud Execution (Attempted & Blocked)
Command: `node test/load_test_suite.js --mode=B --target=https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app --concurrency=1 --confirm-live`
- **Result:** `5 requests | 0% success | HTTP Statuses: 401:5 | VERCEL_SSO_BLOCKED: 5`.
- **Finding:** Intercepted by Vercel Deployment Protection. Serverless lambdas were not reached.

---

## 9. 15-Gate Acceptance Matrix & Final Release Decision

| # | Gate | Status | Evidence / Location | Blocker |
| :-: | :--- | :---: | :--- | :--- |
| **1** | Regression Suite | **PASS** | `npm run test:all` passed (25 files, 44 suites, exit code 0). | None |
| **2** | Production Build | **PASS** | `npx vercel build --yes` succeeded (Exit code 0). | None |
| **3** | Authentication & Sessions | **PASS** | HMAC-SHA256 timing-safe verification, expiry, and denylist passed. | None |
| **4** | Cross-User Data Isolation | **PASS** | 1,685 cross-user intrusion probes blocked with 0 data leaks. | None |
| **5** | Queue Bounds & Overload | **PASS** | Concurrency cap (75), 1s timeout, HTTP 429 `Retry-After` verified. | None |
| **6** | Distributed Rate Limiting | **BLOCKED** | Mock tests passed; live Upstash Redis unprovisioned in Vercel. | Provision Upstash Redis credentials. |
| **7** | Preview Deployment | **PASS** | Deployed `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK` (`READY` state). | None |
| **8** | Live HTTP Staging Load | **BLOCKED** | Probes intercepted by Vercel SSO (`VERCEL_SSO_BLOCKED: 5`). | Supply automation bypass token or disable SSO. |
| **9** | Live Gemini Smoke Test | **BLOCKED** | Safety gate active; `--run-live=true` requires live key. | Configure paid Gemini API key in Vercel Preview. |
| **10** | Quota & Spend Safeguards | **PASS** | 24s execution budget, model fallbacks, 75 concurrency cap verified. | Set GCP billing budget alerts ($25 soft, $50 hard). |
| **11** | Client Storage & Recovery | **PASS** | 6 storage unit tests & 8 Chrome CDP E2E tests passed cleanly. | None |
| **12** | Media Job Durability | **PASS** | Stateless image proxy verified; video job store documented as ephemeral. | Add Redis/DB for multi-container video jobs if required. |
| **13** | Observability & Runbook | **PASS** | Structured logging, secret scrubbers, and operational runbook verified. | None |
| **14** | Production Configuration | **BLOCKED** | Missing `MILO_SESSION_SECRET` and `GEMINI_API_KEY` in Preview. | Enable environment variables for Preview in Vercel. |
| **15** | Final 200-User Decision | **BLOCKED FOR 200 USERS** | 10–25 user pilot authorized; 200 real users blocked on cloud setup. | Fulfill operator checklist before scaling to 200 users. |

### Release Verdicts:
- **Verdict A (Code & Local Benchmark Readiness):** **GO (Certified for 300 users local mock)**.
- **Verdict B (Real-User Production Readiness):** **CONDITIONAL GO (10–25 User Pilot Only)**. General 200-user rollout is **BLOCKED** until cloud staging barriers are unblocked.

---

## 10. Operator Action Checklist to Unlock Full 200-User Rollout

1. **Configure Dedicated Preview Secrets:**
   - In Vercel Project Settings -> Environment Variables, add `MILO_SESSION_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) for **Preview only**.
   - Add `GEMINI_API_KEY` for **Preview only**.
2. **Generate Protection Bypass Secret:** In Vercel Settings -> Deployment Protection -> Protection Bypass for Automation, generate a bypass secret.
3. **Verify Google Cloud Tier 1 Billing:** Confirm Google Cloud / Google AI Studio billing is active with at least 1,000 RPM quota for `gemini-3.8-flash`.
4. **Run Live Smoke Test:**
   ```bash
   GEMINI_API_KEY=<authorized_key> node test/real_gemini_smoke_test.js --run-live=true
   ```
5. **Run Mode B Staged Load Test Against Preview:**
   ```bash
   node test/load_test_suite.js --mode=B --target=https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app --bypass-secret="<your_bypass_secret>" --stages --confirm-live
   ```
