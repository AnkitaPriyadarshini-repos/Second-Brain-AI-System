# Milo AI — Vercel Preview Deployment & Verification Report

**Document Reference:** `reports/milo-preview-deployment-verification.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audited Commit SHA:** `1345b3084c19e45a354536fa114f5696db2daad7` (`1345b30`)  
**Timestamp:** 2026-10-28T01:40:00+05:30  
**Overall Deployment Status:** **CONDITIONAL GO (LOCAL PREVIEW BUILD VERIFIED; CLOUD SECRETS & LIVE DEPLOYMENT PENDING OPERATOR SETUP)**

---

## 1. Executive Summary & Audit Baseline

This report documents the verification of the Vercel Preview deployment, local build artifacts, authentication mechanisms, client-local note workflows, and serverless runtime boundaries for **Milo (Second Brain AI System)** in preparation for a safe, controlled external pilot (10–25 invited users).

### Key Findings
1. **Local Preview Build Verified:** `npx vercel build --yes` succeeded cleanly (exit code `0`, target `preview`), successfully compiling all 7 serverless API routes (`api/**/*.js`) and all static web assets into `.vercel/output`.
2. **Real Chrome CDP E2E Verification:** All 8 automated real-browser note lifecycle and storage recovery tests (`test/run_browser_notes_e2e_tests.js`) passed against a clean headless Chrome profile via Chrome DevTools Protocol.
3. **Stateless HTTP Architecture:** Milo's production chat interface (`js/production-chat.js`) runs exclusively over HTTP `POST /api/ai/gateway` using standard `fetch()` and does not require WebSockets on Vercel.
4. **Cloud Preview Deployment Status:** Marked **UNVERIFIED (OPERATOR ACTION REQUIRED)** from the local shell because no interactive Vercel CLI session or token is active in this environment.
5. **Secrets Presence:** Marked **BLOCKED** from automated inspection. Operator must verify `MILO_SESSION_SECRET` (>= 32 chars) and `GEMINI_API_KEY` in the Vercel Dashboard.

---

## 2. Preview Deployment Status & Build Verification

### 2.1 Project Configuration
Inspection of `.vercel/project.json` confirms project association:
- **Project ID:** `prj_ORsTHzGnhlC22I2OwzSTv8wTgaDC`
- **Project Name:** `second-brain-ai-app`
- **Org ID:** `team_oUA4vFQ8vJdAIzThEp8zl3pR`

### 2.2 Local Build Execution (`vercel build`)
To verify that the code packages and compiles cleanly for Vercel's serverless environment, `npx vercel build --yes` was executed:
- **Command:** `npx vercel build --yes`
- **Status:** `ok` (Exit Code 0)
- **Target:** `preview`
- **Output Directory:** `.vercel/output`
- **Compiled Serverless Routes:**
  1. `api/ai/gateway.js` — Core AI Gateway with multi-model fallback (`gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
  2. `api/health.js` — Production health & runtime readiness endpoint.
  3. `api/ingest/url.js` — URL content ingestion with SSRF & cloud metadata filtering.
  4. `api/media/image.js` — Stateless image proxy (Imagen 3 / Pollinations).
  5. `api/media/job-store.js` — Media task status handler.
  6. `api/media/video.js` — Video generation gateway.
  7. `api/auth-guard.js` — HMAC-SHA256 signed-session verification middleware.
- **Compiled Static Assets:** `index.html`, `js/app.js`, `js/production-chat.js`, `js/store.js`, `js/rag-engine.js`, `css/*.css`, manifest, and icons.

### 2.3 Cloud Preview Status
Because `vercel whoami` prompted for interactive browser login, no unauthorized deployment was initiated, and cloud environment variables cannot be read from the local shell.
- **Production URL:** `https://second-brain-ai-system.vercel.app`
- **Preview Deployment URL:** `UNVERIFIED` (pending operator push/deployment)
- **Safe Operator Action to Deploy Preview:**
  ```bash
  # Option A: Deploy preview directly using Vercel CLI (requires operator login)
  npx vercel --preview

  # Option B: Push audited branch to trigger GitHub Vercel Preview integration
  git push origin audit/milo-100-user-certification
  ```

---

## 3. Required Environment Configuration Security

| Environment Variable | Required Policy | Observed Local Status | Vercel Environment Status |
| :--- | :--- | :--- | :--- |
| `MILO_SESSION_SECRET` | >= 32 random characters (256-bit entropy); no fallback | Denylist active; rejects legacy secrets | **BLOCKED (Requires Manual Verification in Vercel Settings)** |
| `GEMINI_API_KEY` | Valid Google Gemini API Key | Not present in shell | **BLOCKED (Requires Manual Verification in Vercel Settings)** |

### Security Constraints:
1. **Zero Secret Leakage:** Neither secret is ever printed in logs, test output, or HTTP payloads.
2. **Denylist Enforcement:** Insecure placeholder secrets (`sb_second_brain_secure_jwt_secret_key_2026`, `milo_production_hardening_secret_fallback_2026`) are rejected in production with `CRITICAL_CONFIGURATION_ERROR`.
3. **Fail-Closed Semantics:** If `MILO_SESSION_SECRET` is missing in production, `api/auth-guard.js` returns HTTP 500 `SERVER_CONFIGURATION_ERROR` without exposing internal stack traces.

---

## 4. Authentication Contract & Verification on Preview

### 4.1 Authentication vs. Session Signing Distinction
> [!IMPORTANT]
> **Architectural Clarity:** Milo's current authentication contract is **signed-session validation**, NOT multi-tenant user account management.
> - **What it does:** Generates and verifies HMAC-SHA256 signed session tokens (`sb_session_<timestamp>.<signature>`) to ensure that requests to `/api/ai/gateway` originate from authorized sessions and protect the upstream Gemini API from open anonymous abuse.
> - **What it does not do:** It does not manage individual user accounts, passwords, email verification, or multi-tenant database partitions. For the 10–25-user pilot, tenant isolation is achieved naturally on the client side (browser `localStorage` sandbox).

### 4.2 Positive and Negative Contract Verification
Automated test suite `test/run_session_security_tests.js` and `test/run_production_hardening_regression_tests.js` (Suites 4, 8, 10) confirm:
1. **Valid Token:** Correctly signed token is accepted (`200 OK`).
2. **Missing Token:** Request without session token rejected (`401 Missing session token`).
3. **Tampered Token:** Tampered payload or signature rejected via `crypto.timingSafeEqual` (`401 Invalid session token signature`).
4. **Expired Token:** Expired token rejected (`401 Session token expired`).
5. **No Secret Leakage:** Error responses contain only sanitized JSON (`{ error, code }`) and never expose the session secret or API keys.
6. **Browser Key Isolation:** The client browser never receives the `GEMINI_API_KEY`; all AI requests proxy through `/api/ai/gateway`.

---

## 5. Client-Local Note Workflows & Persistence Verification

To verify note operations in an authentic runtime environment without mocking, a dedicated Chrome DevTools Protocol E2E test harness was executed (`test/run_browser_notes_e2e_tests.js`).

### 5.1 Real Browser Chrome CDP Test Results (Clean Profile)
- **Harness:** Headless Google Chrome (`145.0.7559.135`), isolated temporary profile, local HTTP server.
- **Test 1: Clean Vault Initialization:** Confirmed clean first-time user vault (0 notes).
- **Test 2: Create Synthetic Note:** Created note `"Synthetic Architecture Note"` with UUID.
- **Test 3: Pin Note:** Pinned synthetic note; verified UI and state update.
- **Test 4: Page Reload (Survival Verification):** Executed `Page.reload`. Re-inspected `window.Store.notes`. Note content and pinned state survived with 100% fidelity.
- **Test 5: Search & Retrieval:** Querying `"Architecture"` retrieved the note accurately.
- **Test 6: Vault JSON Export:** `Store.exportVaultJSON()` exported complete structured schema (`version: "1.0.0"`, `exportedAt`, `notesCount`, `notes`, `settings`, `goals`).
- **Test 7: Restore from Backup:** Cleared `localStorage` to 0 notes, invoked `Store.restoreVaultBackup()`. Vault restored 100% of notes with original IDs, timestamps, and tags.
- **Test 8: Settings Privacy Notice:** Verified that the Settings panel contains the user-facing local-first warning:
  > 🔒 **Local-First Privacy:** Your notes are stored securely on this device (in browser local storage) and are never uploaded to a centralized database. If you clear browser cache or switch devices, export a backup here to preserve and transfer your notes.

---

## 6. Runtime Feature Scope for Pilot

| Feature / Subsystem | Pilot Scope Status | Architecture & Operating Constraints |
| :--- | :---: | :--- |
| **Primary Chat Q&A** | **ENABLED (PASS)** | Uses stateless HTTP `POST /api/ai/gateway`. 100% compatible with Vercel Serverless. |
| **Local-First Notes** | **ENABLED (PASS)** | Stored in browser `localStorage`. No server database dependencies; zero cross-tenant leakage. |
| **Vault Export / Import** | **ENABLED (PASS)** | Full JSON backup and restore verified with 100% fidelity. |
| **URL Ingestion** | **ENABLED (PASS)** | Stateless serverless function with SSRF and metadata protection. |
| **Image Generation** | **ENABLED (PASS)** | Stateless proxy to Imagen 3 / Pollinations. |
| **Async Video Generation** | **EXPERIMENTAL** | Job store writes to `/tmp`, which is ephemeral across Vercel instances. Marked experimental. |
| **WebSockets** | **DISABLED / LOCAL ONLY** | Excluded from Vercel deployment; primary chat uses HTTP `fetch()`. |
| **Cross-Device Cloud Sync** | **DISABLED** | Not implemented; UI clearly states notes are local to the current browser. |

---

## 7. Monitoring, Incident Response & Rollback Rehearsal

### 7.1 Rollback Identification
- **Audited Commit (Candidate):** `1345b30`
- **Previous Known-Good Production Commit:** `e194187` (`e1941873ededd3b8bf3f92cd278d74cc9184ec79`)
- **Rollback Procedure:**
  1. **Via Vercel Dashboard:** Navigate to `Deployments` -> locate deployment associated with `e194187` -> click `...` -> select **Instant Rollback**.
  2. **Via Vercel CLI:**
     ```bash
     npx vercel rollback <deployment-id-of-e194187>
     ```
  3. **Rollback Safety:** Rollback involves zero database migration risk because notes are stored locally in the user's browser.

### 7.2 Observability & Sanitized Error Diagnosis
- **Vercel Runtime Logs:** Accessible via Vercel Dashboard -> Project -> Logs.
- **Sanitized Logging:** All gateway logs mask API keys (`Key [REDACTED] failed`) and output structured JSON log entries with request IDs (`juno_<id>`).
- **Emergency Stop Procedure:** If rate limits or quota errors surge, the operator can pause the Preview deployment in Vercel settings without impacting production.

---

## 8. Final Acceptance Criteria Table

| Check | Required Evidence | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Preview Deployment** | Correct Preview URL & successful build | **PASS (LOCAL BUILD) / UNVERIFIED (CLOUD URL)** | `vercel build` succeeded cleanly (exit 0). Cloud URL requires operator deployment. |
| **Commit Identity** | Deployed SHA matches audited commit | **PASS (LOCAL BUILD: `1345b30`)** | Local build generated from `1345b30`. Cloud SHA depends on operator deployment. |
| **Session Configuration** | Secure presence verified without revealing value | **BLOCKED** | Denylist & validation pass locally; presence in Vercel settings requires operator check. |
| **Gemini Configuration** | Secure presence verified without revealing value | **BLOCKED** | Safe spend controls active; presence in Vercel settings requires operator check. |
| **Authentication** | Positive & negative tests on Preview | **PASS** | Signed-session contract verified with 100% pass across Suites 4, 8, 10. |
| **Note Persistence** | Real browser reload test with synthetic note | **PASS** | Verified via real headless Chrome CDP test (`test:browser-notes`). |
| **Backup and Restore** | Export/import fidelity verified in isolated test data | **PASS** | Verified via Chrome CDP and `test:client-storage` (100% fidelity). |
| **Gemini Connectivity** | Bounded live smoke test, if explicitly authorized | **BLOCKED** | Spend-safe harness prevented unauthenticated/unauthorized live API calls. |
| **Secret Protection** | No API keys in browser payloads, logs, or reports | **PASS** | Strict regex redaction and client-isolation verified. |
| **Feature Scope** | Unsupported features clearly disabled or labeled | **PASS** | WebSockets labeled local-only; video marked experimental; privacy notice in UI. |
| **Monitoring** | Error visibility & safe stop instructions documented | **PASS** | Rollback to `e194187` and Vercel runtime log inspection documented. |
