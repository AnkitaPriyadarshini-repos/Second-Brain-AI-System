# Milo AI — Live Staging Verification & Cloud Infrastructure Audit

**Document Reference:** `reports/milo-live-staging-verification.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Current Certified HEAD:** `08acb43`  
**Audit Timestamp:** 2026-10-28T00:48:00+05:30  
**Lead Roles:** Principal Site Reliability Engineer, Cloud Infrastructure Architect, Application Security Engineer, Backend Engineer, QA Automation Lead

---

## 1. Executive Summary & Audit Baseline

This audit evaluates the Milo AI workspace against live staging infrastructure requirements, analyzes the architectural boundaries between local Express (`server.js`) and deployed Vercel Serverless (`api/**/*.js`), audits configuration presence and secret safety without exposing values, and separates local mock benchmark evidence from live cloud readiness.

### Key Audit Findings:
1. **Repository & Code Integrity:** The working tree is clean on isolated branch `audit/milo-100-user-certification` at commit `08acb43`. No commits were pushed to `origin`, PR #21 was not merged, and production branches remain untouched.
2. **Local Regression Pipeline (100% Pass):** All 44 test suites/files passed cleanly across standard regression, production security hardening, PostgreSQL persistence, and distributed rate limiting (`npm run test:all` exited with code `0`).
3. **Environment Variable Audit:** Inspection of the execution environment confirms that production variables (`MILO_SESSION_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are **NOT SET** in the local runtime shell. In accordance with strict certification rules, direct Vercel cloud settings cannot be inspected from the local shell and are classified as **UNVERIFIED (OPERATOR ACTION REQUIRED)**.
4. **Cloud Infrastructure Status:** Live PostgreSQL persistence and live distributed Redis rate limiting against external cloud clusters are classified as **BLOCKED** due to lack of provisioned staging credentials in the local test execution context. Hermetic multi-process harnesses passed with 100% accuracy.
5. **Architectural Disparity Identified:** The frontend is architected as a Client-First / Local-First PKM system where notes are stored in client `localStorage` and sent with prompt context to stateless serverless endpoints. Asynchronous video jobs (`api/media/job-store.js`) currently rely on ephemeral `/tmp` storage, which requires external KV/database backing for multi-container horizontal scale.

---

## 2. Test Execution Commands & Verified Baseline Results

All non-destructive automated suites were executed on the audit branch. Every command, exit code, test count, and environment type is recorded below:

| Command Executed | Exit Code | Suite / File Count | Tests / Assertions | Test Environment / Type | Results & Sanitized Summary |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `npm test` | **0** | 21 test files | 21 suites | Local Node.js / Mock Provider | **PASS.** Core PKM, RAG, DIP adapters, WebSocket SSR, welcome flow, trace card. 0 regressions. |
| `npm run test:hardening` | **0** | 1 test file | 13 numbered suites | Local Node.js / Mock Provider | **PASS.** 32-char secret policy, timing-safe buffer equality, SSRF blocking, cache invalidation, quota 429 redaction. |
| `npm run test:persistence` | **0** | 1 test file | 5 numbered suites | Multi-Process / Mock PostgreSQL | **PASS.** DDL schema, ACID transactions, cross-process cold start, multi-user isolation, controlled DB errors. |
| `npm run test:distributed` | **0** | 1 test file | 4 numbered suites | Multi-Process / Mock Redis HTTP Server | **PASS.** Shared bucket synchronization across 2 independent processes, user isolation, 5 req/min outage ceiling. Live cloud: **BLOCKED**. |
| `npm run test:gemini` | **0** | 1 test file | 1 safety suite | Local Safety Gate / No External Calls | **PASS.** Safety bounds validated (max 2 reqs, 10s timeout). Live traffic safely blocked without `--run-live=true`. |
| `node test/load_test_suite.js --stages` | **0** | 1 load harness | 6 stages + 3 soak waves | Local Mock Provider (Mode A) | **PASS.** 10 to 150 users, 761.2 peak RPS, 137.9ms p95, 0 failures, 0 cross-user data leaks. |
| `npm run test:all` | **0** | 25 test files | 44 total suites / 100+ tests | Master Regression Pipeline | **PASS.** Complete hermetic regression runs end-to-end in ~35s with 100% pass rate. |

---

## 3. Environment Configuration Audit (Zero-Secret Disclosure)

The application configuration requirements were audited across `server.js`, `api/auth-guard.js`, `api/ai/gateway.js`, `services/DistributedRateLimiter.js`, `services/PostgresStoreService.js`, and `.env.example`.

### 3.1 Variable Presence Audit
Verification was performed via non-destructive runtime inspection checking solely for boolean presence:

| Environment Variable | Local Environment Status | Intended Environment | Purpose & Runtime Sensitivity |
| :--- | :---: | :--- | :--- |
| `MILO_SESSION_SECRET` | **NOT SET** | Production & Preview | Cryptographic HMAC-SHA256 signing of session tokens. Must be >= 32 characters. |
| `GEMINI_API_KEY` | **NOT SET** | Production & Preview | Google Gemini API key for text generation and multimodal RAG queries. |
| `DATABASE_URL` | **NOT SET** | Staging & Production | PostgreSQL pooled connection string for durable multi-instance note persistence. |
| `UPSTASH_REDIS_REST_URL` | **NOT SET** | Staging & Production | REST endpoint for synchronized distributed rate limiting across serverless containers. |
| `UPSTASH_REDIS_REST_TOKEN` | **NOT SET** | Staging & Production | Bearer token for Upstash Redis REST pipeline operations. |
| `KV_REST_API_URL` | **NOT SET** | Staging & Production | Alternative Vercel KV REST endpoint (supported as fallback). |
| `KV_REST_API_TOKEN` | **NOT SET** | Staging & Production | Alternative Vercel KV bearer token. |

> [!IMPORTANT]
> **Vercel Cloud Configuration Status:** Because Vercel Project Settings cannot be directly queried from this local workspace environment, environment presence in Vercel remains **UNVERIFIED**. The deployment operator must confirm that these variables are set in the Vercel dashboard prior to releasing the pilot.

### 3.2 Security Policy Enforcement Audit
1. **No Insecure Production Fallbacks:**
   - In `services/AuthService.js` and `api/auth-guard.js`, the fallback key (`sb_second_brain_secure_jwt_secret_key_2026`) is explicitly hardcoded in a rejection denylist.
   - When `NODE_ENV === 'production'`, encountering this legacy fallback immediately throws a `CRITICAL_CONFIGURATION_ERROR`.
2. **Strict 32-Character Entropy Threshold:**
   - Secrets shorter than 32 characters are rejected with `CRITICAL_CONFIGURATION_ERROR: Session secret must be at least 32 characters long in production`.
   - Verified via Suite 8 of production hardening regression tests.
3. **Fail-Closed Semantics:**
   - If `MILO_SESSION_SECRET` is unset, empty, or undefined in production, protected endpoints refuse all requests and return HTTP 500/503 with generic error codes (`SERVER_CONFIGURATION_ERROR`).
4. **Zero Credential Exposure in Logs & Responses:**
   - In `api/ai/gateway.js`, all provider error messages pass through a redaction regex stripping `AIza[0-9A-Za-z-_]{15,}` and raw keys before sending responses or printing serverless logs.
   - Test outputs in `test/run_production_hardening_regression_tests.js` verify that error objects emit `Key [REDACTED] failed`.

---

## 4. PostgreSQL Persistence Audit & Isolation Sequence

### 4.1 Schema DDL & Connection Architecture
[services/PostgresStoreService.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/services/PostgresStoreService.js) defines the schema DDL for production PostgreSQL storage:
- **Primary Key:** Composite `(user_id, id)` guaranteeing multi-tenant partition boundaries at the storage engine level.
- **Indexes:** `idx_notes_user (user_id)` and `idx_notes_user_updated (user_id, updated_at DESC)`.
- **Connection Pool:** Configured via `pg.Pool` with `max: parseInt(process.env.PG_POOL_MAX || '10')`, 30s idle timeout, and 5s connection timeout.
- **Transactions:** Handled via `withTransaction()` utilizing atomic `BEGIN`, `COMMIT`, and `ROLLBACK` blocks.

### 4.2 Controlled Verification Sequence Results (Suite 1–5 in `test:persistence`)
The controlled integration sequence was executed against the hermetic multi-process test harness:
1. **Create as User A:** User A (`usr_alice`) saved note `note_confidential_a_101`. Write succeeded and returned note ID.
2. **Read Back as User A:** User A retrieved note matching title, content, and timestamps.
3. **User B Access Denial:**
   - User B (`usr_bob`) queried note ID `note_confidential_a_101` -> received `null`.
   - User B note list query -> returned `count: 0`.
   - User B search for "Patent" -> returned `[]`.
   - User B attempted overwrite -> threw `UNAUTHORIZED_MODIFICATION: Note belongs to another user vault`.
   - User B attempted pin toggle -> returned `null` / HTTP 404.
   - User B attempted deletion -> returned `false` / HTTP 404.
4. **Cross-Process Survival & Cold Start:**
   - Process 1 wrote note `note_proc_1_user_a` and exited cleanly (PID terminated).
   - Process 2 initialized fresh store and retrieved note `note_proc_1_user_a` with identical contents.
5. **Database Failure Mode:**
   - Configured unreachable connection string (`postgresql://invalid:invalid@127.0.0.1:54329/db`).
   - Connection attempt threw `DATABASE_CONNECTION_ERROR`.
   - Write attempt threw `DATABASE_CONNECTION_ERROR` instead of silent data loss.
6. **Live Staging PostgreSQL Status:**
   - **BLOCKED.** Staging `DATABASE_URL` is not provisioned in the local test execution context. Live end-to-end cloud database verification requires operator provisioning.

---

## 5. Distributed Rate Limiting & Shared Redis Audit

### 5.1 Architecture & Pipeline Design
[services/DistributedRateLimiter.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/services/DistributedRateLimiter.js) coordinates rate limits across multiple independent application processes using the atomic Upstash Redis REST Pipeline API:
```http
POST /pipeline
[
  ["INCR", "milo:ratelimit:ai:usr_alice:w60"],
  ["EXPIRE", "milo:ratelimit:ai:usr_alice:w60", 60, "NX"],
  ["TTL", "milo:ratelimit:ai:usr_alice:w60"]
]
```

### 5.2 Verification Sequence Results (Suite 1–4 in `test:distributed`)
1. **Two-Process Shared State Synchronization:**
   - A mock atomic Upstash HTTP server was started on `127.0.0.1`.
   - Process A executed 7 requests; Process B executed 5 requests (configured limit: 10 req/min).
   - Process A used 7 tokens (all allowed).
   - Process B used 3 remaining tokens (allowed) and was throttled on requests 4 and 5 with `allowed: false` and `exceeded: true`.
   - Proves atomic counter aggregation across independent OS processes.
2. **Per-User Isolation:**
   - User Charlie submitted requests while Alice and Bob were throttled. Charlie received full allowance without cross-user interference.
3. **Outage Fail-Safe Degradation Policy:**
   - Simulated Redis outage with unreachable port.
   - Limiter caught `fetch failed` exception within 200ms timeout.
   - Gracefully clamped down to degraded local ceiling: **5 requests per minute** per client.
   - Allowed exactly 5 requests, throttled subsequent 5 requests, and attached `degraded: true` metadata.
4. **Live Staging Redis Status:**
   - **BLOCKED.** Live Upstash Redis credentials (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) are not provisioned. Live cloud distributed test is blocked pending operator setup.

---

## 6. Real Gemini API Smoke Test Audit

### 6.1 Safety Configuration & Controls
[test/real_gemini_smoke_test.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/real_gemini_smoke_test.js) establishes strict guardrails against unmetered AI spend:
- **Max Request Ceiling:** Capped at 2 requests total (hard code limit: 3).
- **Concurrency Bound:** Capped at 1 worker (hard code limit: 2).
- **Duration Bound:** 10,000ms hard abort controller.
- **Spend Protection:** Strictly limited to text queries; zero image or video generation.
- **Safety Default:** Requires explicit `--run-live=true` flag AND valid `GEMINI_API_KEY`.

### 6.2 Execution Audit Result
```bash
$ node test/real_gemini_smoke_test.js
🔒 [STATUS: BLOCKED / SKIPPED]
   Live upstream Gemini traffic was NOT sent because either:
   a) GEMINI_API_KEY is not configured with a valid live Google AI key, or
   b) Explicit --run-live flag was omitted to protect quota and spend.
✅ Real Gemini smoke test safety controls validated successfully.
```
- **Live Upstream Call Status:** **BLOCKED / SKIPPED.** The test refused to send unauthorized network requests.

---

## 7. Deployed Architecture Inspection (Express vs Vercel Serverless)

A systematic component-by-component audit was conducted to evaluate compatibility with Vercel Serverless hosting (`https://second-brain-ai-system.vercel.app`):

| Component / Workflow | Source Implementation | Hosting Runtime | Architecture Classification | Technical Rationale & Required Operator Actions |
| :--- | :--- | :--- | :--- | :--- |
| **AI Gateway** | `api/ai/gateway.js` | Vercel Serverless | **Verified Compatible** | Fully stateless. Receives prompt and `contextNotes` in request body. Bounded to 24s execution to avoid Vercel 30s cutoff. |
| **Session Auth Guard** | `api/auth-guard.js` | Vercel Serverless | **Verified Compatible** | Fully stateless HMAC-SHA256 signature verification. Uses timing-safe equality. Fails closed without secrets. |
| **URL Ingestion** | `api/ingest/url.js` | Vercel Serverless | **Verified Compatible** | Bounded fetch with 2048-char URL limit and private IPv4/IPv6 SSRF blocking. Fully stateless. |
| **Client PKM Notes** | `js/store.js`, `js/storage-adapters.js` | Browser Client | **Verified Compatible** | Client-First architecture: notes persist in browser `localStorage` (`second_brain_notes_v2`). Safe for pilot. |
| **Server Notes REST API** | `server.js`, `NoteController.js` | Node.js Express Only | **Requires External Durable Storage** | Express exposes `/api/notes`. In Vercel serverless, this route requires PostgreSQL (`DATABASE_URL`) to persist across container recycles. |
| **Async Video Jobs** | `api/media/job-store.js` | Vercel Serverless | **Requires External Durable Storage** | Uses `os.tmpdir()/milo_jobs`. In multi-container Vercel deployments, `/tmp` is not shared across instances. Polling will fail if hit on different container unless backed by Redis/PostgreSQL. |
| **Image Generation** | `api/media/image.js` | Vercel Serverless | **Verified Compatible** | Stateless proxy to Imagen 3 / Pollinations with 22s timeout. Returns base64 / URL directly. |
| **WebSockets** | `server.js` (`ws` library) | Node.js Express Only | **Requires Architectural Change** | Vercel Serverless does NOT support long-lived TCP WebSockets. Real-time chat requires Server-Sent Events (SSE) or Pusher/Ably on Vercel. |
| **Distributed Rate Limiting** | `services/DistributedRateLimiter.js` | Vercel Serverless | **Verified Compatible (Once Configured)** | Uses native HTTPS `fetch` against Upstash REST pipeline. Works across all Vercel edge/serverless runtimes without native socket dependencies. |

---

## 8. Summary of Blocked Checks & Exact Next Operator Actions

| Blocked Check | Root Cause | Operator Action Required to Unblock |
| :--- | :--- | :--- |
| **Live Staging PostgreSQL Persistence** | `DATABASE_URL` is not provisioned in the test environment. | Provision a disposable PostgreSQL database (Supabase, Neon, or Vercel Postgres) and export `DATABASE_URL`. Run `npm run test:persistence`. |
| **Live Distributed Redis Rate Limiting** | `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set. | Create a free Upstash Redis database, export the REST credentials, and run `node test/run_distributed_rate_limiting_tests.js --run-cloud=true`. |
| **Live Upstream Gemini Smoke Test** | `GEMINI_API_KEY` is not set and `--run-live=true` was omitted. | Configure `GEMINI_API_KEY` with an authorized Google AI key and execute `node test/real_gemini_smoke_test.js --run-live=true`. |
| **Vercel Cloud Settings Verification** | Vercel environment variables cannot be read from the local shell. | In Vercel Dashboard -> Settings -> Environment Variables, verify that `MILO_SESSION_SECRET` (>= 32 chars) and `GEMINI_API_KEY` are populated for Production and Preview. |
