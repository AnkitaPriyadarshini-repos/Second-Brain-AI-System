# Milo AI — Live Gemini Smoke Verification Results

**Document Reference:** `reports/milo-live-gemini-smoke-results.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `audit/milo-100-user-certification`  
**Audited Commit SHA:** `1345b3084c19e45a354536fa114f5696db2daad7` (`1345b30`)  
**Audit Timestamp:** 2026-10-28T01:42:00+05:30  
**Gateway Live Status:** **BLOCKED (AWAITING OPERATOR AUTHORIZATION & API KEY CONFIGURATION)**  
**Gateway Architecture & Resilience Status:** **PASS (VERIFIED VIA AUTOMATED REGRESSION HARNESS)**

---

## 1. Safety Rules & Operational Context

In strict compliance with the Master Prompt safety rules:
1. **Zero Unauthorized External Spend:** "Do not make paid Gemini calls without explicit operator authorization."
2. **Safe Default:** Live calls are blocked by default unless the explicit flag `--run-live=true` is provided alongside a valid API key.
3. **No Key Extraction or Exposure:** API keys and session secrets must never be printed, logged, or checked into the repository.
4. **Accurate Gate Reporting:** "If live testing is not authorized or the key is unavailable, record the result as BLOCKED—not PASS."

Because `GEMINI_API_KEY` is not provisioned in the local environment and explicit operator authorization for paid API traffic has not been received, live upstream calls were **safely skipped and recorded as BLOCKED**.

---

## 2. Bounded Live-Test Harness Safety Inspection

The test script `test/real_gemini_smoke_test.js` was inspected to ensure it meets all safety requirements before any live run:

| Parameter | Configured Value | Master Prompt Requirement | Compliance |
| :--- | :---: | :---: | :---: |
| **Worker Concurrency** | `1` | Strictly bounded (no high-concurrency) | **COMPLIANT** |
| **Maximum Sequential Requests** | `2` | No more than two sequential requests | **COMPLIANT** |
| **Request Timeout** | `10,000 ms` | Strict timeout (< 15s) | **COMPLIANT** |
| **Media Generation** | Disabled | Text-only (no images or videos) | **COMPLIANT** |
| **Synthetic Test Prompt** | `"Respond with 'PONG'"` | Synthetic non-sensitive query | **COMPLIANT** |
| **Credential Redaction** | Active regex | Mask all keys in error messages and logs | **COMPLIANT** |

---

## 3. Simulated Gateway Resilience & Fallback Hierarchy

While live cloud calls remain BLOCKED pending operator setup, the internal AI Gateway (`api/ai/gateway.js`) was comprehensively verified using the automated regression harness (`test/run_production_hardening_regression_tests.js`, Suite 13):

### 3.1 Model Fallback Order
If the primary Google Gemini model encounters a 429 (quota exhaustion), 503 (overloaded), or timeout, the gateway cascades sequentially through a designated fallback chain:
1. **Primary Model:** `gemini-3.8-flash`
2. **First Fallback:** `gemini-3.6-flash`
3. **Second Fallback:** `gemini-3.5-flash-lite`
4. **Third Fallback:** `gemini-3.1-flash-lite`

### 3.2 Execution Budget & Timeout Guarantees
- The overall gateway execution budget is capped at **24,000 ms**.
- This ensures that if upstream models are slow or hanging, the gateway returns a controlled HTTP 504 / 429 before Vercel's hard 30-second serverless execution ceiling is reached.

### 3.3 Upstream Error Masking & Secret Redaction
When simulating an upstream HTTP 429 Resource Exhaustion error:
- **Observed Log Output:**
  ```
  [milo/gateway] juno_mvr4a95c_l4uxays 429 Resource has been exhausted (e.g. check quota). Key [REDACTED] failed.
  ```
- **Observed HTTP Response:**
  ```json
  {
    "error": "Gemini API quota exhausted or rate limit reached.",
    "code": "UPSTREAM_RATE_LIMITED",
    "status": 429
  }
  ```
- **Verification:** The API key is completely sanitized from both internal logs and client-facing responses.

---

## 4. Operator Runbook for Executing the Live Smoke Test

Once the operator has configured `GEMINI_API_KEY` in Vercel or locally, the bounded smoke test can be executed using the following safe command:

### 4.1 Execution Command
```bash
GEMINI_API_KEY="your-google-gemini-api-key" node test/real_gemini_smoke_test.js --run-live=true
```

### 4.2 Expected Verification Output
When run against live Google AI servers with a valid key:
```
====================================================
🔮 REAL GEMINI API SMOKE TEST (SAFE & BOUNDED)
====================================================

📋 Smoke Test Configuration:
• Concurrency Bound  : 1 worker(s)
• Max Request Ceiling: 2 request(s)
• Duration Bound     : 10000 ms
• Live Execution Flag: true
• Detected API Key   : Present (Length: 39)

Sending live test request 1 of 2 to gemini-3.8-flash...
  ✅ [HTTP 200] Model: gemini-3.8-flash | Latency: 482ms | Tokens: 6 | Output: "PONG"

Sending live test request 2 of 2 to gemini-3.8-flash...
  ✅ [HTTP 200] Model: gemini-3.8-flash | Latency: 310ms | Tokens: 6 | Output: "PONG"

====================================================
🎉 LIVE GEMINI GATEWAY SMOKE TEST PASSED!
====================================================
```

---

## 5. Summary Table

| Evaluation Item | Status | Sanitized Evidence | Operator Action Required |
| :--- | :---: | :--- | :--- |
| **Live Smoke Execution** | **BLOCKED** | Spend controls prevented unauthenticated calls | Provide valid key & `--run-live=true` |
| **Harness Safety Bounds** | **PASS** | Capped at 2 requests, 1 worker, 10s timeout | None |
| **Model Fallback Chain** | **PASS** | Verified across 4 models in Suite 13 | None |
| **Upstream 429 / 503 Handling** | **PASS** | Controlled error payload without crash | None |
| **Secret Redaction** | **PASS** | All keys redacted (`Key [REDACTED] failed`) | None |
| **Browser Key Isolation** | **PASS** | Key never returned to client | None |
