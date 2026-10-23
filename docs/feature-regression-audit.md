# Milo AI Workspace — Master Feature Register & Non-Regression Audit

**Date of Audit**: October 22, 2026  
**Auditor**: Senior Software Architect, Application-Security Engineer, QA Automation Lead & Release Manager  
**Candidate Branch**: `feat/natural-language-reminders`  
**GitHub Pull Request**: [PR #18](https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/pull/18)  
**Base Branch / Base Commit**: `origin/main` (`3591b14c10f52fe3bf6aedd5ffe15672e3297d90`)  
**Evaluated Candidate Head**: `0466173a437767455b6d22f90233f6f13e767e9e`  
**Preceding Candidate Commit**: `60f7405cdd3031d690854a097a112fb723e258c3`  
**Production URL**: https://second-brain-ai-system.vercel.app/  

---

## 1. Executive Summary & Verdict

### Final Verdict: `CONDITIONAL GO`

- **Verdict Determination**:
  1. **Core Capability Integrity**: The natural-language reminder capability (via `chrono-node` v2.10.3) correctly extracts title, local date/time, and recurrence metadata relative to an explicit reference instant and user time zone. Ambiguous dates ("03/04/2027"), bare hours ("at 7"), DST transitions (gaps/overlaps), and past dates fail closed cleanly with prescriptive user guidance.
  2. **Audit & Route Reconciliations**: Routing wiring is complete (`app.all('/api/reminders')` mounted in `server.js` and dynamic delegate established in `pages/api/reminders.js`). `npx next build` bundles `ƒ /api/reminders` (0 B, 80.6 kB First Load JS).
  3. **Browser E2E Reliability (Fix B)**: `test/run_browser_reminders_and_views_e2e.js` replaces hardcoded Windows paths with multi-platform executable discovery (`CHROME_PATH`, `CHROME_BIN`, Windows, macOS, Linux paths). It enforces fail-closed exit-1 when a viable browser cannot run, unless explicitly opted into via `ALLOW_BROWSER_E2E_SKIP=1`. All 8 browser phases execute with deterministic DOM readiness checks and guaranteed teardown of processes, sockets, servers, and temporary user profiles.
  4. **Session-Secret Security Terminology & Enforcement (Fix C)**: `api/reminders.js` enforces a strict minimum character length of 32 characters and at least 32 decoded bytes. The code enforces length and byte boundaries but cannot mathematically prove or guarantee cryptographic entropy (demonstrated by `'a'.repeat(32)` satisfying length checks); operational security depends on provisioning a cryptographically random secret generated using `openssl rand -hex 32` or an equivalent secure method. Missing, undersized, malformed, altered, and expired session cookies are rejected without issuing signed cookies or allowing persistent writes. Cross-origin writes are rejected with HTTP 403.
  5. **Operational Conditions for Full Production Promotion**:
     - **Redis Persistence**: Durable reminder storage requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production environment variables. Until provisioned, the application honestly operates in preview-only mode with the save action safely gated.
     - **Session Secret**: Production requires `MILO_SESSION_SECRET` meeting the 32-character and 32-byte threshold, provisioned with a cryptographically random secret generated using `openssl rand -hex 32` or an equivalent secure method.
     - **Identity Coupling**: Saved reminders are scoped to signed browser session cookies (`milo_reminder_session`), not yet coupled to canonical `AuthService` user accounts.
     - **Notification Delivery**: Notifications remain explicitly declared as unconfigured (`Saved · Notifications off`). Scheduled delivery via a background worker (e.g. QStash/Cron) is a future roadmap item.

---

## 2. Commit Lineage, PR State & Traceability

### 2.1 Remote PR Verification Record (GitHub REST API)
- **Verified Timestamp**: `2026-10-22T10:35:00Z` (2026-10-22 16:05 IST)
- **Remote PR Base SHA**: `3591b14c10f52fe3bf6aedd5ffe15672e3297d90` (`refs/heads/main`)
- **Evaluated PR Head SHA**: `0466173a437767455b6d22f90233f6f13e767e9e` (`refs/heads/feat/natural-language-reminders`)
- **Preceding Candidate SHA**: `60f7405cdd3031d690854a097a112fb723e258c3`
- **Total Changed Files in PR #18**: 16 files (all verified against GitHub REST API `GET /repos/AnkitaPriyadarshini-repos/Second-Brain-AI-System/pulls/18/files`)
- **Authoritative Traceability & Loop Avoidance**: To avoid self-referencing commit loops where committing audit documentation generates a new commit SHA, the live GitHub PR metadata (`GET /repos/AnkitaPriyadarshini-repos/Second-Brain-AI-System/pulls/18`) is authoritative for the active PR head SHA. Each set of verification tests, static analyses, and deployment checks recorded in this audit is explicitly tied to the exact commit SHA against which it was executed.

### 2.2 Commit Progression & Evolution
| Commit SHA | Commit Title / Purpose | Test Execution & Role |
| :--- | :--- | :--- |
| `3591b14c10f52fe3bf6aedd5ffe15672e3297d90` | Base commit (`origin/main`) | Comparison baseline. Contains pre-existing video mock behavior. |
| `67a0f6499bcc03e192732f8d9463980cc4e4552a` | `test(reminders): verify preview-only mode fails closed for saves` | Initial PR candidate. Missing route wiring in `server.js` and `pages/api/reminders.js`. |
| `84df315679fd0d9e02823be9f048f1eda183c4a4` | `feat(reminders): mount /api/reminders route, add Next.js API delegate, browser E2E test, and audit report` | Added route mounting, Next.js delegate, initial browser E2E, and initial audit document. |
| `4dfb39c0f327b813585ae7e247fdca2514dfc68e` | `docs: reconcile audit document with candidate commit and 22-suite test pipeline` | Reconciled package.json scripts with 22 test suites and verified pipeline. |
| `60f7405cdd3031d690854a097a112fb723e258c3` | `fix(release-gate): enforce 32-byte session secret, harden browser E2E, and reconcile audit` | Preceding candidate commit.<br>**Fix A**: Commit traceability & audit reconciliation.<br>**Fix B**: Browser E2E discovery, deterministic polling & fail-closed skip controls.<br>**Fix C**: 32-char / 32-byte secret enforcement, expanded session tests & .env.example documentation. |
| `0466173a437767455b6d22f90233f6f13e767e9e` | `fix(reminders): synchronize regression audit and correct session-secret entropy terminology` | Evaluated candidate PR head.<br>- Corrected session-secret security terminology across `.env.example`, `api/reminders.js`, `test/run_reminder_api_tests.js`, and audit.<br>- Executed full 22-suite test pipeline (100% clean pass, exit code 0).<br>- Vercel Preview deployments and GitHub check runs completed successfully. |

---

## 3. Verified PR Diff & File Change Register

All 16 changed files in PR #18 have been verified against the live GitHub repository:

| File Path | Status | Change Description |
| :--- | :--- | :--- |
| `.env.example` | Modified | Added `MILO_SESSION_SECRET` documentation (min 32 chars/32 bytes) with `openssl rand -hex 32` instructions and entropy distinction. |
| `api/reminders.js` | Added | Serverless reminder handler: NLP preview, two-phase confirmation, 32-char / 32-byte secret gate, owner isolation, same-origin check. |
| `css/natural-language-reminders.css` | Added | Scoped styling under `.milo-reminder-*` adhering to Onyx dark theme tokens. |
| `docs/feature-regression-audit.md` | Added | Master feature register, non-regression audit, and release-gate report. |
| `docs/natural-language-reminders.md` | Added | Architecture, design decisions, and operational guide for reminders. |
| `index.html` | Modified | Added `#view-reminders` section with accessible inputs, preview card, and navigation entry. |
| `js/natural-language-reminders.js` | Added | Client controller IIFE: input debouncing, real-time preview, live editing, draft state management. |
| `package.json` | Modified | Added `chrono-node` dependency, updated `test` (22 suites) and `test:reminders` scripts. |
| `package-lock.json` | Modified | Locked `chrono-node` v2.10.3 integrity with SHA-512 hashes. |
| `pages/api/reminders.js` | Added | Next.js API delegate forwarding requests to `api/reminders.js`. |
| `server.js` | Modified | Express route mount: `app.all('/api/reminders', ...)`. |
| `services/reminder-parser.js` | Added | Pure parsing service: `chrono-node` extraction, timezone resolution, DST gap/overlap guards. |
| `test/run_browser_reminders_and_views_e2e.js` | Added | Chrome CDP browser E2E: 8 phases covering multi-view navigation, preview, editing, error integrity. |
| `test/run_reminder_api_tests.js` | Added | API test suite: 5 suites covering length/byte gates vs entropy, cookie integrity, CSRF rejection, CRUD & owner isolation. |
| `test/run_reminder_parser_tests.js` | Added | 14 test cases covering timezone edge cases, leap years, recurrence, DST shifts. |
| `test/run_reminder_ui_contract_tests.js` | Added | Contract suite verifying DOM IDs, route wiring, security guardrails, and feature disclosures. |

---

## 4. Test Evidence & Environment Specifications

### 4.1 Test Execution Environment
- **Evaluated Target Commit**: `0466173a437767455b6d22f90233f6f13e767e9e`
- **Node Runtime**: `v22.12.0`
- **Platform**: `win32 x64` (Windows 11)
- **Package Manager**: npm `10.9.0`
- **Browser Binary Discovered**: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Google Chrome 145.x)
- **CDP Debugging Port**: `9489` (Reminders E2E), `9488` (Chat E2E)
- **Local HTTP Test Server**: `3788` (Reminders E2E), `3699` (Chat E2E)
- **Environment Policy**: Tests executed serially to prevent port, environment variable, or browser profile collisions.

### 4.2 Directly Observed Test Execution Results (Executed Against `0466173`)

| Command | Environment Flags | Exit Code | Suites / Phases Executed | Observed Result |
| :--- | :--- | :--- | :--- | :--- |
| `npm run test:reminders` | Default / Neutral | **0** | 4 suites / 28 cases | **PASS** (Parser: 14/14, API: 5/5 suites, UI Contract: 1/1, Browser E2E: 8/8 phases) |
| `npm test` | Default / Neutral | **0** | **22 suites** | **PASS** (All 22 test suites passed cleanly in sequence) |
| `node test/run_reminder_api_tests.js` | Default / Neutral | **0** | 5 suites / 15 assertions | **PASS** (Secret length & byte gates, preview unconfigured, cookie tamper/expiry, CSRF, owner isolation) |
| `node test/run_browser_reminders_and_views_e2e.js` | Default / Neutral | **0** | 8 browser phases | **PASS** (6 views navigated, 3 cycles, draft preview, live edit, hour prompt, ambiguous date, mobile, 0 errors) |
| `node test/run_session_security_tests.js` | Default / Neutral | **0** | 5 suites | **PASS** (Token signing, multi-instance verification, anti-spoofing) |
| `npx next build` | Production build | **0** | Route compilation | **PASS** (Compiled `ƒ /api/reminders` 0 B / 80.6 kB First Load JS) |
| `node --check ...` | Node syntax checker | **0** | 7 modified/related files | **PASS** (All JS syntax validated cleanly) |

### 4.3 Browser E2E Fail-Closed & Skip Verification
- **Unviable Browser Without Opt-In**:
  - Command: `CHROME_PATH=C:\non_existent.exe node test/run_browser_reminders_and_views_e2e.js`
  - Exit Code: **1** (Strict non-zero exit; prints `❌ [FATAL] Browser E2E failed: No viable Chrome/Chromium executable discovered`).
- **Unviable Browser With Explicit Opt-In**:
  - Command: `CHROME_PATH=C:\non_existent.exe ALLOW_BROWSER_E2E_SKIP=1 node test/run_browser_reminders_and_views_e2e.js`
  - Exit Code: **0** (Prints visible warning: `⚠️ [SKIP] Browser E2E skipped: No Chrome/Chromium executable discovered and ALLOW_BROWSER_E2E_SKIP=1 is set`).

### 4.4 Pre-Existing Baseline Video Anomaly (`run_media_coding_agent_tests.js:115`)
- **Observed Behavior**: Under `NODE_ENV=test`, `node test/run_media_coding_agent_tests.js` fails with `AssertionError: 202 !== 503`.
- **Root Cause**: `api/media/video.js:26` activates mock video provider when `NODE_ENV === 'test'`, causing an unconfigured video creation request to return `202 Accepted` rather than the `503 Service Unavailable` asserted by line 115.
- **Attribution**: Verified identical behavior on unmodified `origin/main` (`3591b14`).
- **Resolution Strategy**: Left unmodified as instructed to preserve baseline integrity. Under the default/neutral environment used by `npm test`, the test suite passes 19/19 cleanly with exit code 0.

---

## 5. Security & Isolation Verification (Fix C)

### 5.1 Session Secret Minimum Length & Decoded-Byte Enforcement vs. Cryptographic Entropy
- **Programmatic Boundaries**: `api/reminders.js` enforces a strict minimum character length of 32 characters and a decoded byte length of at least 32 bytes (`MIN_SECRET_LENGTH = 32`).
- **Entropy Distinction**: Minimum character and byte-length checks alone cannot prove cryptographic entropy. For example, `'a'.repeat(32)` satisfies both the 32-character and 32-byte thresholds despite having negligible entropy. The runtime cannot mathematically guarantee 256-bit entropy; cryptographic security depends on the operator provisioning a cryptographically random secret generated using `openssl rand -hex 32` (or `openssl rand -base64 32`).
- **Encoding Support**:
  - UTF-8 string: >= 32 characters and >= 32 bytes.
  - Hex-encoded (`openssl rand -hex 32`): 64 hex characters decoding to 32 bytes.
  - Base64-encoded (`openssl rand -base64 32`): 44 base64 characters decoding to 32 bytes.
- **Undersized Rejection**: 16-character and 31-character strings return `''` from `getSessionSecret()`, preventing session cookie generation and blocking persistent saves.

### 5.2 Session Integrity & Cookie Security
- **Cookie Format**: Base64URL-encoded payload (`version`, `ownerId`, `expiresAt`) concatenated with HMAC-SHA256 signature using `timingSafeEqual`.
- **Malformed Cookies**: Tokens missing dots or containing corrupt Base64 fail verification immediately and return HTTP 503.
- **Tampered Cookies**: Any bit alteration in payload or signature fails cryptographic verification.
- **Expired Cookies**: Tokens where `expiresAt <= Date.now()` are rejected.
- **Cookie Flags**: `Path=/api/reminders; HttpOnly; SameSite=Lax` (`Secure` enforced on Vercel or HTTPS).

### 5.3 Cross-Origin Request Forgery (CSRF) Defense
- Mutating endpoints (`POST action=save`, `DELETE`) require `sameOrigin(req)`.
- Requests where `Origin` does not match `Host` or `x-forwarded-host` are rejected with HTTP 403 Forbidden (`Cross-origin reminder writes are not allowed`).
- Requests lacking an `Origin` header on state-mutating operations are rejected with HTTP 403 Forbidden.

### 5.4 Multi-Tenant Owner Isolation
- User A saves a reminder with ID `rem_<uuid>`.
- User B (separate anonymous session cookie) requests `GET /api/reminders` -> returns empty array (0 reminders).
- User B attempts `DELETE /api/reminders` with User A's ID -> returns HTTP 404 (`Reminder not found`).
- User A requests `GET /api/reminders` -> reminder remains intact.
- User A requests `DELETE /api/reminders` -> returns HTTP 200 (`deleted: true`).

---

## 6. Comprehensive Feature Register

| ID | Feature Area | Key Files | Route / DOM ID | Persistence | Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **Notes Vault** | `js/store.js`, `controllers/NoteController.js` | `#view-vault`, `GET/POST /api/notes` | IndexedDB / LocalStorage | Automated | Preserved |
| **F-02** | **AI Chat & RAG** | `js/production-chat.js`, `api/ai/gateway.js` | `#view-jarvis`, `POST /api/ai/gateway` | Store threads | Real Browser CDP | Preserved |
| **F-03** | **Goals & Milestones**| `controllers/GoalController.js` | `#view-goals`, `GET/POST /api/goals` | Store / Memory | Automated | Preserved |
| **F-04** | **Flashcards** | `js/resurfacing-engine.js` | `#view-flashcards` | Dynamic from notes | Real Browser CDP | Preserved |
| **F-05** | **Knowledge Graph** | `js/graph-visualizer.js` | `#view-graph`, `#graph-canvas` | In-memory canvas | Manual / Unit | Preserved |
| **F-06** | **Agent Fleet** | `js/autonomous-agent.js`, `js/agent-system.js` | `#view-agents` | Local artifacts | Automated | Preserved |
| **F-07** | **Deep Research** | `js/deep-research-engine.js` | `#view-research` | Memory report state | Automated | Preserved |
| **F-08** | **Diff Workspace** | `js/diff-coding-agent.js` | `#view-code` | Virtual FS in memory | Automated | Preserved |
| **F-09** | **Image Studio** | `api/media/image.js` | `#view-create`, `POST /api/media/image` | Ephemeral URLs | Automated | Preserved |
| **F-10** | **Video Studio** | `api/media/video.js` | `POST /api/media/video` | File tmp store | Automated | Preserved |
| **F-11** | **WebSocket SSR** | `server.js`, `components/RealTimeChat.js` | `ws://localhost:3000/ws/chat` | In-memory channels | Automated | Preserved |
| **F-12** | **Session Security** | `api/auth-guard.js` | `POST /api/auth/login` | Session tokens / DB | Automated | Preserved |
| **F-13** | **PWA & Responsive** | `sw.js`, `css/responsive.css` | `#view-settings`, Mobile Drawer | CacheStorage | Real Browser CDP | Preserved |
| **F-14** | **NL Reminders** | `services/reminder-parser.js`, `api/reminders.js` | `#view-reminders`, `/api/reminders` | Upstash Redis REST | Real Browser CDP & API | **VERIFIED** |

---

## 7. Build, Deployment & Vercel Preview Verification

### 7.1 Production Build Validation
- Executed `npx next build` cleanly without warnings or errors.
- Bundle output confirms `/api/reminders` is recognized as a server-rendered dynamic API route:
  ```
  Route (pages)                             Size     First Load JS
  ├ ƒ /api/reminders                        0 B            80.6 kB
  ```
- Client JS footprint for reminders is minimal (`css/natural-language-reminders.css` ~3.2 kB, `js/natural-language-reminders.js` ~7.8 kB).

### 7.2 Vercel Preview Deployments & Status Checks Lineage

#### 7.2.1 Evaluated Candidate PR Head Commit: `0466173a437767455b6d22f90233f6f13e767e9e`
- **Vercel Project 1: `second-brain-ai-system`**:
  - **Deployment Status**: `READY` (State: `success`)
  - **Preview URL**: https://second-brain-ai-s-git-3e13f0-ankitapriyadarshini-repos-projects.vercel.app
  - **Inspector URL**: https://vercel.com/ankitapriyadarshini-repos-projects/second-brain-ai-system/FS9zbfb9Pufw5cFhB99hPxWXU1u2
  - **Timestamp**: `2026-10-22T10:32:18Z`
- **Vercel Project 2: `second-brain-ai-app`**:
  - **Deployment Status**: `READY` (State: `success`)
  - **Preview URL**: https://second-brain-ai-a-git-17f4c3-ankitapriyadarshini-repos-projects.vercel.app
  - **Inspector URL**: https://vercel.com/ankitapriyadarshini-repos-projects/second-brain-ai-app/5eD3LBhm7qi3rUh5GKqsTauVA2hv
  - **Timestamp**: `2026-10-22T10:32:07Z`
- **GitHub Status Checks & Check Runs**:
  - Context `Vercel - second-brain-ai-system`: State: `success` ("Deployment has completed")
  - Context `Vercel - second-brain-ai-app`: State: `success` ("Deployment has completed")
  - Check Run `Vercel Preview Comments`: Status: `completed`, Conclusion: `success` (Run ID: `119774311373`, URL: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/runs/119774311373, Completed: `2026-10-22T10:32:19Z`)

#### 7.2.2 Preceding Candidate Commit: `60f7405cdd3031d690854a097a112fb723e258c3`
- **Vercel Project 1: `second-brain-ai-system`**:
  - **Deployment Status**: `READY` (State: `success`)
  - **Preview URL**: https://second-brain-ai-s-git-3e13f0-ankitapriyadarshini-repos-projects.vercel.app
  - **Inspector URL**: https://vercel.com/ankitapriyadarshini-repos-projects/second-brain-ai-system/5LMz9VoNvuj9YHgwYJEDvZZYXZJQ
  - **Timestamp**: `2026-10-22T06:20:38Z`
- **Vercel Project 2: `second-brain-ai-app`**:
  - **Deployment Status**: `READY` (State: `success`)
  - **Preview URL**: https://second-brain-ai-a-git-17f4c3-ankitapriyadarshini-repos-projects.vercel.app
  - **Inspector URL**: https://vercel.com/ankitapriyadarshini-repos-projects/second-brain-ai-app/GeyioxqAgtbVPpRWe6FNbAggt8xW
  - **Timestamp**: `2026-10-22T06:20:26Z`
- **GitHub Check Run `Vercel Preview Comments`**: Status: `completed`, Conclusion: `success` (Run ID: `119673232665`, URL: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/runs/119673232665, Completed: `2026-10-22T06:20:39Z`)

#### 7.2.3 Historical Deployment Records (Older Commits)
- *Prior Commit `4dfb39c0f327b813585ae7e247fdca2514dfc68e` (Superceded)*: Deployment ID `7244797795`, Preview URL `https://second-brain-ai-system-c95eo9q0a.vercel.app` (Historical record, superseded by commit `60f7405` and `0466173` preview deployments).

- **Evidence Separation Principle**: Successful Vercel deployment proves code compilability and asset bundling; automated test execution (unit, contract, security, and browser E2E) provides independent verification of runtime functional correctness.

---

## 8. Remaining Limitations & Production Gate Requirements

1. **Storage Backend**: Upstash Redis REST credentials (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) must be configured in production environment variables before persistent reminder saves can succeed. Until then, saving safely fails closed with HTTP 503 and preview parsing remains fully operational.
2. **Session Secret**: Production deployment requires a cryptographically random `MILO_SESSION_SECRET` meeting the minimum 32-character and 32-byte threshold, generated via `openssl rand -hex 32` or an equivalent secure method.
3. **Account Identity Coupling**: Reminders currently use signed anonymous browser session cookies (`milo_reminder_session`). Coupling with `AuthService` canonical accounts is scheduled for a future release.
4. **Notification Scheduling**: Notifications are explicitly declared as off (`Saved · Notifications off`). An asynchronous scheduler (e.g. Upstash QStash or Vercel Cron worker) is required before reminder notification delivery can be enabled.

---

## 9. Direct Links

- **Pull Request #18**: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/pull/18
- **Audit Document**: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/blob/feat/natural-language-reminders/docs/feature-regression-audit.md
- **Browser E2E Test Suite**: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/blob/feat/natural-language-reminders/test/run_browser_reminders_and_views_e2e.js
- **Reminders Serverless API**: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/blob/feat/natural-language-reminders/api/reminders.js
- **Environment Template**: https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System/blob/feat/natural-language-reminders/.env.example
