/**
 * Second Brain AI System — Note Domain Service (Layered Architecture)
 * Contains core business logic for note processing, grounded RAG search, and entity extraction.
 */

(function (global) {
  'use strict';

  class NoteService {
    constructor(containerRef) {
      this.container = containerRef || (typeof require !== 'undefined' ? require('../js/container').container : global.container);
    }

    get repository() {
      return this.container.resolve('NoteRepository');
    }

    getAllNotes(userId) {
      return this.repository.getAll(userId);
    }

    getNoteById(id, userId) {
      if (!id) throw new Error('Note ID is required');
      return this.repository.getById(id, userId);
    }

    createNote(noteDto, userId) {
      if (!noteDto || !noteDto.content) {
        throw new Error('Note content cannot be empty');
      }

      const cleanUserId = userId || noteDto.userId || noteDto.user_id || 'usr_default';
      const title = noteDto.title || 'Untitled Note';
      const content = noteDto.content;
      const sourceType = noteDto.sourceType || 'typing';
      const sourceUrl = noteDto.sourceUrl || '';

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      // Domain logic: Auto-generate summary & tags if not provided
      const summary = noteDto.summary || (content.length > 100 ? content.substring(0, 100) + '...' : content);
      const tags = Array.isArray(noteDto.tags) && noteDto.tags.length > 0 ? noteDto.tags : ['General'];
      const entities = noteDto.entities || { dates: [], tech: [], people: [] };

      const newNote = {
        id: noteDto.id || `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: cleanUserId,
        user_id: cleanUserId,
        title,
        content,
        summary,
        sourceType,
        sourceUrl,
        dateStr,
        tags,
        entities,
        pinned: Boolean(noteDto.pinned),
        createdAt: noteDto.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      return this.repository.save(newNote, cleanUserId);
    }

    searchNotes(query, userId) {
      if (!query || typeof query !== 'string') return this.getAllNotes(userId);
      return this.repository.search(query.trim(), userId);
    }

    togglePin(id, userId) {
      if (!id) throw new Error('Note ID is required to toggle pin state');
      return this.repository.togglePin(id, userId);
    }

    deleteNote(id, userId) {
      if (!id) throw new Error('Note ID is required to delete note');
      return this.repository.delete(id, userId);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteService;
  } else {
    global.NoteService = NoteService;
  }
})(typeof window !== 'undefined' ? window : this);
