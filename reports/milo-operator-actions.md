# Milo AI — Operator Action Guide & Deployment Runbook

**Document Reference:** `reports/milo-operator-actions.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Current Certified HEAD:** `08acb43`  
**Effective Date:** 2026-10-28T00:48:00+05:30  
**Target Audience:** DevOps Engineers, Cloud Deployment Operators, SRE Lead

---

## 1. Quick-Start Checklist for Staged Rollout

```
[Phase 1: Vercel Secrets Setup] ──► [Phase 2: Live Gemini Smoke Test] ──► [Phase 3: Launch Pilot (10-25 Users)]
       (Session + Gemini Key)                  (2 Bounded Calls)                       (Client PKM + Vercel)
                 │                                     │                                      │
                 ▼                                     ▼                                      ▼
[Phase 4: Upstash Redis Setup]  ──► [Phase 5: PostgreSQL Database]   ──► [Phase 6: Full 100-User Scale]
    (Distributed Rate Limiting)             (Durable Note Vault)                   (Multi-Instance HA)
```

---

## 2. Phase 1: Vercel Environment Variable Provisioning

To enable internal testing (Target A) and the 10–25-user invited pilot (Target B), the operator must set two environment variables in Vercel:

### Step 1.1: Generate a Cryptographic Session Secret
Generate a high-entropy 32-byte (64-character hexadecimal) secret using Node's native crypto module:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*(Example output format: `4a9b2c8e1f0d3a7b6c5e4f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c`)*

> [!CAUTION]
> Never use predictable strings like `my_secret_key` or legacy secrets like `sb_second_brain_secure_jwt_secret_key_2026`. The production startup guard will immediately throw `CRITICAL_CONFIGURATION_ERROR` and halt execution.

### Step 1.2: Add Secrets to Vercel Project Settings
1. Navigate to the **Vercel Dashboard** -> Select Project **`second-brain-ai-system`**.
2. Go to **Settings** -> **Environment Variables**.
3. Add the following variables:

| Variable Name | Environment Scope | Value Description |
| :--- | :--- | :--- |
| `MILO_SESSION_SECRET` | **Production**, **Preview**, **Development** | The 64-character hexadecimal secret generated in Step 1.1. |
| `GEMINI_API_KEY` | **Production**, **Preview**, **Development** | Your Google AI Studio API key (`AIza...`). |

4. Check the box to apply to **Production** and **Preview**.
5. Save changes.

---

## 3. Phase 2: Live Gemini Integration Smoke Test

Before inviting pilot users, verify that the Google Gemini API key is valid and can execute live completions:

### Step 2.1: Execute Bounded Smoke Test
Execute the test with the explicit `--run-live=true` flag:
```bash
# On Linux / macOS / Bash:
GEMINI_API_KEY="AIzaSy..." node test/real_gemini_smoke_test.js --run-live=true

# On Windows PowerShell:
$env:GEMINI_API_KEY="AIzaSy..." ; node test/real_gemini_smoke_test.js --run-live=true
```

### Step 2.2: Verify Output Acceptance Criteria
Confirm the output displays:
```
🚀 Executing 2 live request(s) with concurrency 1...
• Query 1: HTTP 200 in 850ms | Success: true
  Output: "Milo AI verified live at ..."
• Query 2: HTTP 200 in 720ms | Success: true
  Output: "Milo AI verified live at ..."
Total live smoke test elapsed: 1570 ms
✅ Real Gemini smoke test completed within hard safety boundaries.
```
If HTTP 400 or 403 occurs: Check that the Gemini API is enabled in the Google Cloud project.  
If HTTP 429 occurs: Quota exhausted; check billing or wait 60 seconds.

---

## 4. Phase 3: Upstash Redis Provisioning (Required for 50–100 Users)

To coordinate distributed rate limiting across multiple serverless containers:

### Step 3.1: Create Upstash Redis Database
1. Log in to [console.upstash.com](https://console.upstash.com).
2. Click **Create Database** -> Name: `milo-ai-rate-limiter`.
3. Select region matching your Vercel deployment (e.g., `us-east-1` or closest to users).
4. Select **Global Database** or standard regional.

### Step 3.2: Copy REST Credentials to Vercel
In the Upstash database dashboard, scroll to **REST API** section and copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

In Vercel Project Settings -> Environment Variables, add both variables for **Production** and **Preview**.

### Step 3.3: Verify Live Cloud Rate Limiting
Run the verification script with the live cloud flag:
```bash
# On Linux / macOS / Bash:
UPSTASH_REDIS_REST_URL="https://..." UPSTASH_REDIS_REST_TOKEN="..." node test/run_distributed_rate_limiting_tests.js --run-cloud=true

# On Windows PowerShell:
$env:UPSTASH_REDIS_REST_URL="https://..." ; $env:UPSTASH_REDIS_REST_TOKEN="..." ; node test/run_distributed_rate_limiting_tests.js --run-cloud=true
```
Confirm output displays: `✅ [PASS] Live distributed Redis infrastructure is detected and configured.`

---

## 5. Phase 4: Managed PostgreSQL Setup (Required for Target C & D)

To enable persistent multi-instance note storage across serverless containers:

### Step 4.1: Provision Managed Database
1. Provision a PostgreSQL 15+ database on **Supabase**, **Neon**, **AWS RDS**, or **Vercel Postgres**.
2. Obtain the pooled connection string (using PgBouncer or connection pooler mode):
   `postgres://username:password@ep-cool-pooler.us-east-1.aws.neon.tech/milo_db?sslmode=require`

### Step 4.2: Configure Vercel Environment Variables
Add the following to Vercel Project Settings:
- `DATABASE_URL`: The pooled connection string.
- `PG_POOL_MAX`: `10` (recommended pool size per serverless micro-container).

### Step 4.3: Initialize Schema
Run the database migration / schema initialization script:
```bash
node -e "
const PostgresStoreService = require('./services/PostgresStoreService');
const pg = new PostgresStoreService();
pg.initSchema().then(() => {
  console.log('✅ PostgreSQL Schema initialized successfully.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Schema initialization failed:', err);
  process.exit(1);
});
"
```

### Step 4.4: Verify Multi-Process Persistence
Run the persistence verification suite against the live staging database:
```bash
npm run test:persistence
```

---

## 6. Phase 5: Production Rollback & Emergency Incident Runbook

### Incident 1: Session Secret Configuration Error (HTTP 500 / 503)
- **Symptom:** Serverless logs display `CRITICAL_CONFIGURATION_ERROR: Session secret must be at least 32 characters long in production`.
- **Cause:** `MILO_SESSION_SECRET` is missing or shorter than 32 characters.
- **Fix:** Follow Step 1.1 to generate a 64-char hex secret and paste into Vercel Project Settings. Redeploy without build cache.

### Incident 2: Upstream Gemini Quota Burnout (HTTP 429)
- **Symptom:** Chat responses return notice `⚠️ Milo Service Notice: The AI service is experiencing high demand. Please try again in a few moments.`
- **Mitigation:**
  - AI Gateway automatically tries 3 fallback models (`gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
  - If all fail, check Google Cloud Console billing quota.
  - Temporarily pause new user onboarding.

### Incident 3: Instant Deployment Rollback (< 15 Seconds)
If an unexpected defect occurs in production:
1. Open **Vercel Dashboard** -> **Deployments**.
2. Find the previous stable deployment (commit `e194187`).
3. Click the three dots `...` on that deployment -> Select **Instant Rollback**.
4. Traffic is immediately redirected globally to the stable commit.
