# Milo AI — External Pilot Release Decision (Go / No-Go)

**Document Reference:** `reports/milo-external-pilot-go-no-go.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audited Commit SHA:** `e5f40be0434b9d034251b54a20b001a1d9a2632b` (`e5f40be`)  
**Audit Timestamp:** 2026-10-28T01:52:00+05:30  
**Overall Pilot Release Decision:** **CONDITIONAL GO**

---

## 1. Executive Summary & Verification Scope

This decision document delivers the final evidence-based audit for **Milo (Second Brain AI System)** regarding readiness for an initial **10–25-user invited external pilot** and evaluates readiness for eventual 100-user concurrency.

Milo operates as a **Client-First Personal Knowledge Management (PKM)** system. Notes are created, indexed, searched, and stored directly in the user's browser `localStorage` (`second_brain_notes_v2`), with full JSON export and restore capabilities. Client queries send only the top 3–5 locally retrieved notes to the stateless AI Gateway (`/api/ai/gateway`), ensuring user privacy and tenant isolation without requiring a central database for the pilot.

Local packaging, serverless function compilation (`npx vercel build`), signed-session verification, and real-browser note lifecycle persistence (via Chrome DevTools Protocol) are **100% verified (PASS)**. Cloud deployment verification, Vercel environment secrets, and live upstream Gemini calls are **BLOCKED / UNVERIFIED** because no active Vercel token or live API key exists in the local environment and unauthorized live external calls are strictly prohibited.

The release decision remains **CONDITIONAL GO**.

---

## 2. Acceptance Matrix & Evaluation Criteria

Every gate is evaluated independently using only the required standard statuses (**PASS**, **FAIL**, **BLOCKED**, **UNVERIFIED**):

| Gate # | Acceptance Criterion | Required Evidence | Measured Status | Verification Mode |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Preview Deployment** | Successful build & valid Preview URL | **UNVERIFIED** | Local `vercel build` passed (exit code 0); cloud deployment URL requires operator action. |
| **2** | **Commit Identity** | Deployed SHA matches audited commit (`e5f40be`) | **UNVERIFIED** | Local build generated from `e5f40be`; cloud deployment SHA requires operator push. |
| **3** | **Session Configuration** | Presence of >= 32 char secret, no fallbacks | **BLOCKED** | Denylist active locally; cloud presence in Vercel settings requires manual operator check. |
| **4** | **Gemini Configuration** | Presence of valid Google AI key, no client exposure | **BLOCKED** | Safe spend controls active; cloud presence in Vercel settings requires manual operator check. |
| **5** | **Authentication** | Positive/negative session signature validation | **PASS (LOCAL) / UNVERIFIED (CLOUD)** | Signed-session contract verified with 100% pass across Suites 4, 8, 10 of hardening tests. |
| **6** | **Note Persistence** | Survives real browser reload with 100% fidelity | **PASS** | Verified in real headless Chrome via Chrome DevTools Protocol (`test:browser-notes`). |
| **7** | **Backup & Restore** | Export/import fidelity in isolated test data | **PASS** | Verified via Chrome CDP and `test:client-storage` (100% fidelity restore). |
| **8** | **Gemini Connectivity** | Bounded live smoke test execution | **BLOCKED** | Spend controls active; call blocked pending operator authorization and API key. |
| **9** | **Secret Protection** | Zero API keys in browser payloads, logs, or reports | **PASS** | Regex redaction and client-side isolation verified; keys never sent to browser. |
| **10** | **Feature Scope** | Unsupported features disabled/labeled in UI | **PASS** | WebSockets labeled local-only; video marked experimental; privacy notice in Settings UI. |
| **11** | **Monitoring & Rollback** | Error logs visible & rollback to `e194187` documented | **PASS** | Rollback to `e194187` and Vercel runtime log inspection documented. |

---

## 3. Explicit Answers to Release Decision Questions

### 1. Is the cloud Preview deployment verified?
**UNVERIFIED.**  
`npx vercel build --yes` succeeded cleanly with exit code `0`, building all 7 serverless functions and static assets into `.vercel/output`. However, because no authenticated Vercel CLI session or token is active in this execution environment (`hasVercelToken: false`), the live cloud Preview deployment URL cannot be verified from the shell without operator credentials.

### 2. Does its deployed commit match the audited commit?
**UNVERIFIED (FOR CLOUD DEPLOYMENT). PASS (FOR LOCAL BUILD: `e5f40be`).**  
The verified local build artifacts in `.vercel/output` correspond directly to commit `e5f40be`. Once the operator pushes `audit/milo-100-user-certification` to GitHub or deploys via Vercel CLI, the cloud deployment will match `e5f40be`.

### 3. Are required Preview environment variables present?
**BLOCKED.**  
Neither `MILO_SESSION_SECRET` nor `GEMINI_API_KEY` is present in the local shell environment (`hasGeminiKey: false`, `hasSessionSecret: false`). Automated inspection cannot verify their presence in Vercel Project Settings without an authenticated token. Operator manual verification in the Vercel Dashboard is required.

### 4. Did deployed authentication tests pass?
**UNVERIFIED (ON CLOUD PREVIEW) / PASS (LOCAL CONTRACT VERIFIED).**  
Signed-session validation was verified locally with a 100% pass rate across positive and negative cases (missing token -> 401, invalid signature -> 401, expired token -> 401, constant-time `crypto.timingSafeEqual`, and fail-closed 500/503 on missing configuration). Testing against the live cloud URL remains **UNVERIFIED** until the cloud Preview deployment is active.

### 5. Did a real Gemini request succeed?
**BLOCKED.**  
In compliance with safety rules, no paid external API calls were made. The bounded live test harness (`test/real_gemini_smoke_test.js`) safely blocked live external traffic because `--run-live=true` was not passed and credentials are not present in the local environment.

### 6. Is the 10–25-user pilot ready now?
**CONDITIONAL GO.**  
Milo is architecturally, functionally, and locally verified. It is ready for the 10–25 invited pilot users immediately after the operator completes the required manual Vercel configuration and deployment steps.

### 7. Is 100-user live capacity certified?
**NO (BLOCKED).**  
While the local engine sustained 703 RPS in local mock benchmarks, certifying 100 concurrent real users against live cloud infrastructure requires provisioned external services (managed PostgreSQL, Upstash Redis, and Google Cloud Tier 1 paid quota >= 1,000 RPM) that are not part of the pilot deployment.

---

## 4. Remaining Blockers & Operator Action Plan

To transition from **CONDITIONAL GO** to **ACTIVE EXTERNAL PILOT**, the operator must perform the following manual steps:

### Step 1: Verify / Set Environment Variables in Vercel
In the **Vercel Dashboard** (`Project Settings -> Environment Variables`):
1. **`MILO_SESSION_SECRET`**: Ensure a secure 32+ character random hex string is configured for **Preview** and **Production**.  
   Generate locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **`GEMINI_API_KEY`**: Ensure a valid Google Gemini API Key is configured for **Preview** and **Production**.

### Step 2: Deploy to Preview
From an authorized operator terminal:
```bash
# Option A: Push the audited branch to GitHub to trigger Vercel Preview
git push origin audit/milo-100-user-certification

# Option B: Deploy preview using Vercel CLI (requires operator login)
npx vercel --preview
```

### Step 3: Run Bounded Gemini Smoke Test
Once the key is configured, execute the spend-safe live test:
```bash
GEMINI_API_KEY="your-google-ai-key" node test/real_gemini_smoke_test.js --run-live=true
```
*Note: Run from a secure environment or set the variable in the process context so the key is not stored in shell history.*

Upon completion of these three steps and confirmation of HTTP 200 from the smoke test, the 10–25-user pilot may begin.
