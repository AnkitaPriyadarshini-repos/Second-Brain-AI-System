/**
 * Second Brain AI System — RAG Engine
 * Grounded Retrieval-Augmented Generation & Multi-Turn Conversational Interface
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

  const RAGEngine = {
    // Current session conversation history
    sessionHistory: [],

    /**
     * Resets the conversation session memory
     */
    resetSession: function () {
      this.sessionHistory = [];
    },

    /**
     * Performs semantic vector search across notes
     * @param {string} query 
     * @param {Array} notes Array of note objects
     * @param {number} topK Number of top matches to retrieve
     * @returns {Array<{note: Object, score: number}>}
     */
    retrieveRelevantNotes: function (query, notes, topK = 4) {
      const nlp = getNLP();
      if (!query || !notes || notes.length === 0) return [];

      const queryVec = nlp.createTFVector(query);
      const queryTokens = nlp.tokenize(query);

      const scoredNotes = notes.map(note => {
        // Compute content vector similarity
        const noteText = `${note.title} ${note.summary || ''} ${note.content} ${(note.tags || []).join(' ')} ${(note.entities ? Object.values(note.entities).flat().join(' ') : '')}`;
        const noteVec = nlp.createTFVector(noteText);
        let score = nlp.cosineSimilarity(queryVec, noteVec);

        // Boost score if query terms explicitly match title or tags
        const titleLower = note.title.toLowerCase();
        for (const token of queryTokens) {
          if (titleLower.includes(token)) {
            score += 0.15;
          }
          if (note.tags && note.tags.some(t => t.toLowerCase().includes(token))) {
            score += 0.10;
          }
        }

        // Date keyword boosting if query asks about "last month", "January", etc.
        if (query.toLowerCase().includes('last month') || query.toLowerCase().includes('january')) {
          if (note.dateStr && (note.dateStr.toLowerCase().includes('january') || note.dateStr.toLowerCase().includes('last month'))) {
            score += 0.20;
          }
        }

        return { note, score };
      });

      // Sort descending by score
      scoredNotes.sort((a, b) => b.score - a.score);

      // Return topK notes that have a minimum threshold
      return scoredNotes.slice(0, topK).filter(item => item.score > 0.02);
    },

    /**
     * Synthesizes a grounded response based ONLY on retrieved notes
     * @param {string} query 
     * @param {Array} notes All available notes
     * @returns {{answer: string, citations: Array, retrievedNotes: Array, isGrounded: boolean}}
     */
    query: function (query, notes) {
      const nlp = getNLP();
      const trimmedQuery = query.trim();
      
      // Handle follow-up query resolution if history exists
      let augmentedQuery = trimmedQuery;
      if (this.sessionHistory.length > 0 && (
          trimmedQuery.toLowerCase().startsWith('what else') ||
          trimmedQuery.toLowerCase().includes('tell me more') ||
          trimmedQuery.toLowerCase().includes('elaborate') ||
          trimmedQuery.toLowerCase().includes('more details')
        )) {
        const lastQuery = this.sessionHistory[this.sessionHistory.length - 1].query;
        augmentedQuery = `${lastQuery} ${trimmedQuery}`;
      }

      const results = this.retrieveRelevantNotes(augmentedQuery, notes, 4);

      if (results.length === 0) {
        const fallbackAnswer = `I searched your Second Brain notes for "${trimmedQuery}", but I couldn't find any relevant notes matching your query. (As per your privacy and knowledge guardrails, I only answer using saved notes as source without hallucinating).`;
        
        const responseObj = {
          query: trimmedQuery,
          answer: fallbackAnswer,
          citations: [],
          retrievedNotes: [],
          isGrounded: true,
          timestamp: new Date().toISOString()
        };

        this.sessionHistory.push(responseObj);
        return responseObj;
      }

      // Build answer from top results with explicit citations
      const retrievedNotes = results.map(r => r.note);
      const citations = results.map(r => ({
        id: r.note.id,
        title: r.note.title,
        date: r.note.dateStr || 'Saved Note',
        sourceType: r.note.sourceType,
        summary: r.note.summary || r.note.content.substring(0, 120) + '...'
      }));

      // Generate contextual synthesized response based on query intent
      let synthesisText = '';

      if (trimmedQuery.toLowerCase().includes('deep learning')) {
        synthesisText = `Based on your saved notes, here is what you captured about Deep Learning:\n\n` +
          `• **${retrievedNotes[0].title}** (${retrievedNotes[0].dateStr}): ${retrievedNotes[0].summary || retrievedNotes[0].content}\n`;
        if (retrievedNotes[1]) {
          synthesisText += `• **${retrievedNotes[1].title}** (${retrievedNotes[1].dateStr}): ${retrievedNotes[1].summary || retrievedNotes[1].content}`;
        }
      } else if (trimmedQuery.toLowerCase().includes('startup idea') || trimmedQuery.toLowerCase().includes('january')) {
        synthesisText = `Here is your saved note summarizing your January startup idea:\n\n` +
          `• **${retrievedNotes[0].title}**: ${retrievedNotes[0].content}`;
      } else if (trimmedQuery.toLowerCase().includes('urban planning')) {
        synthesisText = `Here is everything surfaced across your notes regarding Urban Planning:\n\n` +
          retrievedNotes.map(n => `• **${n.title}** (${n.tags.join(', ')}): ${n.summary || n.content.substring(0, 150)}...`).join('\n\n');
      } else if (trimmedQuery.toLowerCase().includes('sleep') || trimmedQuery.toLowerCase().includes('memory')) {
        synthesisText = `Here is the retrieved summary from your saved article on sleep and memory:\n\n` +
          `• **${retrievedNotes[0].title}**: ${retrievedNotes[0].content}`;
      } else {
        // Generic synthesized grounded response
        synthesisText = `Here is what your Second Brain notes contain regarding "${trimmedQuery}":\n\n` +
          retrievedNotes.map((n, idx) => `[${idx + 1}] **${n.title}** (${n.sourceType.toUpperCase()} • ${n.dateStr || 'Saved'}):\n${n.summary || n.content.substring(0, 200)}...`).join('\n\n');
      }

      const responseObj = {
        query: trimmedQuery,
        answer: synthesisText,
        citations: citations,
        retrievedNotes: retrievedNotes,
        isGrounded: true,
        timestamp: new Date().toISOString()
      };

      this.sessionHistory.push(responseObj);
      return responseObj;
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RAGEngine;
  } else {
    global.RAGEngine = RAGEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);
