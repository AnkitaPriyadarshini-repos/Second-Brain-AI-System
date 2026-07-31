/**
 * Second Brain AI System — Data Repository Interfaces & Contracts (DIP)
 * Defines abstract data interfaces to decouple business services from low-level persistence mechanisms.
 */

(function (global) {
  'use strict';

  class AbstractMethodError extends Error {
    constructor(methodName) {
      super(`Abstract method '${methodName}' must be implemented by concrete repository adapter.`);
      this.name = 'AbstractMethodError';
    }
  }

  /**
   * Abstract Note Repository Interface
   */
  class INoteRepository {
    getAll() { throw new AbstractMethodError('getAll'); }
    getById(id) { throw new AbstractMethodError('getById'); }
    save(note) { throw new AbstractMethodError('save'); }
    delete(id) { throw new AbstractMethodError('delete'); }
    search(query) { throw new AbstractMethodError('search'); }
    togglePin(id) { throw new AbstractMethodError('togglePin'); }
    queryByTags(tags) { throw new AbstractMethodError('queryByTags'); }
    migrateSchema(targetVersion, transformFn) { throw new AbstractMethodError('migrateSchema'); }
  }

  /**
   * Abstract Goal Repository Interface
   */
  class IGoalRepository {
    getAll() { throw new AbstractMethodError('getAll'); }
    getById(id) { throw new AbstractMethodError('getById'); }
    save(goal) { throw new AbstractMethodError('save'); }
    updateProgress(id, progress) { throw new AbstractMethodError('updateProgress'); }
    delete(id) { throw new AbstractMethodError('delete'); }
  }

  /**
   * Abstract Chat Thread Repository Interface
   */
  class IChatThreadRepository {
    getAll() { throw new AbstractMethodError('getAll'); }
    getById(id) { throw new AbstractMethodError('getById'); }
    save(thread) { throw new AbstractMethodError('save'); }
    delete(id) { throw new AbstractMethodError('delete'); }
    getActiveThreadId() { throw new AbstractMethodError('getActiveThreadId'); }
    setActiveThreadId(id) { throw new AbstractMethodError('setActiveThreadId'); }
  }

  /**
   * Abstract Message Stream Repository Interface
   */
  class IMessageRepository {
    getHistory(room) { throw new AbstractMethodError('getHistory'); }
    saveMessage(message) { throw new AbstractMethodError('saveMessage'); }
    clearHistory(room) { throw new AbstractMethodError('clearHistory'); }
  }

  const RepositoryInterfaces = {
    INoteRepository,
    IGoalRepository,
    IChatThreadRepository,
    IMessageRepository,
    AbstractMethodError
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RepositoryInterfaces;
  } else {
    global.RepositoryInterfaces = RepositoryInterfaces;
  }
})(typeof window !== 'undefined' ? window : this);
