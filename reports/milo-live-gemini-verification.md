# Milo AI — Live Gemini Provider Verification & Quota Audit

**Document Reference:** `reports/milo-live-gemini-verification.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Git Commit SHA:** `200770f9ed1aa14240b4128c207f59dc46e48fe2` (`200770f`)  
**Timestamp:** 2026-10-28T18:35:00+05:30  
**Test Script:** [test/real_gemini_smoke_test.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/test/real_gemini_smoke_test.js)  
**Execution Command:** `npm run test:gemini`  

---

## 1. Safety Gate Audit & Verification Status

```bash
$ node test/real_gemini_smoke_test.js
🔒 [STATUS: BLOCKED / SKIPPED]
   Live upstream Gemini traffic was NOT sent because either:
   a) GEMINI_API_KEY is not configured with a valid live Google AI key, or
   b) Explicit --run-live flag was omitted to protect quota and spend.
✅ Real Gemini smoke test safety controls validated successfully.
```

- **Live Provider Status:** **BLOCKED / SKIPPED**.
- **Rationale:** To protect the user from unexpected billing, unmetered quota consumption, and API key exposure, the automated test harness enforces strict opt-in controls.
- **Safety Boundaries in Code:**
  - `MAX_TEST_REQUESTS = 2` (hard ceiling: 3).
  - `CONCURRENCY_LIMIT = 1` worker (hard ceiling: 2).
  - `TIMEOUT_MS = 10,000` ms hard abort controller.
  - Zero image or video requests (strictly text queries only).
  - Automatic credential redaction matching regex `AIza[0-9A-Za-z-_]{15,}`.

---

## 2. Gemini Model Quotas & Tier Constraints (Official Google AI Specifications)

Milo AI utilizes a multi-model fallback chain in [api/ai/gateway.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/gateway.js):
`gemini-3.8-flash` -> `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite`.

### 2.1 Free Tier vs Tier 1 Paid Quotas Comparison

| Model | Free Tier RPM | Free Tier TPM | Free Tier RPD | Tier 1 (Paid) RPM | Tier 1 (Paid) TPM | Tier 1 RPD | Input Price / 1M | Output Price / 1M |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **gemini-3.8-flash** | 15 RPM | 1,000,000 | 1,500 RPD | **2,000 RPM** | 4,000,000 | Unlimited | $0.10 | $0.40 |
| **gemini-3.6-flash** | 15 RPM | 1,000,000 | 1,500 RPD | **2,000 RPM** | 4,000,000 | Unlimited | $0.10 | $0.40 |
| **gemini-3.5-flash-lite** | 15 RPM | 1,000,000 | 1,500 RPD | **4,000 RPM** | 4,000,000 | Unlimited | $0.075 | $0.30 |
| **gemini-3.1-flash-lite** | 15 RPM | 1,000,000 | 1,500 RPD | **4,000 RPM** | 4,000,000 | Unlimited | $0.075 | $0.30 |

### 2.2 Why 200 Users Cannot Run on Free Tier
> [!CRITICAL]
> **Mathematical Reality:** On the Free Tier, the entire account is capped at **15 Requests Per Minute (RPM)**.
> - With 200 users, even if only 10% of users submit one question within the same minute, that generates 20 RPM.
> - At 20 RPM, the Free Tier immediately exhausts its quota on the 16th request, triggering upstream HTTP 429 errors.
> - **Conclusion:** Operating Milo for 200 users strictly requires a Google Cloud project with **Pay-as-you-go billing enabled (Tier 1)** to secure at least 1,000–2,000 RPM.

---

## 3. Gateway Resilience Controls

[api/ai/gateway.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/gateway.js) implements the following safeguards:
1. **Global Concurrency Backpressure:** Capped at `MAX_GLOBAL_CONCURRENT_AI = 75` concurrent in-flight requests per process/lambda instance. Requests waiting longer than 1,000ms return HTTP 429 with `Retry-After: 2` and `X-RateLimit-Reason: concurrency-limit`.
2. **Circuit Breaker:** Tracks consecutive upstream 5xx errors. If 5 consecutive failures occur within a rolling window, the circuit trips to `OPEN` for 15 seconds, returning immediate HTTP 503 (`CIRCUIT_BREAKER_OPEN`) without hammering the upstream provider. When the cooldown expires, a single probe request is admitted (`HALF_OPEN`).
3. **Execution Budget:** 24,000ms hard deadline before Vercel serverless 30s timeout kills the container.
4. **Credential Redaction:** Error logs and API responses strip `AIza...` keys automatically before emission.

---

## 4. Operator Verification Guide for Live Gemini Test

When the operator is ready to verify live upstream Gemini connectivity against a paid Google AI project, execute the following bounded smoke test:

```bash
# Execute safe 2-request live smoke test (Estimated cost: < $0.0001)
$ GEMINI_API_KEY="AIzaSyYourAuthorizedKeyHere" node test/real_gemini_smoke_test.js --run-live=true
```

Expected output upon successful live verification:
```
📋 Smoke Test Configuration:
• Concurrency Bound  : 1 worker(s)
• Max Request Ceiling: 2 request(s)
• Duration Bound     : 10000 ms
• Live Execution Flag: --run-live=true

🚀 Dispatching bounded live Gemini query...
✅ Query 1 Succeeded: Model=gemini-3.8-flash, Status=200, Latency=1240ms, Tokens=182
✅ Query 2 Succeeded: Model=gemini-3.8-flash, Status=200, Latency=980ms, Tokens=145
🎉 Live Gemini API integration verified successfully!
```
