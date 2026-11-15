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
    const { provider, email, name, avatar } = req.body || {};
    if (!provider) {
      return res.status(400).json({ success: false, error: 'OAuth provider (Google, GitHub) is required.' });
    }

    const userId = 'usr_' + (provider || 'oauth') + '_' + crypto.randomBytes(6).toString('hex');
    const userEmail = email || `${userId}@${provider}.auth.miloai.io`;
    const token = authGuard.generateSessionToken(userId, false);

    return res.status(200).json({
      success: true,
      token,
      sessionId: token,
      user: {
        id: userId,
        email: userEmail,
        name: name || `${provider.toUpperCase()} Researcher`,
        avatar: avatar || '',
        role: 'Pro Developer',
        isGuest: false
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
