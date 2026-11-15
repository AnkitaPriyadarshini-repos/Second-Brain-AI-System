const AuthControllerClass = require('../../controllers/AuthController');
const authController = new AuthControllerClass();

module.exports = function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  if (req.method === 'GET') {
    return authController.me(req, res);
  }

  if (typeof res.setHeader === 'function') res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};
