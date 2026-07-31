/**
 * Second Brain AI System — Goal Controller (Layered Architecture)
 * Handles HTTP requests, payload validation, and delegates domain actions to GoalService.
 */

(function (global) {
  'use strict';

  class GoalController {
    constructor(goalService) {
      if (typeof require !== 'undefined' && !goalService) {
        const GoalServiceClass = require('../services/GoalService');
        this.goalService = new GoalServiceClass();
      } else {
        this.goalService = goalService;
      }
    }

    getGoals(req, res) {
      try {
        const goals = this.goalService.getAllGoals();
        if (res && typeof res.json === 'function') {
          return res.status(200).json({ success: true, count: goals.length, data: goals });
        }
        return { success: true, count: goals.length, data: goals };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(500).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    createGoal(req, res) {
      try {
        const body = (req && req.body) ? req.body : req;
        const created = this.goalService.createGoal(body);
        if (res && typeof res.json === 'function') {
          return res.status(201).json({ success: true, data: created });
        }
        return { success: true, data: created };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(400).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    updateProgress(req, res) {
      try {
        const id = (req && req.params && req.params.id) ? req.params.id : (req && req.id ? req.id : null);
        const progress = (req && req.body && req.body.progress !== undefined) ? req.body.progress : (req && req.progress !== undefined ? req.progress : 0);
        const updated = this.goalService.updateProgress(id, progress);
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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalController;
  } else {
    global.GoalController = GoalController;
  }
})(typeof window !== 'undefined' ? window : this);
