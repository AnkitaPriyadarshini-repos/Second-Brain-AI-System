# Milo AI — Production Operational Runbook & Incident Response Guide

**Document Reference:** `reports/milo-production-runbook.md`  
**Applicability:** Production & Staging Environments (`https://second-brain-ai-system.vercel.app`)  
**Effective Date:** 2026-10-27  
**Audience:** Site Reliability Engineers (SRE), DevOps, Backend Engineers, On-Call Operators

---

## 1. System Overview & Critical Endpoints

| Endpoint | Protocol | Function | Failure Mode / SLA |
|---|---|---|---|
| `/api/ai/health` | HTTP GET | AI provider connectivity & readiness check | Returns `200 OK` if key configured, `503` if missing. No secrets exposed. |
| `/api/ai/gateway` | HTTP POST | Core conversational AI & grounded RAG gateway | 24s overall deadline; tiered fallbacks (`3.8` -> `3.6` -> `3.5` -> `3.1`). |
| `/api/notes` | HTTP GET/POST | Note management & search | Sub-50ms p95; caches read queries, clears cache on mutations. |
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
1. Upstream Google Gemini Free Tier limit (15 RPM) exceeded during team usage.
2. Per-client token-bucket rate limit (30 req/min for auth users, 15 req/min for guests) exceeded.

**Remediation Steps:**
1. Verify whether the 429 is originated by the internal rate limiter or upstream Google:
   - Check response header `X-RateLimit-Remaining`: If `0`, client sent too many requests.
   - If `X-RateLimit-Remaining > 0`, error originated from Google Cloud API.
2. If Google Cloud API 429:
   - Open **Google Cloud Console** -> **APIs & Services** -> **Enabled APIs & Services** -> **Generative Language API**.
   - Check Quotas: Upgrade from Free Tier to **Pay-as-you-go (Tier 1)** to raise RPM from 15 to 1,000–4,000 RPM.
   - Ensure billing account is active and credit card is not expired.

---

### Runbook B: Circuit Breaker Tripping (Cascading Upstream 503 Outage)

**Symptoms:**
- `/api/ai/gateway` immediately returns HTTP 503 without attempting provider calls.
- User notice: *"The AI gateway is in temporary cooldown to protect upstream services (Xs remaining)."*
- Log entry: `[milo/gateway] Circuit breaker tripped for 15s due to repeated upstream 503/500 errors.`

**Mechanics:**
- The gateway tracks consecutive upstream failures across all models.
- If **3 consecutive requests** fail across all tiers, the circuit breaker trips for **15 seconds** to prevent hammering overloaded upstream services.
- Once 15 seconds elapse, the next request is admitted (Half-Open state). If it succeeds, the breaker resets to 0.

**Remediation Steps:**
1. Do not restart the server immediately; the 15-second cooldown automatically resets.
2. If Google Gemini is suffering a global outage, check the [Google Cloud Status Dashboard](https://status.cloud.google.com).
3. If primary model `gemini-3.8-flash` is degraded, verify that fallback models (`gemini-3.6-flash`, `gemini-3.5-flash-lite`) are recovering traffic cleanly.

---

### Runbook C: Missing or Invalid Session Secret (`SERVER_CONFIGURATION_ERROR`)

**Symptoms:**
- User registration, login, or token verification throws:  
  `SERVER_CONFIGURATION_ERROR: Session secret is not configured.`
- HTTP 500 returned on `/api/auth/register` or `/api/auth/login`.

**Root Cause:**
- In production (`NODE_ENV=production` or `VERCEL=1`), the server enforces fail-closed security when `MILO_SESSION_SECRET` is unset or `< 16` characters long.

**Remediation Steps:**
1. Generate a secure random 32-byte secret:
   ```bash
   openssl rand -hex 32
   ```
2. Navigate to **Vercel Dashboard** -> **Project Settings** -> **Environment Variables**.
3. Add or update `MILO_SESSION_SECRET` with the generated value for **Production** and **Preview**.
4. Trigger a project redeployment:
   - Vercel Dashboard -> Deployments -> Redeploy.

---

### Runbook D: SSRF / Dangerous Ingestion Attempts

**Symptoms:**
- `/api/ingest/url` returns HTTP 400 with message:  
  `Access to private, loopback, or metadata network addresses is strictly prohibited (SSRF Protection).`

**Root Cause:**
- Client or external scraper submitted an internal IP, cloud metadata IP (`169.254.169.254`), `localhost`, or private network address (`10.0.0.0/8`, `192.168.0.0/16`).

**Remediation Steps:**
1. Normal operation: The security guard correctly blocked the request.
2. Check `X-Milo-Client-Id` and `X-Vercel-IP` in logs to see if a specific actor is scanning internal endpoints.
3. If abusive, block the IP via Vercel Firewall / WAF rules.

---

### Runbook E: Serverless Ephemeral State Reset

**Symptoms:**
- Notes created on the server disappear after a deployment or serverless container cold restart.

**Root Cause:**
- Without `DATABASE_URL` configured, `DatabaseService` writes notes to `./data/second_brain_db.json` or `/tmp/second_brain_db.json`. In serverless environments (AWS Lambda / Vercel), `/tmp` is wiped on cold restarts.

**Remediation Steps:**
1. Provision a PostgreSQL instance (e.g. Neon serverless Postgres or Supabase).
2. Run the schema DDL from `services/PostgresStoreService.js`:
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   CREATE TABLE IF NOT EXISTS notes (...);
   CREATE TABLE IF NOT EXISTS sessions (...);
   ```
3. Set `DATABASE_URL=postgres://user:password@host:5432/second_brain_db` in Vercel environment variables.

---

## 4. Rollback Procedures

### Application Code Rollback (Instant Vercel Instant Rollback)
1. Open **Vercel Dashboard** -> **Deployments**.
2. Locate the previous stable deployment (e.g. `feat/milo-interactive-welcome-screen` commit `e194187`).
3. Click the three dots `...` on the deployment card -> **Instant Rollback**.
4. Traffic is immediately redirected to the prior build in < 5 seconds without a rebuild step.

### Git Branch Rollback (Local / Remote)
If a deployed branch needs to be reverted in Git:
```bash
# Checkout target feature branch
git checkout feat/milo-interactive-welcome-screen

# Revert specific merge commit if needed
git revert -m 1 <MERGE_COMMIT_SHA>

# Re-run automated verification suite
npm test
```
