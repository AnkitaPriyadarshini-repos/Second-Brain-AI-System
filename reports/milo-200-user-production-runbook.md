# Milo AI — 200+ User Production Runbook & Operations Manual

**Document Reference:** `reports/milo-200-user-production-runbook.md`  
**Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Branch:** `scalability/milo-200-user-certification`  
**Audited Commit SHA:** `2227728`  
**Date:** October 28, 2026  
**Auditor:** SRE & Production Operations Lead  

---

## 1. Production Architecture Overview

Milo AI operates as a **Client-First Personal Knowledge Management (PKM)** web application with stateless serverless API routes on Vercel:
- **Client Tier:** Static HTML/JS served via edge CDN. Notes stored in browser `localStorage` and IndexedDB.
- **Serverless API Tier:** Node.js functions (`api/ai/gateway.js`, `api/health.js`, `api/ai/health.js`, `api/media/image.js`, `api/media/video.js`, `api/ingest/url.js`).
- **External Dependencies:**
  - Google Gemini 3.x API (AI model reasoning)
  - Upstash Redis (Optional distributed token-bucket rate limiting)
  - Pollinations / Gemini Imagen 3 (Optional image generation)

---

## 2. Health Probes & Readiness Monitoring

Milo provides two distinct health endpoints for monitoring tools, load balancers, and uptime monitors:

### 2.1 General System Health
- **Endpoint:** `GET /api/health`
- **Expected Status:** `200 OK`
- **Sample Payload:**
  ```json
  {
    "ok": true,
    "service": "milo-ai-system",
    "status": "healthy",
    "uptimeSeconds": 1420,
    "timestamp": "2026-10-28T09:15:00.000Z"
  }
  ```
- **Behavior:** Never returns sensitive configuration details, secret lengths, or internal stack traces.

### 2.2 AI Gateway Readiness
- **Endpoint:** `GET /api/ai/health`
- **Expected Status:** `200 OK` (when `GEMINI_API_KEY` is present) or `503 Service Unavailable` (when unconfigured).
- **Sample Payload (Ready):**
  ```json
  {
    "ok": true,
    "service": "milo-ai-gateway",
    "configured": true,
    "timestamp": "2026-10-28T09:15:00.000Z"
  }
  ```

---

## 3. Production Environment Variables Reference

Configure these in the **Vercel Dashboard** under `Project Settings -> Environment Variables`:

| Variable Name | Required? | Target Environments | Description & Constraints |
| :--- | :---: | :---: | :--- |
| `MILO_SESSION_SECRET` | **YES** | Preview, Production | Cryptographic HMAC-SHA256 signing secret. **Must be $\ge 32$ characters of high-entropy hex/base64**. |
| `GEMINI_API_KEY` | **YES** | Preview, Production | Google AI Studio or Google Cloud Vertex AI key for Gemini 3.x models. |
| `MILO_MAX_CONCURRENT_AI` | Optional | Preview, Production | Global concurrency ceiling for simultaneous in-flight provider calls (Default: `75`). Set to `0` as an emergency kill-switch. |
| `UPSTASH_REDIS_REST_URL` | Optional | Preview, Production | Upstash Redis REST URL for distributed multi-instance rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN`| Optional | Preview, Production | Upstash Redis REST API token. |

---

## 4. Operational Playbooks & Incident Response

### Playbook 1: Upstream Google Gemini HTTP 429 Quota Exhaustion
- **Symptom:** Gateway logs report `429 Resource has been exhausted`. Client sees: `"The AI service is temporarily busy. Please try again in a moment."`
- **Diagnosis:**
  1. Check if the project is using a Free Tier Gemini key (`15 RPM` limit).
  2. Inspect Vercel runtime logs for request arrival spikes.
- **Remediation:**
  1. Upgrade the Google Cloud project to **Pay-As-You-Go (Tier 1)** to unlock `1,000–4,000 RPM`.
  2. If already on Tier 1, verify whether a client is abusing credentials. Milo's per-client limit (`30 req/min`) automatically blocks abusive IPs.
  3. Adjust `MILO_MAX_CONCURRENT_AI` to a lower threshold (e.g. `30`) to smooth out traffic spikes.

### Playbook 2: Upstream Gemini Outage / Repeated 503 Errors
- **Symptom:** Gateway logs report consecutive 503/502 errors.
- **Automated Protection:**
  - After 5 consecutive upstream 5xx failures, the **in-memory circuit breaker** trips, placing the gateway in a 15-second cooldown.
  - While tripped, the gateway returns HTTP 503: `"The AI gateway is in temporary cooldown to protect upstream services (Xs remaining)."`
- **Remediation:**
  1. Check Google Cloud Service Health dashboard for Gemini outages.
  2. The gateway automatically attempts sequential fallback (`gemini-3.5-flash-lite` -> `gemini-3.6-flash` -> `gemini-3.1-flash-lite`).
  3. Once upstream recovers, the circuit breaker resets automatically on the next successful call.

### Playbook 3: Upstash Redis Outage or Network Timeout
- **Symptom:** Logs report `[DistributedRateLimiter] Redis outage/timeout. Activating strict fail-safe degradation.`
- **Automated Protection:**
  - Network timeouts are strictly bounded to 1,500ms via `AbortSignal`.
  - When Redis fails or times out, the limiter degrades immediately to local memory buckets with a strict ceiling of **5 requests / minute**.
  - **Security Guarantee:** Requests never silently bypass rate limiting or create unbounded AI spend during a Redis outage.
- **Remediation:**
  1. Check Upstash console for service status.
  2. Verify REST URL and Token in Vercel settings.
  3. Once Redis responds, distributed mode resumes automatically without application restart.

---

## 5. Secret-Safe Logging Verification

The gateway enforces automated regex redaction on all provider error responses and internal logs:
- Any string matching `/AIza[0-9A-Za-z-_]{15,}/` is replaced with `[REDACTED]`.
- Session tokens, API keys, and authorization headers are never logged.
- Health endpoints never return credential metadata.

---

## 6. Client-Side Vault Backup & Recovery Procedures

Because user notes are stored client-locally in `localStorage` (`second_brain_notes_v2`), operators do not manage database backups for core notes:
1. **User Backup Action:**
   - In the Milo Settings modal, click **"Export Vault Backup (JSON)"**.
   - Downloads a complete JSON snapshot containing all notes, tags, entities, creation timestamps, and pinned states.
2. **User Recovery Action:**
   - In Settings, click **"Restore Backup"** and select the JSON file.
   - The storage engine validates schema integrity, detects corruption, and restores all notes with 100% fidelity.
   - Verified in headless Chrome CDP via `npm run test:browser-notes`.

---

## 7. Deployment Rollback Procedure

If a critical defect or breaking change is deployed:
1. **Vercel Instant Rollback (Zero Downtime):**
   - Open Vercel Dashboard -> Deployments.
   - Locate the prior certified stable deployment (commit `759d348` or `e5f40be`).
   - Click the three dots `...` -> **"Instant Rollback"**.
   - Traffic transitions immediately to the prior build within seconds.
2. **Git Rollback via CLI:**
   ```bash
   git checkout main
   git revert HEAD --no-edit
   git push origin main
   ```
