const AuthControllerClass = require('../../../controllers/AuthController');
const authController = new AuthControllerClass();

export default function handler(req, res) {
  const { action } = req.query;

  if (action === 'register' && req.method === 'POST') {
    return authController.register(req, res);
  } else if (action === 'login' && req.method === 'POST') {
    return authController.login(req, res);
  } else if (action === 'otp' && req.method === 'POST') {
    return authController.sendOTP(req, res);
  } else if (action === 'me' && req.method === 'GET') {
    return authController.me(req, res);
  } else if (action === 'logout' && req.method === 'POST') {
    return authController.logout(req, res);
  } else {
    return res.status(404).json({ error: `Auth route /api/auth/${action} not found` });
  }
}
