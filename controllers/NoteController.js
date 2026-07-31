/**
 * Second Brain AI System — Note Controller (Layered Architecture)
 * Handles HTTP requests, DTO extraction, status code formatting, and delegates to NoteService.
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
    }

    getNotes(req, res) {
      try {
        const query = req && req.query ? req.query.q : null;
        const notes = query ? this.noteService.searchNotes(query) : this.noteService.getAllNotes();
        if (res && typeof res.json === 'function') {
          return res.status(200).json({ success: true, count: notes.length, data: notes });
        }
        return { success: true, count: notes.length, data: notes };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(500).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    createNote(req, res) {
      try {
        const body = (req && req.body) ? req.body : req;
        const createdNote = this.noteService.createNote(body);
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
        const id = (req && req.params && req.params.id) ? req.params.id : (req && req.id ? req.id : null);
        const updated = this.noteService.togglePin(id);
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
        const id = (req && req.params && req.params.id) ? req.params.id : (req && req.id ? req.id : null);
        const result = this.noteService.deleteNote(id);
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
