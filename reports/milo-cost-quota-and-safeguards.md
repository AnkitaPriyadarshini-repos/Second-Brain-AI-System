# Milo AI — 200-User Cost Model, Quotas & Operational Safeguards

**Document Reference:** `reports/milo-cost-quota-and-safeguards.md`  
**Target Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Audited Branch:** `scalability/milo-200-user-certification`  
**Git Commit SHA:** `200770f9ed1aa14240b4128c207f59dc46e48fe2` (`200770f`)  
**Timestamp:** 2026-10-28T18:35:00+05:30  

---

## 1. Google Gemini Pricing & Workload Model (200 Users)

Milo routes generative queries primarily through `gemini-3.8-flash` with fallback to `gemini-3.5-flash-lite`:
- **`gemini-3.8-flash`:** $0.10 / 1M input tokens | $0.40 / 1M output tokens
- **`gemini-3.5-flash-lite`:** $0.075 / 1M input tokens | $0.30 / 1M output tokens

### Token Budget Assumptions per Request:
- **Average Input Tokens:** 1,200 tokens (System persona prompt: ~300 tokens, Retrieved note snippets/RAG context: ~800 tokens, User prompt: ~100 tokens).
- **Average Output Tokens:** 400 tokens (Milo concise bullet-point synthesis).
- **Blended Cost per Query (`gemini-3.8-flash`):**
  $$\text{Input Cost} = 1,200 \times \frac{\$0.10}{1,000,000} = \$0.000120$$
  $$\text{Output Cost} = 400 \times \frac{\$0.40}{1,000,000} = \$0.000160$$
  $$\text{Cost per Query} = \$0.000280 \text{ ($0.28 per 1,000 queries)}$$

---

## 2. 200-User Usage Scenarios & Financial Projections

| Metric / Parameter | Low Usage Scenario (Light Notes) | Typical Usage Scenario (Active PKM) | High Usage Scenario (Power Users) |
| :--- | :---: | :---: | :---: |
| **Queries per User per Day** | 5 queries/user/day | 15 queries/user/day | 40 queries/user/day |
| **Total Daily Queries (200 Users)** | 1,000 queries/day | 3,000 queries/day | 8,000 queries/day |
| **Total Monthly Queries (30 Days)** | 30,000 queries/month | 90,000 queries/month | 240,000 queries/month |
| **Monthly Input Tokens (1.2k tokens/req)** | 36,000,000 tokens | 108,000,000 tokens | 288,000,000 tokens |
| **Monthly Output Tokens (400 tokens/req)** | 12,000,000 tokens | 36,000,000 tokens | 96,000,000 tokens |
| **Estimated Gemini Spend / Month** | **$8.40 / month** | **$25.20 / month** | **$67.20 / month** |
| **Estimated Daily Gemini Spend** | $0.28 / day | $0.84 / day | $2.24 / day |

> [!NOTE]
> All estimates represent projected usage models based on official Google Cloud pricing. Actual charges depend on prompt size, fallback model usage, and daily active user engagement.

---

## 3. Hosting & Infrastructure Services Cost Breakdown

| Infrastructure Component | Free Tier Capacity | Recommended Production Tier | Estimated Monthly Cost |
| :--- | :--- | :--- | :---: |
| **Vercel Serverless Hosting** | 100,000 edge/serverless requests/mo | Vercel Pro ($20/user/mo) or Hobby ($0) | $0.00 – $20.00 |
| **Google Cloud Gemini API** | 15 RPM (Insufficient for 200 users) | Pay-as-you-go Tier 1 (2,000 RPM) | $25.20 (Typical) |
| **Upstash Redis (Rate Limiter)** | 10,000 commands/day free | Pay-as-you-go ($0.20 / 100k commands) | $0.00 – $1.50 |
| **Browser Local-First Storage** | Client `localStorage` (Free) | Client-side (0 cloud cost) | $0.00 |
| **Total Estimated Monthly Budget** | — | — | **$25.20 – $46.70 / mo** |

---

## 4. Code-Level Safeguards & Overload Protections

### 4.1 Global Concurrency Backpressure
Implemented in [api/ai/gateway.js](file:///c:/Users/ankit/resume/Second-Brain-AI-System/api/ai/gateway.js):
- **Limit:** `MAX_GLOBAL_CONCURRENT_AI = 75` concurrent in-flight upstream calls.
- **Queue Bound:** In-flight queue polls for available slot with 1,000ms max timeout.
- **Backpressure Response:** Returns HTTP 429 with headers:
  ```http
  HTTP/1.1 429 Too Many Requests
  Retry-After: 2
  X-RateLimit-Reason: concurrency-limit
  Content-Type: application/json

  {"error": "AI Gateway is at peak capacity. Please retry shortly.", "code": "CONCURRENCY_LIMIT_EXCEEDED"}
  ```

### 4.2 Circuit Breaker & Half-Open Recovery
- **Trip Condition:** 5 consecutive upstream 5xx errors from Google AI.
- **Open State Duration:** 15 seconds.
- **Fail-Fast Response:** Immediate HTTP 503 (`CIRCUIT_BREAKER_OPEN`), shedding load from the failing provider.
- **Half-Open Probing:** When the 15-second cooldown expires, exactly one request is admitted as a probe. If it succeeds, the breaker resets to `CLOSED`. If it fails, the breaker trips for another 15 seconds.

### 4.3 Memory Leak Protections
- **Rate Window Pruning (`api/auth-guard.js`):** `pruneRateWindows()` purges expired IP/token windows older than 120 seconds every 60 seconds.
- **Gateway Stale Cache Purge (`api/ai/gateway.js`):** `cleanupCaches()` clears active in-flight tracking entries older than 30 seconds.
- **Distributed Limiter Degradation Cleanup (`services/DistributedRateLimiter.js`):** `_pruneBuckets()` removes stale local degraded buckets every 120 seconds.

---

## 5. Google Cloud Spend Alerting Plan

To prevent unexpected billing spikes:
1. **$25.00 Soft Budget Alert:** Trigger an automated email alert to SRE when monthly spend reaches $25.00 (expected normal operating threshold for 200 users).
2. **$50.00 Urgent Warning Alert:** Trigger immediate Slack/SMS alert to release manager when monthly spend reaches $50.00.
3. **$100.00 Hard Budget Cap:** Configure Google Cloud Quotas to clamp project quotas if spend reaches $100.00.
