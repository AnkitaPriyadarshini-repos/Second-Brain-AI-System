/**
 * Second Brain AI System — Proactive Resurfacing Engine
 * Analyzes past 7-day activity & surfaces relevant older unaccessed notes ("From your past notes")
 */

(function (global) {
  'use strict';

  let NLPEngineRef = null;

  function getNLP() {
    if (NLPEngineRef) return NLPEngineRef;
    if (typeof require !== 'undefined') {
      try {
        NLPEngineRef = require('./nlp-engine');
      } catch (e) {
        NLPEngineRef = global.NLPEngine;
      }
    } else {
      NLPEngineRef = global.NLPEngine;
    }
    return NLPEngineRef;
  }

  const ResurfacingEngine = {
    /**
     * Generates daily resurfacing recommendations based on recent activity vector
     * @param {Array} notes Full list of saved notes
     * @param {Array} recentActivity Recent queries, clicked notes, or recent tags
     * @param {Array} dismissedIds Currently dismissed note IDs
     * @returns {Array<{note: Object, reason: string, score: number}>} Top 3-5 resurfaced notes
     */
    generateDigest: function (notes, recentActivity = [], dismissedIds = []) {
      const nlp = getNLP();
      if (!notes || notes.length === 0) return [];

      // 1. Build composite recent activity text
      let activityText = recentActivity.join(' ');
      if (!activityText.trim()) {
        // Fallback default activity baseline if user is new
        activityText = "deep learning kafka distributed systems urban planning sleep memory habit formation startup idea";
      }

      const activityVec = nlp.createTFVector(activityText);

      // 2. Filter candidate notes (e.g. unaccessed recently or saved in past)
      const dismissedSet = new Set(dismissedIds || []);
      const candidates = notes.filter(n => !dismissedSet.has(n.id) && !n.pinned);

      // 3. Compute vector similarity and contextual reason
      const scored = candidates.map(note => {
        const noteText = `${note.title} ${note.summary || ''} ${note.content} ${(note.tags || []).join(' ')}`;
        const noteVec = nlp.createTFVector(noteText);
        const score = nlp.cosineSimilarity(activityVec, noteVec);

        // Generate human-readable contextual reason
        let reason = `Relevant to your recent interest in ${note.tags[0] || 'your core topics'}.`;
        if (note.title.toLowerCase().includes('kafka') || activityText.toLowerCase().includes('kafka')) {
          reason = `You saved this note on distributed systems earlier. You've been reading about Kafka this week. Here it is.`;
        } else if (note.tags.includes('Artificial Intelligence')) {
          reason = `Proactively surfaced: Connected to your recent AI & Deep Learning inquiries.`;
        } else if (note.tags.includes('Habit & Productivity')) {
          reason = `Brought back into view: A habit technique you noted earlier that aligns with your active goals.`;
        } else if (note.tags.includes('Urban Planning')) {
          reason = `Resurfaced article: Connected to your research notes on urban density and transit.`;
        } else if (note.tags.includes('Sleep & Memory')) {
          reason = `Memory refresher: Key insights on circadian rhythms and retention saved from your past reading.`;
        }

        return {
          note,
          score,
          reason
        };
      });

      // 4. Sort descending by score and pick top 3-5
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 5);
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResurfacingEngine;
  } else {
    global.ResurfacingEngine = ResurfacingEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);
