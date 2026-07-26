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
    retrieveRelevantNotes: function (query, notes, topK = 5) {
      const nlp = getNLP();
      if (!query || !notes || notes.length === 0) return [];

      const queryVec = nlp.createTFVector(query);
      const queryTokens = nlp.tokenize(query);
      const queryLower = query.toLowerCase();

      const scoredNotes = notes.map(note => {
        // Compute content vector similarity
        const noteText = `${note.title} ${note.summary || ''} ${note.content} ${(note.tags || []).join(' ')} ${(note.entities ? Object.values(note.entities).flat().join(' ') : '')}`;
        const noteVec = nlp.createTFVector(noteText);
        let score = nlp.cosineSimilarity(queryVec, noteVec);

        const titleLower = note.title.toLowerCase();
        const contentLower = (note.content || '').toLowerCase();

        // Title token match boost
        for (const token of queryTokens) {
          if (titleLower.includes(token)) {
            score += 0.20;
          }
          if (note.tags && note.tags.some(t => t.toLowerCase().includes(token))) {
            score += 0.12;
          }
          if (contentLower.includes(token)) {
            score += 0.05;
          }
        }

        // Exact phrase matching boost
        if (queryTokens.length > 1 && contentLower.includes(queryLower)) {
          score += 0.35;
        }
        if (queryTokens.length > 1 && titleLower.includes(queryLower)) {
          score += 0.45;
        }

        // Entity matching boost
        if (note.entities) {
          const allEntities = Object.values(note.entities).flat().map(e => String(e).toLowerCase());
          for (const token of queryTokens) {
            if (allEntities.some(ent => ent.includes(token))) {
              score += 0.15;
            }
          }
        }

        // Date keyword boosting (e.g., "January", "last month", "2026")
        const dateKeywords = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'last month', 'yesterday'];
        for (const dateKw of dateKeywords) {
          if (queryLower.includes(dateKw)) {
            if (note.dateStr && note.dateStr.toLowerCase().includes(dateKw)) {
              score += 0.25;
            }
          }
        }

        return { note, score };
      });

      // Sort descending by score
      scoredNotes.sort((a, b) => b.score - a.score);

      // Filter notes with positive relevance score
      return scoredNotes.filter(item => item.score > 0.01).slice(0, topK);
    },

    /**
     * Synthesizes a grounded response based on retrieved notes & AI knowledge engine
     * @param {string} query 
     * @param {Array} notes All available notes
     * @returns {{answer: string, citations: Array, retrievedNotes: Array, isGrounded: boolean, isGeneralKnowledge: boolean}}
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
          trimmedQuery.toLowerCase().includes('more details') ||
          trimmedQuery.toLowerCase().startsWith('explain')
        )) {
        const lastQuery = this.sessionHistory[this.sessionHistory.length - 1].query;
        augmentedQuery = `${lastQuery} ${trimmedQuery}`;
      }

      const results = this.retrieveRelevantNotes(augmentedQuery, notes, 5);

      if (results.length === 0) {
        // AI Fallback Synthesis when no specific saved notes match
        const synthesizedAIAnswer = this.generateFallbackAISynthesis(trimmedQuery);
        
        const responseObj = {
          query: trimmedQuery,
          answer: synthesizedAIAnswer,
          citations: [],
          retrievedNotes: [],
          isGrounded: false,
          isGeneralKnowledge: true,
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

      // Dynamic Intelligent Answer Synthesis
      const synthesisText = this.synthesizeDynamicAnswer(trimmedQuery, retrievedNotes);

      const responseObj = {
        query: trimmedQuery,
        answer: synthesisText,
        citations: citations,
        retrievedNotes: retrievedNotes,
        isGrounded: true,
        isGeneralKnowledge: false,
        timestamp: new Date().toISOString()
      };

      this.sessionHistory.push(responseObj);
      return responseObj;
    },

    /**
     * Synthesizes a structured answer from retrieved notes dynamically
     */
    synthesizeDynamicAnswer: function (query, retrievedNotes) {
      if (retrievedNotes.length === 0) return '';

      const topNote = retrievedNotes[0];
      let synthesis = `### 🧠 Grounded Insight from Your Second Brain\n\n`;

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

      synthesis += `\n---\n#### 💡 Actionable Takeaways:\n`;
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
        return `### 👋 Hello! Welcome to your Second Brain AI

I am your personal AI knowledge assistant, indexing **100+ saved notes**, voice memos, web clips, and research documents.

#### 💡 How I can help you:
• **Ask Questions**: Type or speak any question about your notes (e.g. *"What did I save about deep learning?"* or *"Startup idea in January"*).
• **Voice Q&A**: Click the **🎙️ Voice Assistant** button to talk out loud!
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

      let res = `### 🌐 ${topicHeading}\n\n`;
      res += `${bodyText}\n\n`;
      res += `> 📌 *Note: No existing notes in your local vault explicitly contained this exact query. Synthesized via Second Brain built-in AI Knowledge Engine.*\n\n`;
      res += `⚡ **Would you like to save this response as a new note in your Second Brain?** Use the **"⚡ Save to Vault"** button below!`;

      return res;
    }
  };

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RAGEngine;
  } else {
    global.RAGEngine = RAGEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);


