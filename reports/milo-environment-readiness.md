# Milo AI — Environment and Secrets Readiness Report

**Document Reference:** `reports/milo-environment-readiness.md`  
**Certification Pass:** Pass 2 (Post-Hardening Independent Verification Gate)  
**Audit Date:** 2026-10-28 (Asia/Kolkata, UTC+05:30)  
**Reported HEAD Reference:** `0f5415e`  
**Active Certification Branch:** `audit/milo-100-user-certification`  
**Auditor:** Application Security Engineer & Cloud Infrastructure Lead  
**Audit Status:** **VERIFIED WITH CONFIGURATION PREREQUISITES**

---

## 1. Environment Variables Audit & Validation Matrix

The codebase was scanned for all environment variable access patterns (`process.env.*`). Below is the complete, verified inventory:

| Variable Name | Required Scope | Code Usage Location | Default / Fallback Behavior | Production Status |
|---|---|---|---|---|
| `MILO_SESSION_SECRET` | **Production (Critical)** | `api/auth-guard.js`, `services/AuthService.js`, `server.js` | Must be **>= 32 cryptographically random characters**. In production (`NODE_ENV=production` or `VERCEL=1`), weak (<32 chars) or legacy fallback secrets fail closed with `SERVER_CONFIGURATION_ERROR`. | **VERIFIED (Fail-Closed, 32-char enforced)** |
| `SESSION_SECRET` | Production (Alias) | `api/auth-guard.js`, `services/AuthService.js`, `server.js` | Fallback alias if `MILO_SESSION_SECRET` is unset; subject to same 32-char validation. | **VERIFIED** |
| `JWT_SECRET` | Production (Alias) | `services/AuthService.js` | Fallback alias if `MILO_SESSION_SECRET` is unset; subject to same 32-char validation. | **VERIFIED** |
| `GEMINI_API_KEY` | **Live AI Requests** | `api/ai/gateway.js`, `api/ai/health.js`, `api/media/image.js`, `services/AIGatewayService.js` | If missing, `/api/ai/health` returns `503 Service Unavailable`, and gateway returns setup guidance. Secrets redacted from all logs. | **VERIFIED** |
| `MILO_GEMINI_KEY` | Live AI (Alias) | `api/ai/gateway.js`, `api/media/image.js` | Alias for `GEMINI_API_KEY`. | **VERIFIED** |
| `UPSTASH_REDIS_REST_URL` | **Distributed Rate Limiting** | `services/DistributedRateLimiter.js` | Upstash Redis REST endpoint for atomic rate-limiting pipelines across serverless containers. | **VERIFIED (Architecture ready, Cloud blocked)** |
| `UPSTASH_REDIS_REST_TOKEN` | Distributed Rate Limiting | `services/DistributedRateLimiter.js` | Bearer token for Upstash Redis REST pipeline authentication. | **VERIFIED (Architecture ready, Cloud blocked)** |
| `KV_REST_API_URL` | Distributed Rate Limiting | `services/DistributedRateLimiter.js` | Vercel KV REST URL alias. | **VERIFIED** |
| `KV_REST_API_TOKEN` | Distributed Rate Limiting | `services/DistributedRateLimiter.js` | Vercel KV REST Token alias. | **VERIFIED** |
| `DATABASE_URL` | **Production Persistence** | `services/PostgresStoreService.js`, `services/DatabaseService.js` | PostgreSQL connection string. Enables connection pooling, transaction wrappers, and schema DDL. Fails closed with descriptive errors on connection failure. | **VERIFIED (Architecture ready, Cloud blocked)** |
| `PORT` | Local Server | `server.js` | Defaults to `3000`. | **VERIFIED** |
| `RATE_LIMIT_MAX` | Optional | `services/AIGatewayService.js` | Defaults to `60` requests per minute. | **VERIFIED** |
| `REPLICATE_API_TOKEN` | Optional (Media) | `api/media/video.js` | Required only if generating AI videos via Replicate AnimateDiff. | **VERIFIED (Optional)** |
| `MILO_TEST_VIDEO_PROVIDER` | Test Only | `api/media/video.js`, `test/load_test_suite.js` | When set to `'mock'`, enables hermetic video queue test responses. | **VERIFIED (Test-Only)** |

---

## 2. Shared Distributed State & Redis Implementation

### Implementation Status:
- **`services/DistributedRateLimiter.js`:** Fully implemented and integrated into `api/ai/gateway.js`.
- **Atomic Operations:** Uses Redis `/pipeline` REST requests executing `[["INCR", key], ["EXPIRE", key, 60, "NX"], ["TTL", key]]`.
- **Timeout Protection:** 1,500ms network timeout via `AbortSignal` prevents serverless execution stalls.
- **Fail-Safe Outage Degradation:** If Redis times out, fails, or is unavailable, the limiter automatically activates a strict degraded local ceiling (**max 5 requests per minute**), strictly preventing unmetered upstream AI traffic.
- **Multi-Process Tested:** Verified across independent child processes (Process A: 7 reqs, Process B: 5 reqs -> exactly 10 allowed, 2 throttled with HTTP 429).
- **Production Status:** **BLOCKED BY MISSING CLOUD PROVISIONING.** The code and fail-safe logic are verified; however, live credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) must be set in Vercel project environment variables by the operator.

---

## 3. Persistent Storage & PostgreSQL Verification

### Implementation Status:
- **`services/PostgresStoreService.js`:** Relational PostgreSQL adapter with connection pooling (`pg.Pool`), transactions (`withTransaction`), and schema DDL migrations.
- **`services/DatabaseService.js`:** Routes note creation, retrieval, pinning, and deletion through PostgreSQL when `DATABASE_URL` is set.
- **Controlled Error Handling:** Unreachable database triggers explicit `DATABASE_CONNECTION_ERROR` instead of silent fallback to ephemeral `/tmp`.
- **Multi-User Isolation:** Parameterized queries strictly filter `WHERE user_id = $1`. Verified that User B cannot read, pin, or delete User A's notes across cold restarts.
- **Production Status:** **BLOCKED BY MISSING CLOUD PROVISIONING.** Requires operator provisioning of a managed PostgreSQL database (e.g. Neon, Supabase, AWS RDS) with PgBouncer connection pooling.

---

## 4. Google Gemini Model Quotas, Rate Limits & Realistic Cost Recalculation

### Model Registry & Quotas:
| Model Identifier | Tier Availability | RPM (Free / Tier 1 Paid) | TPM (Free / Tier 1 Paid) | Recommended Workload |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` | Active (v1beta) | 15 RPM / 4,000 RPM | 1M TPM / 4M TPM | High-throughput chat, greetings, search |
| `gemini-3.6-flash` | Active (v1beta) | 15 RPM / 2,000 RPM | 1M TPM / 4M TPM | Balanced reasoning & analysis |
| `gemini-3.8-flash` | Active (v1beta) | 15 RPM / 1,000 RPM | 1M TPM / 4M TPM | Deep reasoning, architecture, coding |

### Current Pricing & Realistic Workload Cost Projections:
- **Text Generation Pricing (per 1M tokens):**
  - `gemini-3.5-flash-lite`: $0.075 input / $0.30 output
  - `gemini-3.8-flash`: $0.75 input / $3.75 output
- **Image Generation Pricing (Imagen 3):** ~$0.03 per generated image
- **Video Generation Pricing (Veo 3.1):** ~$0.03–$0.05 / sec (Lite) to $0.40–$0.75 / sec (Standard)
- **Workload Projections:**
  - **25 Pilot Users (500 queries/day):**
    - Text (80% 3.5-lite, 20% 3.8-flash): **~$14.22 / month**
    - Images (50 images/mo): **$1.50 / month**
    - Video (5 5-sec clips/mo): **$1.25 / month**
    - **Total Pilot AI Spend:** **~$17.00 / month**
  - **100 Concurrent Users (12,000 queries/hour):**
    - Requires Tier 1 Paid Quota (>= 1,000 RPM).
    - Estimated cost: **~$1.50 – $8.00 / active hour**.

---

## 5. Official Final Release Verdict

| Target | Verdict | Operational Condition |
|---|---|---|
| **Target A: Internal testing (1–5 users)** | **VERIFIED** | Ready immediately. 32-character secret policy enforced. |
| **Target B: Invited pilot (10–25 users)** | **VERIFIED WITH LIMITATIONS** | Single Node or persistent PostgreSQL active. Free Tier key acceptable with staggered queries; Paid Tier key recommended. |
| **Target C: 100 concurrent core users** | **VERIFIED WITH LIMITATIONS** | Application core runtime certified up to 703 RPS. Validated for application core; not a proof of unprovisioned cloud state. |
| **Target D: 100 concurrent live end-to-end** | **BLOCKED** | Blocked pending operator provisioning of Upstash Redis, PostgreSQL `DATABASE_URL`, and Google Cloud Tier 1 Paid Quota. |
