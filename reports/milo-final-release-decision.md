# Milo AI — Final Release Decision & 200-User Capacity Certification

**Document Reference:** `reports/milo-final-release-decision.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Git Commit SHA:** `04c26aad320a09962e039bf921a1ca4926243f5c`  
**Latest Deployed Preview Deployment ID:** `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK`  
**Latest Deployed Preview URL:** `https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app`  
**Timestamp:** 2026-10-28T19:15:00+05:30  
**Evaluator Roles:** Principal Software Architect, Senior SRE, Application Security Engineer, Performance Engineer, Release Manager  

---

## 1. Executive Summary & Dual Verdicts

In strict compliance with the core certification principle (**local mock benchmarks are NOT proof of deployed production capacity**), the release evaluation is divided into two distinct verdicts:

### Verdict A: Code & Local Benchmark Readiness
### **STATUS: GO (CERTIFIED FOR 300 CONCURRENT USERS LOCAL MOCK)**
- **Empirical Grounding:** All 25 test files and 44 regression suites passed cleanly ([`npm run test:all`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/package.json#L35)).
- **Load Test Certification:** Multi-stage load test ([`test/load_test_suite.js`](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/load_test_suite.js)) executed 13,880 requests across 10, 25, 50, 100, 150, 200, 250, and 300 simulated users plus a 3-wave sustained soak test.
- **Results:** 100.0% success rate, 0 cross-user data leaks across 1,685 intrusion probes, flat memory (RSS 95.4MB–116.4MB), and sub-350ms p95 latency.
- **Architectural Safeguards:** Bounded in-flight concurrency (`MAX_GLOBAL_CONCURRENT_AI = 75`), circuit breaker, and memory pruning are fully implemented and verified.

---

### Verdict B: Real-User Production Deployment Readiness
### **STATUS: CONDITIONAL GO (10–25 USER INVITED PILOT ONLY)**
### **200-USER GENERAL PRODUCTION ROLLOUT: BLOCKED**
- **Empirical Grounding:** The candidate branch was compiled and deployed to Vercel Preview (`dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK` at `https://second-brain-ai-l6ibz3g8r-ankitapriyadarshini-repos-projects.vercel.app`).
- **Cloud Blockers Identified:**
  1. **Vercel Deployment Protection (SSO):** Probing `/api/health` returned HTTP 302 redirecting to `https://vercel.com/sso-api?url=...` (or HTTP 200 with `<title>Login – Vercel</title>` if followed). Direct POST requests return HTTP 401 `{"error":{"message":"Protected deployment"}}`. Vercel SSO stops unauthenticated external HTTP load traffic at the edge before reaching serverless functions.
  2. **Missing Preview Secrets:** `npx vercel env ls` proves that `MILO_SESSION_SECRET` and `GEMINI_API_KEY` are only configured in `Development` and `Production`, and are **completely missing from Preview**.
  3. **Live Gemini Quota Verification:** Live Gemini testing remains blocked by safety gates to protect billing. Operating 200 real users requires confirmed Tier 1 paid billing (1,000–2,000 RPM); running on the Free Tier (15 RPM) will cause immediate fleet-wide HTTP 429 quota exhaustion.
  4. **Unprovisioned Shared Redis:** `UPSTASH_REDIS_REST_URL` is unconfigured in Vercel.

---

## 2. 15-Gate Production Acceptance Matrix

| # | Acceptance Gate | Status | Evaluation Method & Evidence | Operator Blocker / Condition |
| :-: | :--- | :---: | :--- | :--- |
| **1** | **Regression Suite** | **PASS** | `npm run test:all` passed (25 files, 44 suites, exit code 0). | None |
| **2** | **Production Build** | **PASS** | `npx vercel build --yes` succeeded (Exit code 0, target `preview`). | None |
| **3** | **Authentication & Sessions** | **PASS** | HMAC-SHA256 timing-safe verification, expiry, and denylist verified. | None |
| **4** | **Cross-User Data Isolation** | **PASS** | 1,685 cross-user intrusion attempts blocked with 0 data leaks. | None |
| **5** | **Queue Bounds & Overload** | **PASS** | Concurrency cap (75), 1s timeout, HTTP 429 `Retry-After` verified. | None |
| **6** | **Distributed Rate Limiting** | **BLOCKED** | Mock multi-process tests passed; live Upstash Redis is unprovisioned. | Provision Upstash Redis REST credentials in Vercel. |
| **7** | **Preview Deployment** | **PASS** | Deployed `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK` (`READY` state). | None |
| **8** | **Live HTTP Staging Load** | **BLOCKED** | Direct HTTP probes intercepted by Vercel SSO login (`VERCEL_SSO_BLOCKED`). | Disable preview protection or supply bypass token. |
| **9** | **Live Gemini Smoke Test** | **BLOCKED** | Safety gate active; `--run-live=true` requires live paid key. | Configure paid Gemini API key in Vercel Preview. |
| **10** | **Quota & Spend Safeguards** | **PASS** | 24s execution budget, model fallbacks, 75 concurrency cap verified. | Configure GCP billing budget alerts ($25 soft, $50 hard). |
| **11** | **Client Storage & Recovery** | **PASS** | 6 storage unit tests & 8 Chrome CDP E2E tests passed cleanly. | None |
| **12** | **Media Job Durability** | **PASS** | Stateless image proxy verified; video job store documented as ephemeral. | Add Redis/DB for multi-container video jobs if required. |
| **13** | **Observability & Runbook** | **PASS** | Structured logs, secret scrubbers, and operational runbook verified. | None |
| **14** | **Production Configuration** | **BLOCKED** | Missing `MILO_SESSION_SECRET` and `GEMINI_API_KEY` in Preview. | Enable dedicated Preview environment variables in Vercel. |
| **15** | **Final 200-User Decision** | **BLOCKED FOR 200 USERS** | 10–25 user pilot authorized; 200 real users blocked on cloud setup. | Fulfill operator checklist before scaling to 200 users. |

---

## 3. Scope of Authorized Pilot (10–25 Users)

The available empirical evidence justifies an **invited external pilot of 10–25 users** under the following conditions:
1. **Local-First Architecture:** Each pilot user runs an independent browser sandbox (`localStorage`). Note queries and edits execute entirely client-side without overloading backend servers.
2. **AI Gateway Protection:** The 75-concurrency cap and model fallback hierarchy easily accommodate 10–25 users (peak expected concurrent queries: 2–4).
3. **Rollback Plan:** Vercel Instant Rollback to prior stable deployment (`1345b30`) is documented and ready.

---

## 4. Operator Checklist to Unlock Full 200-User Certification

To unlock the full 200-user general production rollout:
- [ ] **Step 1:** Configure dedicated Preview secrets in Vercel Project Settings (generate a strong 64-hex character string for `MILO_SESSION_SECRET` and provide a restricted test `GEMINI_API_KEY` for **Preview only**).
- [ ] **Step 2:** Generate a **Protection Bypass for Automation** secret in Vercel Settings -> Deployment Protection.
- [ ] **Step 3:** Confirm Google Cloud billing is active on Tier 1 (Pay-as-you-go) with at least 1,000 RPM quota for `gemini-3.8-flash`.
- [ ] **Step 4:** Set budget alerts at $25.00 and $50.00 in Google Cloud Billing.
- [ ] **Step 5:** Execute Mode B live staging load test against the unblocked Preview URL using `--bypass-secret`.
- [ ] **Step 6:** Execute live Gemini smoke test: `GEMINI_API_KEY=<key> node test/real_gemini_smoke_test.js --run-live=true`.
