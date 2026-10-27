# Milo AI — Production Operational Runbook & Incident Response Guide

**Document Reference:** `reports/milo-production-runbook.md`  
**Certification Pass:** Pass 2 (Post-Hardening Independent Verification Gate)  
**Applicability:** Production & Staging Environments (`https://second-brain-ai-system.vercel.app`)  
**Effective Date:** 2026-10-28  
**Reported HEAD Reference:** `0f5415e`  
**Active Certification Branch:** `audit/milo-100-user-certification`  
**Audience:** Site Reliability Engineers (SRE), DevOps, Backend Engineers, On-Call Operators

---

## 1. System Overview & Critical Endpoints

| Endpoint | Protocol | Function | Failure Mode / SLA |
|---|---|---|---|
| `/api/ai/health` | HTTP GET | AI provider connectivity & readiness check | Returns `200 OK` if key configured, `503` if missing. No secrets exposed. |
| `/api/ai/gateway` | HTTP POST | Core conversational AI & grounded RAG gateway | 24s overall deadline; tiered fallbacks (`3.8` -> `3.6` -> `3.5` -> `3.1`). |
| `/api/notes` | HTTP GET/POST | Note management, search, and user vault isolation | Sub-50ms p95; per-user cache maps, invalidated on mutations. Routes to PostgreSQL when `DATABASE_URL` is set. |
| `/api/notes/:id/pin` | HTTP POST | Toggle note pinned state | 404 unauthorized if note belongs to another user. |
| `/api/notes/:id` | HTTP DELETE | Delete note | 404 unauthorized if note belongs to another user. |
| `/api/ingest/url` | HTTP POST | Safe web content ingestion with SSRF protection | 15 req/min client-identity limit; max 2048 chars; blocks private IPs. |
| `/api/media/image` | HTTP POST | Creative image generation (Imagen 3 / Flux) | 22s bounded timeout with clean fallback to Pollinations. |
| `/api/media/video` | HTTP POST | Asynchronous video queue (create/poll/cancel) | Throttled disk cleanup (60s); client-isolated ownership enforcement. |
| `/ws/chat` | WebSocket | Real-time interactive chat streaming (Local/SSR) | Sub-300ms round-trip delivery threshold. |

---

## 2. Observability, Logging & Correlation IDs

### Request Tracking Headers
Every API request and response is tagged with correlation identifiers:
- `X-Milo-Request-Id` / `X-Juno-Request-Id`: Format `juno_<timestamp_base36>_<random_hex>`
- `X-Milo-Client-Id`: Verified user or guest identity (`usr_*` or `guest_*`)
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`: Rate limit telemetry
- `X-RateLimit-Mode`: Set to `distributed` when Upstash Redis is active
- `X-RateLimit-Degraded`: Set to `true` if Redis is down and strict fail-safe throttling is engaged
- `Retry-After`: Standard HTTP 429 retry window in seconds

### Log Sanitization Policy
All server logs emitted via `console.log`, `console.warn`, and `console.error` are automatically scrubbed:
- Google Gemini API keys (`AIza...`) are masked as `[REDACTED]`.
- Long random tokens and session keys (>= 28 chars) are masked as `[REDACTED]`.
- User prompts and private note vaults are excluded from diagnostic error logs.

---

## 3. Incident Response Runbooks

### Runbook A: Upstream Gemini Quota Exhaustion (HTTP 429)

**Symptoms:**
- Elevated HTTP 429 status codes returned to clients from `/api/ai/gateway`.
- User notice: *"Milo is receiving a lot of requests right now. Please try again in a minute."*
- Log entry: `[milo/gateway] <req_id> 429 Resource has been exhausted (e.g. check quota)`

**Root Causes:**
1. Upstream Google Gemini Free Tier limit (15 RPM) exceeded during concurrent usage.
2. Per-client token-bucket rate limit (30 req/min for auth users, 15 req/min for guests) exceeded.

**Remediation Steps:**
1. Check response header `X-RateLimit-Remaining`: If `0`, client sent too many requests.
2. If `X-RateLimit-Remaining > 0`, error originated from Google Cloud API:
   - Open **Google Cloud Console** -> **APIs & Services** -> **Enabled APIs & Services** -> **Generative Language API**.
   - Check Quotas: Upgrade from Free Tier to **Pay-as-you-go (Tier 1)** to raise RPM from 15 to 1,000–4,000 RPM.
   - Verify billing account is active.

---

### Runbook B: Session Secret Configuration Failure (`SERVER_CONFIGURATION_ERROR`)

**Symptoms:**
- Server crashes on startup with: `🛑 CRITICAL_STARTUP_FAILURE: MILO_SESSION_SECRET must be configured with at least 32 characters in production.`
- Client authentication requests return HTTP 500 with `SERVER_CONFIGURATION_ERROR: Session secret is too weak (<N> chars). Production policy requires at least 32 characters.`

**Remediation Steps:**
1. Generate a cryptographically random 32-byte secret:
   ```bash
   openssl rand -base64 32
   # Or using Node.js:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In Vercel Project Settings -> **Environment Variables**:
   - Set `MILO_SESSION_SECRET` = `<generated_32_byte_string>`
   - Environments: **Production**, **Preview**, **Development**
3. Redeploy the application.

---

### Runbook C: Redis Outage & Rate-Limiter Fail-Safe Degradation

**Symptoms:**
- Server logs contain: `[DistributedRateLimiter] Redis outage/timeout (<error>). Activating strict fail-safe degradation.`
- Responses contain header: `X-RateLimit-Degraded: true`
- Users making more than 5 requests/min receive HTTP 429.

**Expected System Behavior:**
- The fail-safe policy intentionally clamps maximum allowable requests to **5 req/min per client** during Redis downtime, preventing unmetered requests from flooding upstream Gemini APIs and burning cost.

**Remediation Steps:**
1. Verify Upstash Redis / Vercel KV status at `https://status.upstash.com/`.
2. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel project environment variables.
3. Test connectivity:
   ```bash
   curl -X POST "$UPSTASH_REDIS_REST_URL/pipeline" \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     -H "Content-Type: application/json" \
     -d '[["PING"]]'
   ```
4. Once Redis service recovers, `DistributedRateLimiter` automatically resumes normal 30 req/min limits without restarting containers.

---

### Runbook D: PostgreSQL Connection Failure & Storage Outage

**Symptoms:**
- Note creation or retrieval fails with `DATABASE_CONNECTION_ERROR` or `DATABASE_QUERY_ERROR`.
- Controlled error returned to client: HTTP 500 with descriptive error (no silent loss).

**Remediation Steps:**
1. Check PostgreSQL cluster status (Neon / AWS RDS / Supabase).
2. If running under serverless concurrency, ensure a connection pooler like **PgBouncer** or **Neon connection pooling** (`?sslmode=require&pooler=true`) is active.
3. If running schema migrations, execute `pgService.initSchema()`.

---

## 4. Release Verdicts by Deployment Target

| Target | Verdict | Operational Prerequisite |
|---|---|---|
| **Target A: Internal testing (1–5 users)** | **VERIFIED** | Ready immediately. 32-char session secret enforced. |
| **Target B: Invited pilot (10–25 users)** | **VERIFIED WITH LIMITATIONS** | Single Node or persistent PostgreSQL active. Free Tier acceptable with staggered queries; Paid Tier recommended. |
| **Target C: 100 concurrent core users** | **VERIFIED WITH LIMITATIONS** | Core application certified up to 703 RPS. Not a proof of unprovisioned cloud state. |
| **Target D: 100 concurrent live end-to-end** | **BLOCKED** | Blocked pending operator provisioning of Upstash Redis, PostgreSQL, and Google Cloud Tier 1 Paid Quota. |
