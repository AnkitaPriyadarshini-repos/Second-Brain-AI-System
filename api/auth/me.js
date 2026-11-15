import authGuard from '../auth-guard.js';

export default function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method !== 'GET') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const identity = authGuard.extractClientIdentity(req);
    return res.status(200).json({
      success: true,
      authenticated: Boolean(identity && identity.id),
      user: {
        id: identity.id,
        isGuest: identity.isGuest,
        role: identity.isGuest ? 'Guest Demo' : 'Pro Developer'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
