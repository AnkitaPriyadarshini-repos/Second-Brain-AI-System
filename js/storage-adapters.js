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

  // Safe localStorage helper
  const getStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof global !== 'undefined' && global.window && global.window.localStorage) return global.window.localStorage;
    // Minimal fallback object
    return {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    };
  };

  /**
   * LocalStorage Repository Adapter for Notes
   */
  class LocalStorageNoteRepository extends INoteRepository {
    constructor(storageKey = 'second_brain_notes_v2') {
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
      if (typeof Store !== 'undefined' && Array.isArray(Store.notes) && Store.notes.length > 0) {
        return Store.notes;
      }
      return [];
    }

    getById(id) {
      return this.getAll().find(n => n.id === id) || null;
    }

    save(note) {
      const notes = this.getAll();
      const existingIdx = notes.findIndex(n => n.id === note.id);
      if (existingIdx >= 0) {
        notes[existingIdx] = { ...notes[existingIdx], ...note, updatedAt: Date.now() };
      } else {
        notes.unshift({ ...note, createdAt: note.createdAt || Date.now(), updatedAt: Date.now() });
      }
      getStorage().setItem(this.storageKey, JSON.stringify(notes));
      return note;
    }

    delete(id) {
      const notes = this.getAll().filter(n => n.id !== id);
      getStorage().setItem(this.storageKey, JSON.stringify(notes));
      return true;
    }

    togglePin(id) {
      const notes = this.getAll();
      const note = notes.find(n => n.id === id);
      if (note) {
        note.pinned = !note.pinned;
        getStorage().setItem(this.storageKey, JSON.stringify(notes));
        return note;
      }
      return null;
    }

    search(query) {
      if (!query) return this.getAll();
      const q = query.toLowerCase();
      return this.getAll().filter(n => 
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

    getAll() {
      return Array.from(this.notesMap.values());
    }

    getById(id) {
      return this.notesMap.get(id) || null;
    }

    save(note) {
      this.notesMap.set(note.id, { ...note });
      return note;
    }

    delete(id) {
      return this.notesMap.delete(id);
    }

    togglePin(id) {
      const n = this.notesMap.get(id);
      if (n) {
        n.pinned = !n.pinned;
        this.notesMap.set(id, n);
        return n;
      }
      return null;
    }

    search(query) {
      if (!query) return this.getAll();
      const q = query.toLowerCase();
      return this.getAll().filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    queryByTags(tags) {
      const target = tags.map(t => t.toLowerCase());
      return this.getAll().filter(n => n.tags && n.tags.some(t => target.includes(t.toLowerCase())));
    }

    migrateSchema(targetVersion, transformFn) {
      const migrated = this.getAll().map(n => transformFn(n, targetVersion));
      this.notesMap.clear();
      migrated.forEach(n => this.notesMap.set(n.id, n));
      return migrated;
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
