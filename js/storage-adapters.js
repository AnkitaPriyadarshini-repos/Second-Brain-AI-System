/**
 * Second Brain AI System — Concrete Storage Adapters (DIP)
 * Implements concrete repository adapters for LocalStorage, Memory, and IndexedDB.
 */

(function (global) {
  'use strict';

  let INoteRepository, IGoalRepository, IChatThreadRepository, IMessageRepository;
  if (typeof require !== 'undefined') {
    const interfaces = require('./data-repository-interface');
    INoteRepository = interfaces.INoteRepository;
    IGoalRepository = interfaces.IGoalRepository;
    IChatThreadRepository = interfaces.IChatThreadRepository;
    IMessageRepository = interfaces.IMessageRepository;
  } else {
    INoteRepository = global.RepositoryInterfaces.INoteRepository;
    IGoalRepository = global.RepositoryInterfaces.IGoalRepository;
    IChatThreadRepository = global.RepositoryInterfaces.IChatThreadRepository;
    IMessageRepository = global.RepositoryInterfaces.IMessageRepository;
  }

  // Safe localStorage helper with persistent memory singleton for Node.js runtime
  const nodeStorage = {
    _data: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const getStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof global !== 'undefined' && global.window && global.window.localStorage) return global.window.localStorage;
    return nodeStorage;
  };

  /**
   * LocalStorage Repository Adapter for Notes
   */
  class LocalStorageNoteRepository extends INoteRepository {
    constructor(storageKey = 'second_brain_notes_v2') {
      super();
      this.storageKey = storageKey;
    }

    getAll(userId) {
      let notes = [];
      try {
        const raw = getStorage().getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) notes = parsed;
        }
      } catch (e) {}
      if (notes.length === 0 && typeof Store !== 'undefined' && Array.isArray(Store.notes) && Store.notes.length > 0) {
        notes = Store.notes;
      }
      if (userId) {
        return notes.filter(n => n.userId === userId || n.user_id === userId);
      }
      return notes;
    }

    getById(id, userId) {
      const note = this.getAll().find(n => n.id === id);
      if (!note) return null;
      if (userId && (note.userId || note.user_id) && note.userId !== userId && note.user_id !== userId) {
        return null;
      }
      return note;
    }

    save(note, userId) {
      const cleanUserId = userId || note.userId || note.user_id || 'usr_default';
      const notes = this.getAll();
      const existingIdx = notes.findIndex(n => n.id === note.id);
      if (existingIdx >= 0) {
        const existing = notes[existingIdx];
        if (userId && (existing.userId || existing.user_id) && existing.userId !== cleanUserId && existing.user_id !== cleanUserId) {
          throw new Error('UNAUTHORIZED_MODIFICATION: Cannot update note belonging to another user.');
        }
        notes[existingIdx] = { ...notes[existingIdx], ...note, userId: cleanUserId, user_id: cleanUserId, updatedAt: Date.now() };
      } else {
        notes.unshift({ ...note, userId: cleanUserId, user_id: cleanUserId, createdAt: note.createdAt || Date.now(), updatedAt: Date.now() });
      }
      getStorage().setItem(this.storageKey, JSON.stringify(notes));
      return note;
    }

    delete(id, userId) {
      const notes = this.getAll();
      const existing = notes.find(n => n.id === id);
      if (!existing) return false;
      if (userId && (existing.userId || existing.user_id) && existing.userId !== userId && existing.user_id !== userId) {
        return false; // Cannot delete another user's note
      }
      const filtered = notes.filter(n => n.id !== id);
      getStorage().setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    }

    togglePin(id, userId) {
      const notes = this.getAll();
      const note = notes.find(n => n.id === id);
      if (note) {
        if (userId && (note.userId || note.user_id) && note.userId !== userId && note.user_id !== userId) {
          return null; // Cannot toggle pin on another user's note
        }
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        getStorage().setItem(this.storageKey, JSON.stringify(notes));
        return note;
      }
      return null;
    }

    search(query, userId) {
      const baseNotes = this.getAll(userId);
      if (!query) return baseNotes;
      const q = query.toLowerCase();
      return baseNotes.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    queryByTags(tags) {
      if (!Array.isArray(tags) || tags.length === 0) return this.getAll();
      const target = tags.map(t => t.toLowerCase());
      return this.getAll().filter(n => 
        n.tags && n.tags.some(t => target.includes(t.toLowerCase()))
      );
    }

    migrateSchema(targetVersion, transformFn) {
      const notes = this.getAll();
      const migrated = notes.map(n => transformFn(n, targetVersion));
      getStorage().setItem(this.storageKey, JSON.stringify(migrated));
      return migrated;
    }
  }

  /**
   * In-Memory Repository Adapter for High Performance & Tests
   */
  class InMemoryNoteRepository extends INoteRepository {
    constructor(initialNotes = []) {
      super();
      this.notesMap = new Map();
      initialNotes.forEach(n => this.notesMap.set(n.id, { ...n }));
    }

    getAll(userId) {
      const all = Array.from(this.notesMap.values());
      if (userId) {
        return all.filter(n => n.userId === userId || n.user_id === userId);
      }
      return all;
    }

    getById(id, userId) {
      const note = this.notesMap.get(id);
      if (!note) return null;
      if (userId && (note.userId || note.user_id) && note.userId !== userId && note.user_id !== userId) {
        return null;
      }
      return note;
    }

    save(note, userId) {
      const cleanUserId = userId || note.userId || note.user_id || 'usr_default';
      const existing = this.notesMap.get(note.id);
      if (existing && userId && (existing.userId || existing.user_id) && existing.userId !== cleanUserId && existing.user_id !== cleanUserId) {
        throw new Error('UNAUTHORIZED_MODIFICATION: Cannot update note belonging to another user.');
      }
      const updated = { ...note, userId: cleanUserId, user_id: cleanUserId };
      this.notesMap.set(note.id, updated);
      return updated;
    }

    delete(id, userId) {
      const existing = this.notesMap.get(id);
      if (!existing) return false;
      if (userId && (existing.userId || existing.user_id) && existing.userId !== userId && existing.user_id !== userId) {
        return false; // Cannot delete another user's note
      }
      return this.notesMap.delete(id);
    }

    togglePin(id, userId) {
      const n = this.notesMap.get(id);
      if (n) {
        if (userId && (n.userId || n.user_id) && n.userId !== userId && n.user_id !== userId) {
          return null; // Cannot toggle pin on another user's note
        }
        n.pinned = !n.pinned;
        this.notesMap.set(id, n);
        return n;
      }
      return null;
    }

    search(query, userId) {
      const baseNotes = this.getAll(userId);
      if (!query) return baseNotes;
      const q = query.toLowerCase();
      return baseNotes.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    queryByTags(tags, userId) {
      const target = tags.map(t => t.toLowerCase());
      return this.getAll(userId).filter(n => n.tags && n.tags.some(t => target.includes(t.toLowerCase())));
    }

    migrateSchema(targetVersion, transformFn) {
      const migrated = this.getAll().map(n => transformFn(n, targetVersion));
      this.notesMap.clear();
      migrated.forEach(n => this.notesMap.set(n.id, n));
      return migrated;
    }
  }

  /**
   * PostgreSQL Repository Adapter for Enterprise Multi-Instance Production
   */
  class PostgresNoteRepository extends INoteRepository {
    constructor(postgresStore) {
      super();
      if (postgresStore) {
        this.store = postgresStore;
      } else if (typeof require !== 'undefined') {
        const PostgresStoreServiceClass = require('../services/PostgresStoreService');
        this.store = new PostgresStoreServiceClass();
      }
    }

    async getAll(userId) {
      return this.store.getNotes(userId);
    }

    async getById(id, userId) {
      return this.store.getNoteById(id, userId);
    }

    async save(note, userId) {
      return this.store.saveNote(note, userId);
    }

    async delete(id, userId) {
      return this.store.deleteNote(id, userId);
    }

    async togglePin(id, userId) {
      return this.store.togglePin(id, userId);
    }

    async search(query, userId) {
      return this.store.getNotes(userId, query);
    }

    async queryByTags(tags, userId) {
      const all = await this.getAll(userId);
      if (!Array.isArray(tags) || tags.length === 0) return all;
      const target = tags.map(t => t.toLowerCase());
      return all.filter(n => n.tags && n.tags.some(t => target.includes(t.toLowerCase())));
    }

    migrateSchema() {
      return this.store.initSchema();
    }
  }

  /**
   * LocalStorage Repository Adapter for Learning Goals
   */
  class LocalStorageGoalRepository extends IGoalRepository {
    constructor(storageKey = 'second_brain_goals_v2') {
      super();
      this.storageKey = storageKey;
    }

    getAll() {
      try {
        const raw = getStorage().getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      if (typeof Store !== 'undefined' && typeof Store.getGoals === 'function') {
        return Store.getGoals();
      }
      return [];
    }

    getById(id) {
      return this.getAll().find(g => g.id === id) || null;
    }

    save(goal) {
      const goals = this.getAll();
      const idx = goals.findIndex(g => g.id === goal.id);
      if (idx >= 0) {
        goals[idx] = { ...goals[idx], ...goal };
      } else {
        goals.unshift({ ...goal });
      }
      getStorage().setItem(this.storageKey, JSON.stringify(goals));
      return goal;
    }

    updateProgress(id, progress) {
      const goals = this.getAll();
      const goal = goals.find(g => g.id === id);
      if (goal) {
        goal.progress = Math.min(100, Math.max(0, progress));
        getStorage().setItem(this.storageKey, JSON.stringify(goals));
        return goal;
      }
      return null;
    }

    delete(id) {
      const goals = this.getAll().filter(g => g.id !== id);
      getStorage().setItem(this.storageKey, JSON.stringify(goals));
      return true;
    }
  }

  /**
   * LocalStorage Repository Adapter for Chat Threads
   */
  class LocalStorageChatThreadRepository extends IChatThreadRepository {
    constructor(threadsKey = 'second_brain_chat_threads_v1', activeKey = 'second_brain_active_thread_v1') {
      super();
      this.threadsKey = threadsKey;
      this.activeKey = activeKey;
    }

    getAll() {
      try {
        const raw = getStorage().getItem(this.threadsKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    getById(id) {
      return this.getAll().find(t => t.id === id) || null;
    }

    save(thread) {
      const threads = this.getAll();
      const idx = threads.findIndex(t => t.id === thread.id);
      if (idx >= 0) {
        threads[idx] = { ...threads[idx], ...thread, updatedAt: Date.now() };
      } else {
        threads.unshift({ ...thread, createdAt: Date.now(), updatedAt: Date.now() });
      }
      getStorage().setItem(this.threadsKey, JSON.stringify(threads));
      return thread;
    }

    delete(id) {
      const threads = this.getAll().filter(t => t.id !== id);
      getStorage().setItem(this.threadsKey, JSON.stringify(threads));
      return true;
    }

    getActiveThreadId() {
      return getStorage().getItem(this.activeKey) || null;
    }

    setActiveThreadId(id) {
      if (id) getStorage().setItem(this.activeKey, id);
      else getStorage().removeItem(this.activeKey);
    }
  }

  /**
   * In-Memory / Persistent Repository Adapter for Messages
   */
  class InMemoryMessageRepository extends IMessageRepository {
    constructor() {
      super();
      this.messagesMap = new Map(); // room -> Array
    }

    getHistory(room = 'general') {
      if (typeof require !== 'undefined') {
        try {
          const db = require('../services/DatabaseService').dbInstance;
          if (db) {
            const dbHistory = db.getChatHistory(room);
            if (dbHistory && dbHistory.length > 0) return dbHistory;
          }
        } catch (e) {}
      }
      return this.messagesMap.get(room) || [];
    }

    saveMessage(message) {
      const room = message.room || 'general';
      if (typeof require !== 'undefined') {
        try {
          const db = require('../services/DatabaseService').dbInstance;
          if (db) db.saveChatMessage(message);
        } catch (e) {}
      }
      const history = this.messagesMap.get(room) || [];
      history.push(message);
      if (history.length > 200) history.shift();
      this.messagesMap.set(room, history);
      return message;
    }

    clearHistory(room = 'general') {
      if (typeof require !== 'undefined') {
        try {
          const db = require('../services/DatabaseService').dbInstance;
          if (db) db.clearChatHistory(room);
        } catch (e) {}
      }
      this.messagesMap.set(room, []);
    }
  }

  const StorageAdapters = {
    LocalStorageNoteRepository,
    InMemoryNoteRepository,
    PostgresNoteRepository,
    LocalStorageGoalRepository,
    LocalStorageChatThreadRepository,
    InMemoryMessageRepository
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageAdapters;
  } else {
    global.StorageAdapters = StorageAdapters;
  }
})(typeof window !== 'undefined' ? window : this);
