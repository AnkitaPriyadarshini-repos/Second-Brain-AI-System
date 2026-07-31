/**
 * Second Brain AI System — Dependency Injection Container (DIP)
 * Central DI Container managing abstract repository bindings and service dependencies.
 */

(function (global) {
  'use strict';

  class DIContainer {
    constructor() {
      this.services = new Map();
      this.factories = new Map();
    }

    /**
     * Register concrete singleton instance or adapter for an abstract interface key
     */
    register(key, instance) {
      if (!key) throw new Error('Container key cannot be empty');
      this.services.set(key, instance);
      return this;
    }

    /**
     * Register factory function for lazy instantiation
     */
    registerFactory(key, factoryFn) {
      if (!key) throw new Error('Container key cannot be empty');
      this.factories.set(key, factoryFn);
      return this;
    }

    /**
     * Resolve service or repository instance by abstract key
     */
    resolve(key) {
      if (this.services.has(key)) {
        return this.services.get(key);
      }
      if (this.factories.has(key)) {
        const instance = this.factories.get(key)(this);
        this.services.set(key, instance);
        return instance;
      }
      throw new Error(`[DI Container] Service or Repository '${key}' is not registered in container.`);
    }

    /**
     * Check if key is registered
     */
    has(key) {
      return this.services.has(key) || this.factories.has(key);
    }

    /**
     * Reset container bindings (useful for unit testing)
     */
    reset() {
      this.services.clear();
      this.factories.clear();
    }
  }

  // Initialize global container instance with default LocalStorage & Memory adapters
  const container = new DIContainer();

  let StorageAdapters;
  if (typeof require !== 'undefined') {
    try {
      StorageAdapters = require('./storage-adapters');
    } catch (e) {}
  } else {
    StorageAdapters = global.StorageAdapters;
  }

  if (StorageAdapters) {
    container.register('NoteRepository', new StorageAdapters.LocalStorageNoteRepository());
    container.register('GoalRepository', new StorageAdapters.LocalStorageGoalRepository());
    container.register('ChatThreadRepository', new StorageAdapters.LocalStorageChatThreadRepository());
    container.register('MessageRepository', new StorageAdapters.InMemoryMessageRepository());
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DIContainer, container };
  } else {
    global.DIContainer = DIContainer;
    global.container = container;
  }
})(typeof window !== 'undefined' ? window : this);
