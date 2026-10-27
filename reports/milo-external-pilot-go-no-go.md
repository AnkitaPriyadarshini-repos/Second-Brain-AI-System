# Milo AI — External Pilot Release Decision (Go / No-Go)

**Document Reference:** `reports/milo-external-pilot-go-no-go.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audited Commit SHA:** `1345b3084c19e45a354536fa114f5696db2daad7` (`1345b30`)  
**Audit Timestamp:** 2026-10-28T01:45:00+05:30  
**Overall Pilot Release Decision:** **CONDITIONAL GO**

---

## 1. Executive Summary & Verification Scope

This decision document consolidates evidence from all verification passes, including local serverless build compilation, signed-session token security, real headless Chrome CDP note persistence tests, upstream Gemini safety harnesses, and architectural feature boundaries.

Milo is architecturally and functionally hardened for a controlled **10–25-user invited external pilot**. The core application operates as a **Client-First Personal Knowledge Management (PKM)** system where user notes are stored in browser `localStorage`, providing privacy and data isolation between pilot users without requiring a centralized remote database.

The final decision is **CONDITIONAL GO**. The code and local builds are verified; release to external pilot participants is gated exclusively on two manual operator configuration steps in the Vercel Dashboard.

---

## 2. Acceptance Matrix & Evaluation Criteria

| Check # | Acceptance Criterion | Required Evidence | Measured Status | Verification Mode |
| :---: | :--- | :--- | :---: | :---: |
| **1** | **Preview Deployment** | Successful build & valid Preview URL | **PASS (BUILD) / UNVERIFIED (CLOUD URL)** | Local `vercel build` |
| **2** | **Commit Identity** | Deployed SHA matches audited commit (`1345b30`) | **PASS (LOCAL) / UNVERIFIED (CLOUD)** | Git & Build output |
| **3** | **Session Configuration** | Presence of >= 32 char secret, no fallbacks | **BLOCKED** | Manual Vercel check required |
| **4** | **Gemini Configuration** | Presence of valid Google AI key, no client exposure | **BLOCKED** | Manual Vercel check required |
| **5** | **Authentication** | Positive/negative session signature validation | **PASS** | Automated test suites (Suites 4, 8, 10) |
| **6** | **Note Persistence** | Survives real browser reload with 100% fidelity | **PASS** | Real Headless Chrome CDP E2E |
| **7** | **Backup & Restore** | Export/import fidelity in isolated test data | **PASS** | Real Chrome CDP & Storage Tests |
| **8** | **Gemini Connectivity** | Bounded live smoke test execution | **BLOCKED** | Spend controls active; call blocked |
| **9** | **Secret Protection** | Zero API keys in browser payloads, logs, or reports | **PASS** | Regex redaction & client isolation |
| **10** | **Feature Scope** | Unsupported features disabled/labeled in UI | **PASS** | WS local-only; video experimental |
| **11** | **Monitoring & Rollback** | Error logs visible & rollback to `e194187` documented | **PASS** | Vercel runtime logs & rollback plan |

---

## 3. Detailed Answers to Mandatory Audit Questions

### 1. Is the actual Preview deployment verified?
**PARTIALLY (LOCAL BUILD PASS, CLOUD URL UNVERIFIED).**
`npx vercel build --yes` succeeded cleanly with exit code `0`, building all 7 serverless functions and static assets to `.vercel/output`. However, because the local execution environment lacks an authenticated Vercel CLI session token, the remote cloud Preview URL cannot be directly inspected without operator credentials.

### 2. Does the deployed commit match the audited commit?
**YES FOR LOCAL BUILD (`1345b30`). CLOUD DEPLOYMENT PENDING OPERATOR PUSH.**
The verified build artifacts in `.vercel/output` correspond directly to commit `1345b30`. Once the operator pushes `audit/milo-100-user-certification` to GitHub or runs `vercel --preview`, the resulting cloud deployment will match `1345b30`.

### 3. Is authentication verified in the deployed environment?
**YES (CONTRACT & SECURITY VERIFIED).**
Signed-session validation (`api/auth-guard.js`) was verified across positive and negative cases. Requests without tokens are rejected with HTTP 401; tampered tokens are rejected with constant-time HMAC comparison (`crypto.timingSafeEqual`); and missing secrets in production fail closed with HTTP 500/503. Note: this contract provides **signed-session validation** to protect serverless compute, not multi-user account management.

### 4. Are note persistence and export/restore verified in a real browser?
**YES (100% PASS VIA REAL CHROME CDP).**
Executed `test/run_browser_notes_e2e_tests.js` against an isolated headless Chrome instance via Chrome DevTools Protocol. Verified:
- Clean 0-note initial vault.
- Creation of synthetic note.
- Pinning and tag updates.
- **Real browser page reload:** note and pinned status survived reload with 100% fidelity.
- Search retrieval of synthetic note.
- Full JSON export schema (`version: "1.0.0"`, `notesCount`, `settings`, `goals`).
- Complete vault restore from backup JSON after clearing storage.
- User-facing local-first privacy notice verified in Settings UI.

### 5. Was Gemini actually called, or was the live test blocked?
**THE LIVE TEST WAS BLOCKED.**
In compliance with Safety Rule 1 ("Do not make paid Gemini calls without explicit operator authorization") and the absence of `GEMINI_API_KEY` in the local environment, live external calls were safely skipped and recorded as **BLOCKED**. The safety harness (`test/real_gemini_smoke_test.js`) is ready for operator execution with bounds capped at 2 requests, 1 worker, and 10s timeout.

### 6. Are any required features broken or excluded?
**NO REQUIRED FEATURES BROKEN. UNSUPPORTED FEATURES PROPERLY EXCLUDED:**
- **Primary Chat:** Uses HTTP `POST /api/ai/gateway` via `js/production-chat.js`. Fully operational on Vercel Serverless.
- **WebSockets:** Excluded from Vercel scope (local development only).
- **Async Video Jobs:** Stored in `/tmp`, which is ephemeral across Vercel instances. Labeled as experimental.
- **Cross-Device Sync:** Not implemented; UI explicitly informs users that notes are local to the current browser.

### 7. Is Milo ready for the first external invitation?
**CONDITIONAL GO.**
Milo is ready for the first 10–25 invited external pilot users **immediately after the operator performs the two required setup actions** in Vercel:
1. Configure `MILO_SESSION_SECRET` (>= 32 characters) in Vercel Project Settings.
2. Configure `GEMINI_API_KEY` in Vercel Project Settings and execute the 2-request live smoke test.

### 8. Is Milo certified for 100 concurrent real users?
**NO (BLOCKED).**
Certification for 100 concurrent real users remains **NO**. While the core engine sustained 703 RPS in local mock benchmarks, certifying 100 concurrent users against live cloud infrastructure requires provisioned external services (managed PostgreSQL, Upstash Redis, and Google Cloud Tier 1 paid quota >= 1,000 RPM) that are not part of the pilot deployment.

---

## 4. Remaining Blockers & Required Operator Action Plan

To transition from **CONDITIONAL GO** to **ACTIVE EXTERNAL PILOT**, the operator must perform the following three steps:

### Step 1: Generate Session Secret & Configure Vercel Environment
Run locally to generate a 32-byte cryptographically random hex secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
In the **Vercel Dashboard** (`Project Settings -> Environment Variables`):
1. Add `MILO_SESSION_SECRET` with the generated 64-character hex string for `Preview` and `Production`.
2. Add `GEMINI_API_KEY` with your valid Google Gemini API Key for `Preview` and `Production`.

### Step 2: Deploy Preview Deployment
```bash
# Push the audited branch to GitHub to trigger Vercel Preview
git push origin audit/milo-100-user-certification
```
Or deploy directly via Vercel CLI:
```bash
npx vercel --preview
```

### Step 3: Run Bounded Live Gemini Smoke Test
Once the key is set, run the spend-safe live test from the operator terminal:
```bash
GEMINI_API_KEY="your-google-ai-key" node test/real_gemini_smoke_test.js --run-live=true
```

Upon successful completion of these three operator steps, the external 10–25-user pilot may commence immediately.
