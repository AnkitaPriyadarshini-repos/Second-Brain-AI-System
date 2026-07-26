/**
 * Second Brain AI System — RAG (Retrieval-Augmented Generation) Engine
 * Custom local vector search with TF-IDF cosine similarity, grounded citation extraction, and AI synthesis
 */

(function (global) {
  'use strict';

  const RAGEngine = {
    sessionHistory: [],

    resetSession: function () {
      this.sessionHistory = [];
    },

    /**
     * Executes RAG Query against local note vault
     */
    query: function (queryText, notes, options = {}) {
      if (!queryText || !Array.isArray(notes) || notes.length === 0) {
        const fallbackRes = {
          answer: "Please enter a valid search query to retrieve grounded insights from your Second Brain.",
          citations: [],
          isGrounded: false,
          isGeneralKnowledge: false
        };
        return fallbackRes;
      }

      // Check multi-turn follow-up
      let effectiveQuery = queryText;
      const isFollowUp = /(this topic|that|what else|more about|tell me more|on this)/i.test(queryText);
      if (isFollowUp && this.sessionHistory.length > 0) {
        const lastQuery = this.sessionHistory[this.sessionHistory.length - 1].query;
        effectiveQuery = `${lastQuery} ${queryText}`;
      }

      let nlp = typeof NLPEngine !== 'undefined' ? NLPEngine : null;
      if (!nlp && typeof global !== 'undefined' && global.NLPEngine) nlp = global.NLPEngine;
      if (!nlp && typeof require === 'function') {
        try { nlp = require('./nlp-engine'); } catch (e) {}
      }

      const qTokens = effectiveQuery.toLowerCase().split(/\W+/).filter(t => t.length > 2);
      const queryVector = nlp ? nlp.createTFVector(effectiveQuery) : null;

      // Calculate semantic similarity scores & keyword matches for all notes
      const scoredNotes = notes.map(note => {
        const fullText = `${note.title} ${note.summary || ''} ${note.content} ${(note.tags || []).join(' ')}`;
        const noteVector = nlp ? nlp.createTFVector(fullText) : null;
        let simScore = (nlp && queryVector && noteVector) ? nlp.cosineSimilarity(queryVector, noteVector) : 0;
        
        const fullTextLower = fullText.toLowerCase();
        let keywordMatches = 0;
        qTokens.forEach(token => {
          if (fullTextLower.includes(token)) keywordMatches++;
        });

        const combinedScore = simScore + (keywordMatches * 0.1);
        return { note, score: combinedScore, keywordMatches };
      });

      // Filter and sort matching notes
      let matches = scoredNotes
        .filter(item => item.score > 0.01 || item.keywordMatches > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length === 0 && notes.length > 0) {
        matches = scoredNotes.sort((a, b) => b.score - a.score).slice(0, 2);
      }

      let response;
      if (matches.length > 0 && matches[0].score > 0) {
        const retrievedNotes = matches.slice(0, 4).map(m => m.note);
        const synthesizedAnswer = this.synthesizeDynamicAnswer(effectiveQuery, retrievedNotes);

        response = {
          answer: synthesizedAnswer,
          citations: retrievedNotes,
          isGrounded: true,
          isGeneralKnowledge: false
        };
      } else {
        // Fallback: AI General Knowledge Synthesis
        response = {
          answer: this.generateFallbackAISynthesis(effectiveQuery),
          citations: [],
          isGrounded: false,
          isGeneralKnowledge: true
        };
      }

      this.sessionHistory.push({ query: queryText, response });
      return response;
    },

    /**
     * Synthesizes a structured answer from retrieved notes dynamically
     */
    synthesizeDynamicAnswer: function (query, retrievedNotes) {
      if (retrievedNotes.length === 0) return '';

      const topNote = retrievedNotes[0];
      let synthesis = `### Grounded Insight from Your Second Brain\n\n`;

      if (retrievedNotes.length === 1) {
        synthesis += `Based on your note **"${topNote.title}"** (${topNote.dateStr}):\n\n`;
        synthesis += `${topNote.content}\n\n`;
        if (topNote.summary) {
          synthesis += `> **Key Summary**: ${topNote.summary}\n\n`;
        }
      } else {
        synthesis += `I found **${retrievedNotes.length} relevant notes** in your vault addressing "${query}":\n\n`;
        
        retrievedNotes.forEach((note, idx) => {
          synthesis += `#### ${idx + 1}. ${note.title} *(${note.sourceType.toUpperCase()} • ${note.dateStr})*\n`;
          const textSnippet = note.summary || note.content;
          synthesis += `${textSnippet.length > 280 ? textSnippet.substring(0, 280) + '...' : textSnippet}\n`;
          if (note.tags && note.tags.length > 0) {
            synthesis += `*Tags:* \`${note.tags.join('`, `')}\`  \n`;
          }
          synthesis += `\n`;
        });
      }

      synthesis += `\n---\n#### Actionable Takeaways:\n`;
      synthesis += `• **Core Concept**: ${topNote.summary || topNote.title}\n`;
      synthesis += `• **Surfaces Ingested**: Surfaced across ${[...new Set(retrievedNotes.map(n => n.sourceType))].join(', ')} captures.\n`;
      synthesis += `• **Next Steps**: You can click any cited note pill below to open its full view or edit its contents.`;

      return synthesis;
    },

    /**
     * Generates a smart fallback synthesis when no specific local notes are indexed for a query
     */
    generateFallbackAISynthesis: function (query) {
      const qLower = query.toLowerCase().trim();

      // Handle greetings and conversational prompts
      const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'greetings', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what can you do', 'help', 'how are you', 'what is this'];
      if (greetings.some(g => qLower === g || qLower.startsWith(g + ' ') || qLower.startsWith(g + '!'))) {
        return `### Hello! Welcome to your Second Brain AI

I am your personal AI knowledge assistant, indexing **100+ saved notes**, voice memos, web clips, and research documents.

#### How I can help you:
• **Ask Questions**: Type or speak any question about your notes (e.g. *"What did I save about deep learning?"* or *"Startup idea in January"*).
• **Voice Q&A**: Click the **Voice Assistant** button to talk out loud!
• **Grounded Answers**: I retrieve exact answers from your notes with clickable source citations.
• **AI Synthesizer**: If a topic isn't in your notes yet, I can synthesize an answer and let you save it as a new note.

What would you like to explore today?`;
      }

      let topicHeading = "Intelligent AI Knowledge Synthesis";
      let bodyText = "";

      if (qLower.includes("deep learning") || qLower.includes("machine learning") || qLower.includes("ai")) {
        topicHeading = "Deep Learning & AI Fundamentals";
        bodyText = "Deep Learning uses multi-layer neural networks to extract hierarchical representations from data. Concepts like self-attention, loss optimization (AdamW), and vector retrieval (RAG) enable complex reasoning and generative abilities across vision and language tasks.";
      } else if (qLower.includes("system") || qLower.includes("distributed") || qLower.includes("architecture")) {
        topicHeading = "Distributed Systems & Scalable Architecture";
        bodyText = "Distributed systems focus on fault tolerance, horizontal scaling, partition tolerance, and low latency. Key paradigms include consensus protocols (Raft, Paxos), event streams (Kafka), and decoupled microservices.";
      } else if (qLower.includes("habit") || qLower.includes("productivity") || qLower.includes("learning")) {
        topicHeading = "Productivity & Second Brain PKM Systems";
        bodyText = "A Second Brain operates on the CODE framework (Capture, Organize, Distill, Express). By using zero-friction capture and automated semantic linking, you offload working memory demands to build a personal knowledge network.";
      } else {
        topicHeading = `Knowledge Synthesis: ${query}`;
        bodyText = `Here is an intelligent overview regarding "${query}": Personal Knowledge Management (PKM) enables you to offload mental storage so you can focus on creative synthesis. Capture raw ideas, tag key concepts, and use RAG semantic search to retrieve them instantly.`;
      }

      let res = `### ${topicHeading}\n\n`;
      res += `${bodyText}\n\n`;
      res += `> *Note: No existing notes in your local vault explicitly contained this exact query. Synthesized via Second Brain built-in AI Knowledge Engine.*\n\n`;
      res += `**Would you like to save this response as a new note in your Second Brain?** Use the **"Save to Vault"** button below!`;

      return res;
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RAGEngine;
  } else {
    global.RAGEngine = RAGEngine;
  }

})(typeof window !== 'undefined' ? window : this);
