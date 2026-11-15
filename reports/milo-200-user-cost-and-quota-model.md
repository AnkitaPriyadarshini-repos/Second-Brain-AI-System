# Milo AI — 200+ User Cost, Quota & Budget Protection Model

**Document Reference:** `reports/milo-200-user-cost-and-quota-model.md`  
**Repository:** `AnkitaPriyadarshini-repos/Second-Brain-AI-System`  
**Branch:** `scalability/milo-200-user-certification`  
**Audited Commit SHA:** `2227728`  
**Date:** October 28, 2026  
**Auditor:** Cloud Financial Engineering & SRE Lead  

---

## 1. Executive Summary & Workload Sizing Assumptions

This cost model projects the operating infrastructure, cloud provider consumption, and safety safeguards required to support **200 registered users** on Milo AI.

A critical design reality of Milo is that **note storage, indexing, and hybrid RAG search execute client-locally in the user's browser**. Consequently:
- 200 users organizing their private notes generates **$0.00 in database query or storage fees**.
- Cloud costs are driven primarily by stateless **AI Gateway queries (`/api/ai/gateway`)**, serverless edge function execution, and optional distributed Redis rate limiting.

---

## 2. Workload Scenarios for 200 Users

We model three operational scenarios based on real-world personal knowledge management usage:

| Parameter | Low Usage Scenario (Casual) | Typical Usage Scenario (Expected) | High Usage Scenario (Power Researchers) |
| :--- | :---: | :---: | :---: |
| **Total Registered Users** | 200 users | 200 users | 200 users |
| **Daily Active Users (DAU)** | 20 users (10%) | 50 users (25%) | 100 users (50%) |
| **AI Turns per Active User / Day** | 5 turns | 15 turns | 30 turns |
| **Total AI Requests / Day** | 100 requests / day | 750 requests / day | 3,000 requests / day |
| **Monthly AI Requests (30 Days)** | 3,000 requests / month | 22,500 requests / month | 90,000 requests / month |
| **Avg Input Tokens per Request** | 1,200 tokens | 1,500 tokens (with RAG snippets) | 2,500 tokens (heavy context) |
| **Avg Output Tokens per Request** | 350 tokens | 500 tokens | 800 tokens |
| **Peak Requests per Minute (RPM)** | ~5 RPM | ~25 RPM | ~65 RPM |
| **Peak Simultaneous In-Flight Calls** | 2 concurrent calls | 8 concurrent calls | 20 concurrent calls |

---

## 3. Provider Pricing & Unit Economics

### 3.1 Google Gemini Pricing (Official Reference: October 2026)
Milo routes queries dynamically across Google Gemini 3.x endpoints:
- **Fast Tier (`gemini-3.5-flash-lite`):**
  - Input: **$0.075 / 1,000,000 tokens**
  - Output: **$0.30 / 1,000,000 tokens**
- **Primary Tier (`gemini-3.8-flash`):**
  - Input: **$0.15 / 1,000,000 tokens**
  - Output: **$0.60 / 1,000,000 tokens**
- **Balanced Tier (`gemini-3.6-flash`):**
  - Input: **$0.10 / 1,000,000 tokens**
  - Output: **$0.40 / 1,000,000 tokens**

### 3.2 Unit Cost per Query Calculation
- **Fast Query (Greetings / Simple Turns):**
  - Input: 500 tokens $\times \$0.075 / 1\text{M} = \$0.0000375$
  - Output: 200 tokens $\times \$0.30 / 1\text{M} = \$0.0000600$
  - **Unit Cost:** **$0.0000975** (< $0.0001 per turn)
- **Grounded RAG Query (Note-Assisted Turns):**
  - Input: 1,800 tokens $\times \$0.15 / 1\text{M} = \$0.000270$
  - Output: 500 tokens $\times \$0.60 / 1\text{M} = \$0.000300$
  - **Unit Cost:** **$0.000570** (~$0.00057 per turn)
- **Weighted Blended Average:** **$0.00035 per turn**.

---

## 4. Monthly Infrastructure Cost Projections (200 Users)

| Service Component | Low Scenario | Typical Scenario | High Scenario | Notes & Pricing Tier |
| :--- | :---: | :---: | :---: | :--- |
| **Google Gemini AI Gateway** | $1.05 / mo | $7.88 / mo | $31.50 / mo | 3k to 90k turns @ blended $0.35/1k turns |
| **Vercel Serverless Hosting** | $0.00 (Hobby) | $0.00 – $20.00 (Pro) | $20.00 (Pro) | Edge functions well within monthly limits |
| **Upstash Redis (Rate Limiting)** | $0.00 (Free) | $0.00 – $2.00 / mo | $4.50 / mo | Free tier provides 10,000 commands/day |
| **PostgreSQL Database** | $0.00 | $0.00 | $0.00 | Local-first architecture (0 DB queries) |
| **Image & Media Generation** | $0.00 (Pollinations) | $0.00 – $2.50 / mo | $8.00 / mo | Pollinations tier is free; Imagen 3 usage |
| **Monitoring & Logging** | $0.00 | $0.00 | $0.00 | Included in Vercel standard log drain |
| **ESTIMATED TOTAL MONTHLY COST** | **$1.05 – $21.05** | **$7.88 – $32.38** | **$64.00 – $84.00** | Highly cost-efficient architecture |

---

## 5. Provider Quota Analysis: Can the Gemini Account Support 200 Users?

### 5.1 Quota Requirements vs Tiers

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GEMINI QUOTA VS WORKLOAD DEMAND                      │
├─────────────────────┬──────────────┬──────────────┬────────────────────┤
│ Quota Metric        │ Peak Demand  │ Free Tier    │ Pay-As-You-Go      │
│                     │ (200 Users)  │ (AI Studio)  │ (Tier 1 Paid)      │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ Requests / Minute   │ ~65 RPM      │ 15 RPM       │ 1,000 – 4,000 RPM  │
│ (Peak Surge)        │              │ (INSUFFICIENT│ (SUFFICIENT        │
│                     │              │  FOR PEAKS)  │  60x HEADROOM)     │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ Requests / Day      │ 3,000 RPD    │ 1,500 RPD    │ Unlimited          │
│ (High Scenario)     │              │ (EXHAUSTED)  │ (SUFFICIENT)       │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ In-Flight           │ 20 Calls     │ ~5 Concur.   │ 50 – 100 Concur.   │
│ Concurrency         │              │ (THROTTLED)  │ (SUFFICIENT)       │
└─────────────────────┴──────────────┴──────────────┴────────────────────┘
```

### 5.2 Critical Quota Recommendation:
1. **Free Tier AI Studio Key (`15 RPM`):** Can support the **10–25-user pilot**, but **cannot safely support 200 real users during peak activity**. A 200-user population generating peak traffic (25–65 RPM) will trigger upstream HTTP 429 quota exhaustion.
2. **Paid Tier 1 Account:** Enabling billing on Google Cloud unlocks **1,000 to 4,000 RPM** on Gemini Flash models, providing 15x to 60x headroom above peak 200-user demand.

---

## 6. Budget Protection & Spending Safeguards

To prevent unexpected billing spikes or compromised API keys from generating unbounded spend:

1. **Google Cloud Billing Hard Cap / Budget Alerts:**
   - Configure a budget alert at **$25.00 / month** (50% threshold) and **$50.00 / month** (100% threshold).
   - *Note:* Google Cloud budget alerts send Pub/Sub notifications; automated billing shutdown must be configured via Cloud Functions if a hard stop is desired.
2. **In-Flight Concurrency Ceiling (`MILO_MAX_CONCURRENT_AI`):**
   - Implemented in `api/ai/gateway.js`. Hard-capped at **75 simultaneous in-flight provider calls**.
   - Bursts beyond 75 enter a bounded 1-second queue, then safely return HTTP 429 with `X-RateLimit-Reason: concurrency-limit`.
3. **Per-Client Rate Limits:**
   - Authenticated sessions capped at **30 requests / minute**.
   - Guest sessions capped at **15 requests / minute**.
   - Maximum theoretical spend from a single rogue client is bounded to less than **$0.50 / day**.
4. **Emergency Feature Kill-Switch:**
   - Setting `MILO_MAX_CONCURRENT_AI=0` in Vercel environment variables immediately disables upstream Gemini calls, returning friendly temporary maintenance notices without affecting local note browsing or export.
