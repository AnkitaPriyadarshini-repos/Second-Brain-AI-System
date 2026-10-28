# Milo AI — Production Operational Runbook & Incident Playbook

**Document Reference:** `reports/milo-production-runbook.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Certified Git Commit SHA:** `a71bf68217d12d447faded3da8cb78b96d95b33b` (`a71bf68`, equivalent runtime code to `200770f`)  
**Latest Deployed Preview Deployment ID:** `dpl_CMr1rgqrnrsbFt1vFhZvXBYpbHzK`  
**Timestamp:** 2026-10-28T19:40:00+05:30  
**Roles:** SRE, Cloud Infrastructure Engineer, Application Security Engineer, Release Manager  

---

## 1. Pre-Deployment Verification Checklist

Before promoting any candidate release or deploying to Preview/Production:
1. **Branch & Commit Verification:**
   - Confirm active branch is clean: `git status`
   - Confirm commit SHA matches certified audit commit (`git rev-parse HEAD`)
2. **Local Regression Pipeline (Zero Failure Tolerance):**
   ```bash
   npm run test:all
   ```
   Must exit with code 0 across all 25 test files and 44 test suites.
3. **Local Vercel Preview Build:**
   ```bash
   npx vercel build --yes
   ```
   Must succeed with exit code 0 and generate `.vercel/output`.
4. **Environment Secrets Audit (Vercel Dashboard):**
   - Confirm `MILO_SESSION_SECRET` is set (length >= 32 characters, random 256-bit entropy).
   - Confirm `GEMINI_API_KEY` is set and linked to a Google Cloud project with Tier 1 paid billing enabled.
   - Verify secrets exist for both **Preview** and **Production** targets.

---

## 2. Deployment Procedures

### 2.1 Preview Deployment & Smoke Verification
```bash
# 1. Deploy candidate branch to Vercel Preview (never --prod)
npx vercel deploy --prebuilt

# 2. Record the deployed URL from CLI output:
# e.g., https://second-brain-ai-<hash>-ankitapriyadarshini-repos-projects.vercel.app

# 3. Verify health probe (requires Vercel protection bypass header if SSO is enabled):
curl -s -H "x-vercel-protection-bypass: <bypass_secret>" \
  https://<preview-url>/api/health
# Expected: {"status":"healthy","uptime":...}
```

### 2.2 Production Promotion Protocol
Only promote to production after all 15 acceptance gates are satisfied and signed off:
```bash
# Production promotion command (requires release manager approval):
npx vercel deploy --prod --prebuilt
```

---

## 3. Incident Response Playbooks

### Playbook 1: Upstream Gemini 429 Quota Exhaustion
- **Symptom:** Gateway returns HTTP 429 `RESOURCE_EXHAUSTED` or logs indicate `The model is overloaded. Key [REDACTED] failed`.
- **Root Cause:** Fleet request rate exceeded Google AI RPM/TPM tier quota (e.g., account still on 15 RPM Free Tier).
- **Automated Mitigation:** Gateway automatically cascades through fallback models (`gemini-3.8-flash` -> `3.6-flash` -> `3.5-flash-lite` -> `3.1-flash-lite`).
- **Operator Action:**
  1. Open [Google Cloud Console -> Quotas & System Limits](https://console.cloud.google.com).
  2. Confirm project billing is active (Tier 1 Pay-as-you-go).
  3. Request an emergency quota increase for `gemini-3.8-flash` from 2,000 RPM to 4,000 RPM.
  4. If quota exhaustion persists, temporarily decrease `MAX_GLOBAL_CONCURRENT_AI` in `api/ai/gateway.js` from 75 to 40.

### Playbook 2: Circuit Breaker Tripped (HTTP 503)
- **Symptom:** Gateway returns HTTP 503 `CIRCUIT_BREAKER_OPEN`.
- **Root Cause:** 5 consecutive 5xx errors from Google Gemini API (upstream outage or regional failure).
- **Mitigation:** Circuit breaker trips for 15 seconds to shed load and protect downstream clients.
- **Operator Action:**
  1. Check [Google Cloud Status Dashboard](https://status.cloud.google.com).
  2. Inspect serverless logs: `npx vercel logs <deployment-url>`.
  3. Breaker will automatically attempt half-open probe after 15 seconds. If Google AI recovers, breaker resets to `CLOSED`.

### Playbook 3: Redis Degradation Mode (Upstash Outage)
- **Symptom:** Serverless logs show `[DistributedRateLimiter] Redis outage/timeout (fetch failed). Activating strict fail-safe degradation`.
- **Root Cause:** Upstash Redis connection timeout or API outage.
- **Mitigation:** Distributed rate limiter clamps down immediately to **5 requests per minute** per client local ceiling. System prevents unbounded upstream spend.
- **Operator Action:**
  1. Check Upstash status at [status.upstash.com](https://status.upstash.com).
  2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` credentials in Vercel settings.

---

## 4. Rollback Triggers & Instant Rollback Procedure

### Rollback Trigger Criteria:
Initiate an immediate rollback if ANY of the following occur within 15 minutes of release:
1. Error rate on `/api/ai/gateway` exceeds 2.0% across 5 minutes.
2. Latency p95 exceeds 5,000 ms on non-AI endpoints or 10,000 ms on AI endpoints.
3. Any cross-tenant data leakage or security isolation defect is reported.
4. Serverless lambda crashes (`FUNCTION_INVOCATION_FAILED`).

### Instant Rollback Execution:
```bash
# Method A: Instant Rollback via Vercel CLI
npx vercel rollback <prior_certified_deployment_id>

# Method B: Vercel Dashboard Instant Rollback
# 1. Open Vercel Dashboard -> Project second-brain-ai-app -> Deployments.
# 2. Locate prior stable deployment (e.g. commit 1345b30).
# 3. Click the three dots (...) -> Promote to Production / Rollback.
# Traffic shifts instantly (0s downtime) via Vercel Edge routing.
```
