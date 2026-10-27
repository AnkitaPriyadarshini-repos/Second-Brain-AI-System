# Milo AI — Environment and Secrets Readiness Report

**Document Reference:** `reports/milo-environment-readiness.md`  
**Audit Date:** 2026-10-27 (Asia/Kolkata, UTC+05:30)  
**Auditor:** Application Security Engineer & Cloud Infrastructure Lead  
**Audit Status:** **VERIFIED WITH CONFIGURATION PREREQUISITES**

---

## 1. Environment Variables Audit & Validation Matrix

The codebase was scanned for all environment variable access patterns (`process.env.*`). Below is the complete, verified inventory:

| Variable Name | Required Scope | Code Usage Location | Default / Fallback Behavior | Production Status |
|---|---|---|---|---|
| `MILO_SESSION_SECRET` | **Production (Critical)** | `api/auth-guard.js`, `services/AuthService.js` | Must be >= 16 characters. If missing in production (`NODE_ENV=production` or `VERCEL=1`), system **fails closed** with `SERVER_CONFIGURATION_ERROR`. | **VERIFIED (Fail-Closed)** |
| `SESSION_SECRET` | Production (Alias) | `api/auth-guard.js`, `services/AuthService.js` | Fallback alias if `MILO_SESSION_SECRET` is unset. | **VERIFIED** |
| `JWT_SECRET` | Production (Alias) | `services/AuthService.js` | Fallback alias if `MILO_SESSION_SECRET` is unset. | **VERIFIED** |
| `GEMINI_API_KEY` | **Live AI Requests** | `api/ai/gateway.js`, `api/ai/health.js`, `api/media/image.js`, `services/AIGatewayService.js` | If missing, `/api/ai/health` returns `503 Service Unavailable`, and gateway returns descriptive setup guidance. | **VERIFIED** |
| `MILO_GEMINI_KEY` | Live AI (Alias) | `api/ai/gateway.js`, `api/media/image.js` | Alias for `GEMINI_API_KEY`. | **VERIFIED** |
| `DATABASE_URL` | **Production Persistence** | `services/PostgresStoreService.js` | Connects to PostgreSQL. If unset, falls back to local file `second_brain_db.json`. | **VERIFIED WITH LIMITATIONS** (Local file in dev; Postgres required in serverless) |
| `PORT` | Local Server | `server.js` | Defaults to `3000`. | **VERIFIED** |
| `RATE_LIMIT_MAX` | Optional | `services/AIGatewayService.js` | Defaults to `60` requests per minute. | **VERIFIED** |
| `REPLICATE_API_TOKEN` | Optional (Media) | `api/media/video.js` | Required only if generating AI videos via Replicate AnimateDiff. | **VERIFIED (Optional)** |
| `MILO_TEST_VIDEO_PROVIDER` | Test Only | `api/media/video.js`, `test/load_test_suite.js` | When set to `'mock'`, enables hermetic video queue test responses. | **VERIFIED (Test-Only)** |

---

## 2. Shared Distributed State & Redis Investigation

### Explicit Codebase Audit:
A full textual grep across all source files for `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` confirmed:
- **Finding:** No active Redis or Upstash REST client is currently imported or instantiated in `package.json` or `api/`.
- **Current Runtime State:** Rate limiting (`__junoRateBuckets`), active in-flight requests (`__miloActiveInFlight`), and video job queues (`/tmp/milo_jobs`) operate in container memory and local `/tmp`.
- **Architectural Requirement for 100+ Production Users:**
  To support 100+ simultaneous users across scaled Vercel serverless function instances, an operator must provision either:
  1. **Upstash Redis / Vercel KV** using `@upstash/redis` to synchronize token buckets and rate limits across instances.
  2. **PostgreSQL** using `pg` (already modeled in `services/PostgresStoreService.js`) to provide durable multi-instance note and session storage.

---

## 3. Client-Exposed Variables & Secrets Leakage Audit

A comprehensive scan was conducted across `index.html`, `landing.html`, `js/app.js`, `js/production-chat.js`, and client bundles:
- **`NEXT_PUBLIC_*` Variables:** Zero `NEXT_PUBLIC_*` variables are defined or bundled.
- **Client Bundle Secrets:** Zero Google Gemini API keys, session secrets, or private tokens are embedded in frontend HTML or JavaScript files.
- **Server-Side API Isolation:** All Gemini API requests are mediated exclusively through serverless endpoints (`/api/ai/gateway`, `/api/media/image`). The client browser never communicates directly with `generativelanguage.googleapis.com`.

---

## 4. Operator Configuration Checklist

### Local Development Setup (`.env`)
```bash
# 1. Copy template
cp .env.example .env

# 2. Add local configuration
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
MILO_SESSION_SECRET=dev_local_secret_at_least_32_characters_long_12345
```

### Production Vercel Deployment Checklist
To activate Milo in production on Vercel:
1. Navigate to **Vercel Dashboard** -> **Project Settings** -> **Environment Variables**.
2. Add `MILO_SESSION_SECRET`:
   - Generate with: `openssl rand -hex 32` (generates a 64-character high-entropy secret).
   - Set Environment: **Production** and **Preview**.
3. Add `GEMINI_API_KEY`:
   - Obtain from Google AI Studio / Google Cloud Console.
   - Set Environment: **Production** and **Preview**.
4. (Optional for Video Generation) Add `REPLICATE_API_TOKEN`.
5. (Required for Multi-Instance Production > 25 Users) Add `DATABASE_URL` pointing to PostgreSQL (e.g. Neon, Supabase, or AWS RDS).

---

## 5. Security Validation Results

| Test Case | Scenario | Expected Behavior | Actual Measured Outcome |
|---|---|---|---|
| **ENV-01** | Production startup with no `MILO_SESSION_SECRET` | Fails closed with `SERVER_CONFIGURATION_ERROR` | **PASS (Exception thrown, token forgery prevented)** |
| **ENV-02** | Session secret < 16 characters in production | Fails closed (insecure entropy rejected) | **PASS (Strict >= 16 char check enforced)** |
| **ENV-03** | Legacy predictable secret provided | Explicitly rejected | **PASS (Legacy string invalidated)** |
| **ENV-04** | `/api/ai/health` check with missing Gemini key | Returns HTTP 503 without leaking environment details | **PASS (Clean 503 JSON response)** |
| **ENV-05** | Error logging with upstream Gemini key in error message | Key sanitized to `[REDACTED]` before logging | **PASS (Zero secret leakage in console.error)** |
