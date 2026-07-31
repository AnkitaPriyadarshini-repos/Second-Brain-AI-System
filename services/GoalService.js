/**
 * Second Brain AI System — Goal Domain Service (Layered Architecture)
 * Manages learning milestones, progress calculations, and tag linkings.
 */

(function (global) {
  'use strict';

  class GoalService {
    constructor(containerRef) {
      this.container = containerRef || (typeof require !== 'undefined' ? require('../js/container').container : global.container);
    }

    get repository() {
      return this.container.resolve('GoalRepository');
    }

    getAllGoals() {
      return this.repository.getAll();
    }

    getGoalById(id) {
      if (!id) throw new Error('Goal ID is required');
      return this.repository.getById(id);
    }

    createGoal(goalDto) {
      if (!goalDto || !goalDto.title) {
        throw new Error('Goal title cannot be empty');
      }

      const newGoal = {
        id: goalDto.id || `goal-${Date.now()}`,
        title: goalDto.title.trim(),
        category: goalDto.category || 'General',
        targetDate: goalDto.targetDate || '2026-12-31',
        progress: Math.min(100, Math.max(0, parseInt(goalDto.progress, 10) || 0)),
        targetCount: parseInt(goalDto.targetCount, 10) || 10,
        linkedTags: Array.isArray(goalDto.linkedTags) ? goalDto.linkedTags : ['General'],
        description: goalDto.description || ''
      };

      return this.repository.save(newGoal);
    }

    updateProgress(id, progressVal) {
      if (!id) throw new Error('Goal ID is required');
      const cleanProgress = Math.min(100, Math.max(0, parseInt(progressVal, 10) || 0));
      return this.repository.updateProgress(id, cleanProgress);
    }

    deleteGoal(id) {
      if (!id) throw new Error('Goal ID is required');
      return this.repository.delete(id);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalService;
  } else {
    global.GoalService = GoalService;
  }
})(typeof window !== 'undefined' ? window : this);
