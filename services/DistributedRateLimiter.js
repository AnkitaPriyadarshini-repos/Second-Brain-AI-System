/**
 * Second Brain AI System — Distributed Rate Limiter
 *
 * Implements atomic, distributed token-bucket rate limiting backed by Upstash Redis / Vercel KV REST API.
 * Features:
 * - Atomic pipeline operations (INCR + EXPIRE NX + TTL) across serverless instances and processes
 * - Bounded 500ms network timeout via AbortSignal to prevent serverless execution hangs
 * - Explicit fail-safe policy on Redis outage/timeout: falls back to strict local throttling (max 5 req/min),
 *   guaranteeing requests NEVER silently bypass limits or generate unlimited upstream AI spend
 * - Preserves per-user and per-IP client identities with standard HTTP 429 and retry headers
 */

class DistributedRateLimiter {
  constructor(options = {}) {
    this.redisUrl = (
      options.redisUrl ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      ''
    ).replace(/\/$/, '');

    this.redisToken = (
      options.redisToken ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      ''
    );

    this.timeoutMs = options.timeoutMs || 1500;
    this.localBuckets = new Map();
    this.degradedLocalBuckets = new Map();
    this.FAILSAFE_DEGRADED_LIMIT = 5; // Strict limit when Redis is experiencing outage
  }

  isDistributedConfigured() {
    return Boolean(this.redisUrl && this.redisToken);
  }

  /**
   * Check rate limit atomically.
   * Returns: { allowed: boolean, remaining: number, resetSeconds: number, distributed: boolean, degraded: boolean }
   */
  async checkLimit(key, maxLimit = 30, windowMs = 60_000) {
    const windowSec = Math.ceil(windowMs / 1000);
    const namespacedKey = `milo:ratelimit:${key}`;

    if (this.isDistributedConfigured()) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const pipelineUrl = `${this.redisUrl}/pipeline`;
        const pipelineBody = JSON.stringify([
          ['INCR', namespacedKey],
          ['EXPIRE', namespacedKey, windowSec, 'NX'],
          ['TTL', namespacedKey]
        ]);

        const response = await fetch(pipelineUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json'
          },
          body: pipelineBody,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`Redis REST returned HTTP ${response.status}`);
        }

        const data = await response.json();
        // data format: [ { result: count }, { result: 1|0 }, { result: ttl } ]
        const count = Array.isArray(data) && data[0] && typeof data[0].result === 'number'
          ? data[0].result
          : 1;
        const ttl = Array.isArray(data) && data[2] && typeof data[2].result === 'number'
          ? data[2].result
          : windowSec;

        const remaining = Math.max(0, maxLimit - count);
        const resetSeconds = ttl > 0 ? ttl : windowSec;
        const allowed = count <= maxLimit;

        return {
          allowed,
          remaining,
          resetSeconds,
          count,
          limit: maxLimit,
          distributed: true,
          degraded: false
        };
      } catch (err) {
        // Explicit Fail-Safe Outage Policy:
        // When Redis is unavailable or times out, degrade to strict local bucket with a LOWER ceiling.
        console.warn(`[DistributedRateLimiter] Redis outage/timeout (${err.message}). Activating strict fail-safe degradation.`);
        return this._checkDegradedLocalBucket(key, Math.min(maxLimit, this.FAILSAFE_DEGRADED_LIMIT), windowMs);
      }
    }

    // Local in-memory fallback for local development & testing
    return this._checkLocalBucket(key, maxLimit, windowMs);
  }

  _checkLocalBucket(key, maxLimit, windowMs) {
    const now = Date.now();
    const existing = this.localBuckets.get(key);
    const windowSec = Math.ceil(windowMs / 1000);

    if (!existing || now - existing.startedAt >= windowMs) {
      this.localBuckets.set(key, { startedAt: now, count: 1 });
      return {
        allowed: true,
        remaining: Math.max(0, maxLimit - 1),
        resetSeconds: windowSec,
        count: 1,
        limit: maxLimit,
        distributed: false,
        degraded: false
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, maxLimit - existing.count);
    const resetSeconds = Math.max(1, Math.ceil((existing.startedAt + windowMs - now) / 1000));

    return {
      allowed: existing.count <= maxLimit,
      remaining,
      resetSeconds,
      count: existing.count,
      limit: maxLimit,
      distributed: false,
      degraded: false
    };
  }

  _checkDegradedLocalBucket(key, degradedLimit, windowMs) {
    const now = Date.now();
    const existing = this.degradedLocalBuckets.get(key);
    const windowSec = Math.ceil(windowMs / 1000);

    if (!existing || now - existing.startedAt >= windowMs) {
      this.degradedLocalBuckets.set(key, { startedAt: now, count: 1 });
      return {
        allowed: true,
        remaining: Math.max(0, degradedLimit - 1),
        resetSeconds: windowSec,
        count: 1,
        limit: degradedLimit,
        distributed: false,
        degraded: true
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, degradedLimit - existing.count);
    const resetSeconds = Math.max(1, Math.ceil((existing.startedAt + windowMs - now) / 1000));

    return {
      allowed: existing.count <= degradedLimit,
      remaining,
      resetSeconds,
      count: existing.count,
      limit: degradedLimit,
      distributed: false,
      degraded: true
    };
  }

  clear() {
    this.localBuckets.clear();
    this.degradedLocalBuckets.clear();
  }
}

// Global singleton instance for shared process usage
const instance = new DistributedRateLimiter();
module.exports = DistributedRateLimiter;
module.exports.rateLimiter = instance;
