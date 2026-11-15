import authGuard from '../auth-guard.js';
import crypto from 'crypto';

export default function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method !== 'POST') {
    if (typeof res.setHeader === 'function') res.setHeader('Allow', 'POST');
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

    return res.status(200).json({
      success: true,
      token,
      sessionId: token,
      user: {
        id: guestId,
        email: `${guestId}@guest.miloai.io`,
        name: 'Guest Researcher',
        role: 'Guest Demo',
        isGuest: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
