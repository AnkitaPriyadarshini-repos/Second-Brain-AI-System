/**
 * Second Brain AI System — Authentication Controller
 * Handles HTTP requests for User Registration, Login, Session Check, and Logout.
 */

const AuthService = require('../services/AuthService');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  register(req, res) {
    const { email, password, name } = req.body || {};
    const result = this.authService.register({ email, password, name });

    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(201).json(result);
  }

  login(req, res) {
    const { email, password, otpCode } = req.body || {};
    const result = this.authService.login({ email, password, otpCode });

    if (result.error) {
      return res.status(401).json({ success: false, error: result.error });
    }
    return res.status(200).json(result);
  }

  sendOTP(req, res) {
    const { email } = req.body || {};
    const result = this.authService.sendOTP(email);

    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.status(200).json(result);
  }

  me(req, res) {
    const authHeader = req.headers.authorization || '';
    const session = this.authService.verifySession(authHeader);

    if (!session) {
      return res.status(200).json({
        authenticated: false,
        user: {
          id: 'usr_guest',
          email: 'guest@secondbrain.local',
          name: 'Guest Researcher',
          role: 'Local Offline User'
        }
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: session
    });
  }

  logout(req, res) {
    const authHeader = req.headers.authorization || '';
    this.authService.logout(authHeader);
    return res.status(200).json({ success: true, message: 'Logged out cleanly.' });
  }
}

module.exports = AuthController;
