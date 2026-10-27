/**
 * Second Brain AI System — Note Controller (Layered Architecture)
 * Handles HTTP requests, DTO extraction, status code formatting, and delegates to NoteService
 * with strict multi-user vault isolation and per-user cache invalidation.
 */

(function (global) {
  'use strict';

  class NoteController {
    constructor(noteService) {
      if (typeof require !== 'undefined' && !noteService) {
        const NoteServiceClass = require('../services/NoteService');
        this.noteService = new NoteServiceClass();
      } else {
        this.noteService = noteService;
      }
      this._userCache = new Map();
      this._cachedResponse = null;
    }

    extractIdentity(req) {
      if (!req) return null;
      try {
        if (typeof require !== 'undefined') {
          const headers = req.headers || {};
          const hasAuth = headers.authorization || headers['x-milo-session'] || headers['x-milo-client-id'];
          if (hasAuth) {
            const authGuard = require('../api/auth-guard');
            return authGuard.extractClientIdentity(req);
          }
        }
      } catch (_) {}
      const fallbackId = (req.user && req.user.id) || req.userId || (req.body && (req.body.userId || req.body.user_id));
      if (fallbackId) return { id: fallbackId, isGuest: false };
      return null;
    }

    clearCache(userId) {
      this._cachedResponse = null;
      if (userId && this._userCache) {
        for (const key of this._userCache.keys()) {
          if (key.startsWith(`${userId}:`)) {
            this._userCache.delete(key);
          }
        }
      } else if (this._userCache) {
        this._userCache.clear();
      }
    }

    getNotes(req, res) {
      try {
        const identity = this.extractIdentity(req);
        const userId = identity ? identity.id : null;
        const query = req && req.query ? req.query.q : null;
        const cacheKey = `${userId || 'all'}:${query || ''}`;

        if (!query && this._userCache.has(cacheKey)) {
          const cached = this._userCache.get(cacheKey);
          if (res && typeof res.json === 'function') {
            return res.status(200).json(cached);
          }
          return cached;
        }

        const notes = query ? this.noteService.searchNotes(query, userId) : this.noteService.getAllNotes(userId);
        const payload = { success: true, count: notes.length, data: notes };
        if (!query) {
          this._userCache.set(cacheKey, payload);
          this._cachedResponse = payload; // legacy single-cache compatibility
        }

        if (res && typeof res.json === 'function') {
          return res.status(200).json(payload);
        }
        return payload;
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(500).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    createNote(req, res) {
      try {
        const identity = this.extractIdentity(req);
        const userId = identity ? identity.id : null;
        const body = (req && req.body) ? req.body : req;
        const noteWithUser = userId ? { ...body, userId } : body;
        const createdNote = this.noteService.createNote(noteWithUser, userId);
        this.clearCache(userId); // Invalidate cached notes for this user
        if (res && typeof res.json === 'function') {
          return res.status(201).json({ success: true, message: 'Note created successfully', data: createdNote });
        }
        return { success: true, data: createdNote };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    togglePin(req, res) {
      try {
        const identity = this.extractIdentity(req);
        const userId = identity ? identity.id : null;
        const id = (req && req.params && req.params.id) ? req.params.id : (req && req.id ? req.id : null);
        const updated = this.noteService.togglePin(id, userId);
        if (!updated) {
          if (res && typeof res.status === 'function') {
            return res.status(404).json({ success: false, error: 'Note not found or unauthorized' });
          }
          return null;
        }
        this.clearCache(userId); // Invalidate cached notes for this user
        if (res && typeof res.json === 'function') {
          return res.status(200).json({ success: true, data: updated });
        }
        return { success: true, data: updated };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    deleteNote(req, res) {
      try {
        const identity = this.extractIdentity(req);
        const userId = identity ? identity.id : null;
        const id = (req && req.params && req.params.id) ? req.params.id : (req && req.id ? req.id : null);
        const result = this.noteService.deleteNote(id, userId);
        if (!result) {
          if (res && typeof res.status === 'function') {
            return res.status(404).json({ success: false, error: 'Note not found or unauthorized' });
          }
          return false;
        }
        this.clearCache(userId); // Invalidate cached notes for this user
        if (res && typeof res.json === 'function') {
          return res.status(200).json({ success: true, deleted: result });
        }
        return { success: true, deleted: result };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteController;
  } else {
    global.NoteController = NoteController;
  }
})(typeof window !== 'undefined' ? window : this);
