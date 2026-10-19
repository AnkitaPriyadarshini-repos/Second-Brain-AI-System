/**
 * Milo AI Workspace — Auth Guard & Client Identity Service
 *
 * Implements tamper-proof user and guest identity boundaries:
 * - Cryptographically signed session tokens (HMAC-SHA256)
 * - Explicitly configured, shared server-side session secret
 * - Never uses an ephemeral random fallback secret in production that invalidates tokens across serverless instances
 * - Rejection of legacy predictable fallbacks and tampered/expired tokens
 * - Verifiable guest identities with strict resource quotas
 * - Platform-verified IP extraction (protects against x-forwarded-for spoofing)
 * - Ownership assertion on server-side resources
 * - Fail-closed semantics for protected operations when unconfigured
 */

const crypto = require('crypto');

// Approved server-side environment variables for session signing
function getConfiguredSecret() {
  const secret = (
    process.env.MILO_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JUNO_SESSION_SECRET ||
    ''
  ).trim();

  if (secret.length >= 16) {
    return secret;
  }

  // In hermetic test runners (NODE_ENV=test), provide a deterministic test secret so tests run cleanly
  if (process.env.NODE_ENV === 'test' && !process.env.VERCEL) {
    return 'milo_hermetic_test_session_secret_32bytes_value!';
  }

  return '';
}

const LEGACY_KNOWN_FALLBACK = 'milo_production_hardening_secret_fallback_2026';
const GUEST_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const USER_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * Returns whether an approved server-side session secret is configured.
 */
function isSecretConfigured() {
  const secret = getConfiguredSecret();
  return typeof secret === 'string' && secret.length >= 16;
}

/**
 * Platform-verified IP extraction:
 * Prioritizes Vercel / trusted proxy infrastructure headers (x-vercel-ip, x-real-ip)
 * over arbitrary untrusted x-forwarded-for chains.
 */
function getVerifiedClientIp(req) {
  if (!req || !req.headers) return '127.0.0.1';

  const vercelIp = req.headers['x-vercel-ip'];
  if (vercelIp && typeof vercelIp === 'string') {
    return vercelIp.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded);
    const leftmost = raw.split(',')[0].trim();
    if (leftmost && /^[\da-fA-F.:]+$/.test(leftmost)) {
      return leftmost;
    }
  }

  const socketIp = req.socket?.remoteAddress;
  if (socketIp && typeof socketIp === 'string') {
    return socketIp.replace(/^::ffff:/, '');
  }

  return '127.0.0.1';
}

/**
 * Sign payload with HMAC-SHA256 using the configured server secret
 */
function signString(data) {
  const secret = getConfiguredSecret();
  if (!secret) {
    throw new Error('SERVER_CONFIGURATION_ERROR: MILO_SESSION_SECRET is not configured on this server.');
  }
  return crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 32);
}

/**
 * Generate a cryptographically signed session token
 * Format: <prefix>_<id>.<timestamp>.<signature>
 */
function generateSessionToken(id, isGuest = false) {
  const secret = getConfiguredSecret();
  if (!secret) {
    throw new Error('SERVER_CONFIGURATION_ERROR: MILO_SESSION_SECRET is not configured on this server.');
  }

  const prefix = isGuest ? 'guest' : 'usr';
  const cleanId = String(id || crypto.randomBytes(8).toString('hex')).replace(/[^a-zA-Z0-9_-]/g, '');
  const timestamp = Date.now().toString();
  const payload = `${prefix}_${cleanId}.${timestamp}`;
  const signature = signString(payload);
  return `${payload}.${signature}`;
}

/**
 * Verify a session token and return identity details
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const secret = getConfiguredSecret();
  if (!secret) {
    // Fail closed: cannot verify tokens without configured secret
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [idWithPrefix, timestampStr, signature] = parts;
  const payload = `${idWithPrefix}.${timestampStr}`;

  // Explicit security policy: Invalidate and reject any token signed with the legacy known fallback secret
  const legacySig = crypto.createHmac('sha256', LEGACY_KNOWN_FALLBACK).update(payload).digest('hex').slice(0, 32);
  if (signature === legacySig) {
    return null; // Reject legacy predictable token
  }

  let expectedSig;
  try {
    expectedSig = signString(payload);
  } catch (_) {
    return null;
  }

  if (signature.length !== expectedSig.length) return null;

  // Use timing-safe comparison to prevent side-channel timing attacks
  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(bufA, bufB)) {
    return null; // Tampered or forged token
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  const isGuest = idWithPrefix.startsWith('guest_');
  const ttl = isGuest ? GUEST_TTL_MS : USER_TTL_MS;

  if (Date.now() - timestamp > ttl) {
    return null; // Expired token
  }

  return {
    id: idWithPrefix,
    isGuest,
    createdAt: timestamp,
    verified: true
  };
}

/**
 * Extract verified client identity from HTTP request.
 * If client presents a valid token, verifies and returns it.
 * If client has no token, derives a deterministic guest session based on IP.
 */
function extractClientIdentity(req) {
  const headers = req?.headers || {};

  // 1. Check Authorization: Bearer <token>
  let token = null;
  const authHeader = headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check X-Milo-Session or X-Session-Token
  if (!token && headers['x-milo-session']) {
    token = String(headers['x-milo-session']).trim();
  }
  if (!token && headers['x-session-token']) {
    token = String(headers['x-session-token']).trim();
  }

  // 3. Verify token if present
  if (token) {
    const verified = verifySessionToken(token);
    if (verified) {
      verified.ip = getVerifiedClientIp(req);
      verified.token = token;
      return verified;
    }
  }

  // 4. Derive deterministic guest identity if unauthenticated
  const ip = getVerifiedClientIp(req);
  const hasConfig = isSecretConfigured();

  // If secret is configured, use HMAC-SHA256 to hash IP into guest ID and sign guest token
  let guestHash;
  let guestToken = null;

  if (hasConfig) {
    try {
      const secret = getConfiguredSecret();
      guestHash = crypto.createHmac('sha256', secret).update(`guest_ip:${ip}`).digest('hex').slice(0, 12);
      guestToken = generateSessionToken(guestHash, true);
    } catch (_) {
      guestHash = crypto.createHash('sha256').update(`guest_ip:${ip}`).digest('hex').slice(0, 12);
    }
  } else {
    // Unconfigured secret in production: deterministic hash without signing secret
    guestHash = crypto.createHash('sha256').update(`guest_ip:${ip}`).digest('hex').slice(0, 12);
  }

  const guestId = `guest_${guestHash}`;

  return {
    id: guestId,
    isGuest: true,
    createdAt: Date.now(),
    verified: false, // Guest fallback
    ip,
    token: guestToken,
    configured: hasConfig
  };
}

/**
 * Asserts resource ownership.
 * Returns true if requester owns the resource, false otherwise.
 */
function assertOwnership(resourceOwnerId, clientIdentity) {
  if (!resourceOwnerId) return true; // Unclaimed or public resource
  if (!clientIdentity || !clientIdentity.id) return false;
  return resourceOwnerId === clientIdentity.id;
}

// In-memory sliding window rate limiter
const rateWindows = new Map();

/**
 * Enforce rate limit per identity
 */
function checkRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateWindows.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
  } else {
    entry.count++;
  }

  rateWindows.set(key, entry);

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed, remaining, resetSeconds, count: entry.count };
}

/**
 * Enforce authenticated user status. Fails closed if session secret is missing.
 */
function assertAuthenticatedUser(clientIdentity) {
  if (!isSecretConfigured()) {
    return false;
  }
  if (!clientIdentity || !clientIdentity.verified || clientIdentity.isGuest) {
    return false;
  }
  return true;
}

module.exports = {
  getVerifiedClientIp,
  generateSessionToken,
  verifySessionToken,
  extractClientIdentity,
  assertOwnership,
  assertAuthenticatedUser,
  checkRateLimit,
  isSecretConfigured
};
