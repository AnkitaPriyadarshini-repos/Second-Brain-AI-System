/**
 * Milo AI Workspace — Centralized Auth Serverless Endpoint
 * Handles /api/auth/:action routing (guest, me, login, register, oauth, otp, logout)
 * for Vercel serverless deployment within standard Hobby function limits.
 */

const crypto = require('crypto');
const AuthControllerClass = require('../controllers/AuthController');
const authGuard = require('./auth-guard');

const authController = new AuthControllerClass();

module.exports = function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  const urlPath = (req.url || '').split('?')[0];
  const segments = urlPath.split('/').filter(Boolean);
  let action = (req.query && req.query.action) ? String(req.query.action) : (segments.length > 2 ? segments[segments.length - 1] : '');
  if (!action && req.query && req.query.match) {
    action = Array.isArray(req.query.match) ? req.query.match[0] : String(req.query.match);
  }
  if (!action && req.body && req.body.action) {
    action = String(req.body.action);
  }
  action = action.toLowerCase().trim();

  // 1. Guest session (supports POST and GET for health probes)
  if (action === 'guest' || urlPath.endsWith('/guest')) {
    if (req.method !== 'POST' && req.method !== 'GET') {
      if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST, GET');
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
      const guestId = 'guest_' + crypto.randomBytes(8).toString('hex');
      let token = '';
      try {
        token = authGuard.generateSessionToken(guestId, true);
      } catch (_) {
        token = `guest_token_${guestId}_${Date.now()}`;
      }

      const user = {
        id: guestId,
        email: `${guestId}@guest.miloai.io`,
        name: 'Guest Researcher',
        role: 'Guest Demo',
        isGuest: true
      };

      try {
        authController.authService.db.saveSession(token, {
          userId: guestId,
          email: user.email,
          name: user.name,
          role: user.role,
          isGuest: true,
          createdAt: Date.now()
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        token,
        sessionId: token,
        user
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. Profile identity
  if (action === 'me' || urlPath.endsWith('/me')) {
    return authController.me(req, res);
  }

  // 3. User Login
  if (action === 'login' || urlPath.endsWith('/login')) {
    return authController.login(req, res);
  }

  // 4. User Registration
  if (action === 'register' || urlPath.endsWith('/register')) {
    return authController.register(req, res);
  }

  // 5. OAuth Login
  if (action === 'oauth' || urlPath.endsWith('/oauth')) {
    return authController.oauth(req, res);
  }

  // 6. One-Time Passcode
  if (action === 'otp' || urlPath.endsWith('/otp')) {
    return authController.sendOTP(req, res);
  }

  // 7. Logout
  if (action === 'logout' || urlPath.endsWith('/logout')) {
    return authController.logout(req, res);
  }

  return res.status(404).json({ error: `Auth route /api/auth/${action || 'unknown'} not found` });
};
