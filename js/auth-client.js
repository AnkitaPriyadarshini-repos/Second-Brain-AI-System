/**
 * Milo AI Workspace — Client Authentication SDK (Multi-Tenant SaaS)
 *
 * Implements real session management, OAuth single sign-on, and isolated
 * guest demo modes with cryptographically signed tokens.
 */

(function (global) {
  'use strict';

  const TOKEN_KEY = 'milo_auth_token';
  const USER_KEY = 'milo_auth_user';

  class AuthClient {
    constructor() {
      this.currentUser = null;
      this.token = null;
      this.initialized = false;
      this._initPromise = null;
    }

    /**
     * Initializes client session. Verifies existing token or creates isolated guest session.
     */
    async init() {
      if (this.initialized && this.currentUser) return this.currentUser;
      if (this._initPromise) return this._initPromise;

      this._initPromise = (async () => {
        // 1. Try existing token
        let savedToken = null;
        try {
          savedToken = localStorage.getItem(TOKEN_KEY);
        } catch (_) {}

        if (savedToken) {
          try {
            const res = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${savedToken}`,
                'X-Milo-Session': savedToken
              }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.authenticated && data.user) {
                this.token = savedToken;
                this.currentUser = { ...data.user, token: savedToken, isGuest: Boolean(data.user.isGuest) };
                this._persistSession(this.currentUser, savedToken);
                this.updateUI();
                this.initialized = true;
                this._notify();
                return this.currentUser;
              }
            }
          } catch (e) {
            console.warn('[AuthClient] Session verification error:', e);
          }
        }

        // 2. No valid session: bootstrap isolated ephemeral guest session
        try {
          const guestRes = await fetch('/api/auth/guest', { method: 'POST' });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            if (guestData.success && guestData.token) {
              this.token = guestData.token;
              this.currentUser = { ...guestData.user, token: guestData.token, isGuest: true };
              this._persistSession(this.currentUser, guestData.token);
              this.updateUI();
              this.initialized = true;
              this._notify();
              return this.currentUser;
            }
          }
        } catch (err) {
          console.warn('[AuthClient] Guest bootstrap failed:', err);
        }

        // 3. Fallback deterministic local guest
        const fallbackId = 'guest_' + Math.random().toString(36).substring(2, 10);
        this.token = `guest_${fallbackId}.fallback`;
        this.currentUser = {
          id: fallbackId,
          name: 'Guest Researcher',
          email: `${fallbackId}@guest.miloai.io`,
          role: 'Guest Demo',
          isGuest: true,
          token: this.token
        };
        this.updateUI();
        this.initialized = true;
        this._notify();
        return this.currentUser;
      })();

      return this._initPromise;
    }

    _persistSession(user, token) {
      try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          localStorage.setItem('second_brain_user_name', user.name || 'User');
          localStorage.setItem('second_brain_user_email', user.email || '');
          localStorage.setItem('second_brain_user_id', user.id || '');
        }
        if (typeof global !== 'undefined' && global.Store) {
          global.Store.userId = user.id;
        }
      } catch (_) {}
    }

    _notify() {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('milo:auth:change', { detail: { user: this.currentUser } }));
      }
    }

    getAuthHeaders() {
      const headers = { 'X-Client-Version': 'milo-saas-v2' };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        headers['X-Milo-Session'] = this.token;
      }
      if (this.currentUser && this.currentUser.id) {
        headers['X-Milo-User-Id'] = this.currentUser.id;
      }
      return headers;
    }

    getCurrentUser() {
      return this.currentUser || {
        id: 'usr_guest',
        name: 'Guest Researcher',
        role: 'Guest Demo',
        isGuest: true
      };
    }

    async login(email, password) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      this.token = data.token;
      this.currentUser = { ...data.user, token: data.token, isGuest: false };
      this._persistSession(this.currentUser, this.token);
      this.updateUI();
      this._notify();
      return this.currentUser;
    }

    async register(name, email, password) {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }
      this.token = data.token;
      this.currentUser = { ...data.user, token: data.token, isGuest: false };
      this._persistSession(this.currentUser, this.token);
      this.updateUI();
      this._notify();
      return this.currentUser;
    }

    async oauth(provider, profile = {}) {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...profile })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `${provider} authentication failed`);
      }
      this.token = data.token;
      this.currentUser = { ...data.user, token: data.token, isGuest: false };
      this._persistSession(this.currentUser, this.token);
      this.updateUI();
      this._notify();
      return this.currentUser;
    }

    async logout() {
      try {
        if (this.token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` }
          });
        }
      } catch (_) {}

      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch (_) {}

      this.token = null;
      this.currentUser = null;
      this.initialized = false;
      this._initPromise = null;

      // Re-bootstrap isolated guest session
      await this.init();
      return true;
    }

    updateUI() {
      if (typeof document === 'undefined') return;
      const user = this.getCurrentUser();
      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
      const initial = displayName.charAt(0).toUpperCase() || 'U';
      const role = user.role || (user.isGuest ? 'Guest Demo' : 'Pro Researcher');

      // 1. Sidebar desktop user row
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.textContent = displayName;

      const avatarEl = document.querySelector('.onyx-user-avatar');
      if (avatarEl) avatarEl.textContent = initial;

      const badgeDot = document.querySelector('.onyx-user-badge-dot');
      if (badgeDot) {
        badgeDot.title = user.isGuest ? 'Guest Session (Isolated)' : 'Active (Verified)';
        badgeDot.style.background = user.isGuest ? '#38bdf8' : '#10b981';
      }

      // 2. Mobile drawer user info
      const mobileNameEl = document.querySelector('.user-name');
      if (mobileNameEl) mobileNameEl.textContent = displayName;

      const mobileRoleEl = document.querySelector('.user-role');
      if (mobileRoleEl) mobileRoleEl.textContent = role;

      const mobileAvatarEl = document.querySelector('.user-avatar-circle');
      if (mobileAvatarEl) mobileAvatarEl.textContent = initial;
    }
  }

  const authClient = new AuthClient();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = authClient;
  }
  global.AuthClient = authClient;

  // Auto-init on browser DOM ready
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => authClient.init());
    } else {
      setTimeout(() => authClient.init(), 10);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
