/**
 * Milo AI Workspace — Root Health & Readiness Check Endpoint
 *
 * Provides a minimal, secret-safe, and cache-inhibited health status check
 * for load balancers, monitoring probes, and container orchestrators.
 */

module.exports = function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  return res.status(200).json({
    ok: true,
    service: 'milo-ai-system',
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};
