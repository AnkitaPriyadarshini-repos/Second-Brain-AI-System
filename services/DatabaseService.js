/**
 * Second Brain AI System — Database Service (Durable Storage Layer)
 * Provides persistent storage for users, sessions, notes, chat messages, goals, and share links.
 * When DATABASE_URL is configured, transparently routes persistent storage through PostgreSQL.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const PostgresStoreService = require('./PostgresStoreService');

class DatabaseService {
  constructor(dbPath) {
    this.primaryDbPath = dbPath || path.join(__dirname, '../data/second_brain_db.json');
    this.fallbackDbPath = path.join(os.tmpdir(), 'second_brain_db.json');
    this.dbPath = this.primaryDbPath;
    this.data = {
      users: {},
      sessions: {},
      notes: [],
      chat_messages: {},
      goals: [],
      share_links: {}
    };

    // If DATABASE_URL is configured, initialize PostgresStoreService
    this.postgresStore = null;
    if (process.env.DATABASE_URL) {
      this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
    }

    this.init();
  }

  init() {
    try {
      let targetPath = this.primaryDbPath;
      if (!fs.existsSync(targetPath) && fs.existsSync(this.fallbackDbPath)) {
        targetPath = this.fallbackDbPath;
        this.dbPath = this.fallbackDbPath;
      }

      if (fs.existsSync(targetPath)) {
        const fileContent = fs.readFileSync(targetPath, 'utf8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          this.data = {
            users: parsed.users || {},
            sessions: parsed.sessions || {},
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            chat_messages: parsed.chat_messages || {},
            goals: Array.isArray(parsed.goals) ? parsed.goals : [],
            share_links: parsed.share_links || {}
          };
        }
      } else {
        this.saveSync();
      }
    } catch (err) {
      console.warn('[DatabaseService] Note: filesystem read-only or initializing in-memory fallback:', err.message);
    }
  }

  saveSync() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      // If primary path fails (e.g. EROFS on serverless read-only root), fall back to os.tmpdir
      try {
        this.dbPath = this.fallbackDbPath;
        fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (fallbackErr) {
        // Memory cache continues to serve data safely without crashing the process
        console.warn('[DatabaseService] Filesystem write restricted; memory state preserved:', fallbackErr.message);
      }
    }
  }

  // ------------------------------------------------------------------
  // Note Storage Operations with Strict User Isolation & PostgreSQL Routing
  // ------------------------------------------------------------------

  async saveNote(note, userId) {
    if (process.env.DATABASE_URL) {
      if (!this.postgresStore) {
        this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
      }
      return this.postgresStore.saveNote(note, userId);
    }

    if (!note || !note.content) {
      throw new Error('Note content cannot be empty');
    }
    const cleanUserId = String(userId || note.userId || note.user_id || 'usr_default').trim();
    const id = note.id || `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const existingIdx = this.data.notes.findIndex(n => n.id === id);
    if (existingIdx >= 0) {
      const existing = this.data.notes[existingIdx];
      const owner = existing.userId || existing.user_id;
      if (owner && owner !== cleanUserId) {
        throw new Error('UNAUTHORIZED_MODIFICATION: Cannot update note belonging to another user.');
      }
      const updated = {
        ...existing,
        ...note,
        id,
        userId: cleanUserId,
        user_id: cleanUserId,
        updatedAt: Date.now()
      };
      this.data.notes[existingIdx] = updated;
      this.saveSync();
      return updated;
    }

    const newNote = {
      ...note,
      id,
      userId: cleanUserId,
      user_id: cleanUserId,
      pinned: Boolean(note.pinned),
      createdAt: note.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    this.data.notes.unshift(newNote);
    this.saveSync();
    return newNote;
  }

  async getNotes(userId, queryText = null) {
    if (process.env.DATABASE_URL) {
      if (!this.postgresStore) {
        this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
      }
      return this.postgresStore.getNotes(userId, queryText);
    }

    const cleanUserId = String(userId || 'usr_default').trim();
    let notes = this.data.notes.filter(n => (n.userId === cleanUserId || n.user_id === cleanUserId));

    if (queryText && typeof queryText === 'string' && queryText.trim()) {
      const q = queryText.toLowerCase().trim();
      notes = notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        (Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    return notes;
  }

  async getNoteById(id, userId) {
    if (process.env.DATABASE_URL) {
      if (!this.postgresStore) {
        this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
      }
      return this.postgresStore.getNoteById(id, userId);
    }

    const cleanUserId = String(userId || 'usr_default').trim();
    const note = this.data.notes.find(n => n.id === id && (n.userId === cleanUserId || n.user_id === cleanUserId));
    return note || null;
  }

  async deleteNote(id, userId) {
    if (process.env.DATABASE_URL) {
      if (!this.postgresStore) {
        this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
      }
      return this.postgresStore.deleteNote(id, userId);
    }

    const cleanUserId = String(userId || 'usr_default').trim();
    const existingIdx = this.data.notes.findIndex(n => n.id === id);
    if (existingIdx < 0) return false;

    const existing = this.data.notes[existingIdx];
    const owner = existing.userId || existing.user_id;
    if (owner && owner !== cleanUserId) {
      return false; // Cannot delete another user's note
    }

    this.data.notes.splice(existingIdx, 1);
    this.saveSync();
    return true;
  }

  async togglePin(id, userId) {
    if (process.env.DATABASE_URL) {
      if (!this.postgresStore) {
        this.postgresStore = new PostgresStoreService({ connectionString: process.env.DATABASE_URL });
      }
      return this.postgresStore.togglePin(id, userId);
    }

    const cleanUserId = String(userId || 'usr_default').trim();
    const note = this.data.notes.find(n => n.id === id && (n.userId === cleanUserId || n.user_id === cleanUserId));
    if (!note) return null;

    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    this.saveSync();
    return note;
  }

  // ------------------------------------------------------------------
  // User Operations
  // ------------------------------------------------------------------
  getUser(email) {
    return this.data.users[email.toLowerCase()] || null;
  }

  getUserById(id) {
    return Object.values(this.data.users).find(u => u.id === id) || null;
  }

  deleteUser(email) {
    if (email && this.data.users[email.toLowerCase()]) {
      delete this.data.users[email.toLowerCase()];
      this.saveSync();
    }
  }

  saveUser(userObj) {
    if (!userObj || !userObj.email) return null;
    const email = userObj.email.toLowerCase();
    this.data.users[email] = userObj;
    this.saveSync();
    return userObj;
  }

  // ------------------------------------------------------------------
  // Session Operations
  // ------------------------------------------------------------------
  getSession(token) {
    if (!token) return null;
    return this.data.sessions[token] || null;
  }

  saveSession(token, sessionData) {
    if (!token || !sessionData) return null;
    this.data.sessions[token] = sessionData;
    this.saveSync();
    return sessionData;
  }

  deleteSession(token) {
    if (token && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.saveSync();
    }
  }

  // ------------------------------------------------------------------
  // Chat Message Operations
  // ------------------------------------------------------------------
  getChatHistory(room = 'general') {
    return this.data.chat_messages[room] || [];
  }

  saveChatMessage(messageObj) {
    if (!messageObj) return null;
    const room = messageObj.room || 'general';
    if (!this.data.chat_messages[room]) {
      this.data.chat_messages[room] = [];
    }
    this.data.chat_messages[room].push(messageObj);
    // Keep max 500 messages per room
    if (this.data.chat_messages[room].length > 500) {
      this.data.chat_messages[room] = this.data.chat_messages[room].slice(-500);
    }
    this.saveSync();
    return messageObj;
  }

  clearChatHistory(room = 'general') {
    this.data.chat_messages[room] = [];
    this.saveSync();
    return true;
  }
}

// Singleton instance export
const instance = new DatabaseService();
module.exports = DatabaseService;
module.exports.dbInstance = instance;
