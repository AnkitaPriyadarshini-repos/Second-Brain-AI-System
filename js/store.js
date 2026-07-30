/**
 * Second Brain AI System — Data Store & 100+ Notes Pre-Seeder Engine
 */

(function (global) {
  'use strict';

  let NLPEngineRef = null;

  function getNLP() {
    if (NLPEngineRef) return NLPEngineRef;
    if (typeof NLPEngine !== 'undefined') {
      NLPEngineRef = NLPEngine;
      return NLPEngineRef;
    }
    if (typeof window !== 'undefined' && window.NLPEngine) {
      NLPEngineRef = window.NLPEngine;
      return NLPEngineRef;
    }
    if (typeof global !== 'undefined' && global.NLPEngine) {
      NLPEngineRef = global.NLPEngine;
      return NLPEngineRef;
    }
    if (typeof globalThis !== 'undefined' && globalThis.NLPEngine) {
      NLPEngineRef = globalThis.NLPEngine;
      return NLPEngineRef;
    }
    if (typeof require !== 'undefined') {
      try {
        NLPEngineRef = require('./nlp-engine');
        return NLPEngineRef;
      } catch (e) {}
    }
    return {
      extractEntities: (text) => ({ dates: [], tech: [], concepts: [] }),
      classifyTopics: (title, content) => ['General'],
      generateSummary: (text) => text ? (text.length > 100 ? text.substring(0, 100) + '...' : text) : '',
      createTFVector: () => ({}),
      cosineSimilarity: () => 0.5
    };
  }

  const STORAGE_KEY = 'second_brain_notes_v2';
  const DISMISSED_KEY = 'second_brain_dismissed_v2';
  const SETTINGS_KEY = 'second_brain_settings_v2';
  const GOALS_KEY = 'second_brain_goals_v2';

  function generateDefaultGoals() {
    return [
      {
        id: 'goal-1',
        title: 'Master Deep Learning & AI Architecture',
        category: 'Artificial Intelligence',
        targetDate: '2026-12-31',
        progress: 75,
        targetCount: 20,
        linkedTags: ['AI', 'Deep Learning', 'Neural Networks', 'LLM'],
        description: 'Comprehensive study of transformer self-attention, sparse vector embeddings, and on-device model quantization.'
      },
      {
        id: 'goal-2',
        title: 'Build High-Performance Distributed Systems',
        category: 'Software Engineering',
        targetDate: '2026-10-15',
        progress: 60,
        targetCount: 15,
        linkedTags: ['Distributed Systems', 'Kafka', 'Microservices', 'Database'],
        description: 'Design fault-tolerant event streams, consensus protocols (Raft/Paxos), and sub-50ms latency query pipelines.'
      },
      {
        id: 'goal-3',
        title: 'Optimize Memory Retention & Spaced Repetition',
        category: 'Cognitive Science',
        targetDate: '2026-09-01',
        progress: 85,
        targetCount: 25,
        linkedTags: ['Cognition', 'Memory', 'Neuroscience', 'Learning'],
        description: 'Apply SuperMemo-2 algorithms and proactive note resurfacing to maximize long-term knowledge retention.'
      }
    ];
  }

  // Generator for 100 high-quality pre-seeded realistic personal notes
  function generate100PreSeededNotes() {
    const rawTemplates = [
      {
        title: "Deep Learning & Transformer Attention Mechanisms",
        content: "Transformers rely on multi-head self-attention mechanisms to weigh tokens dynamically across context windows. Key equation: Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V. Useful for scaling LLMs without vanishing gradients. Discussed in January reading group.",
        sourceType: "typing",
        dateStr: "January 14, 2026",
        sourceUrl: ""
      },
      {
        title: "Voice Memo: Startup Idea - Zero-Friction Knowledge Capture",
        content: "Idea captured mid-walk: A wearable audio note-taker using Whisper on-device to record quick stream-of-consciousness thoughts without unlocking your phone. Auto-summarizes into actionable tasks and syncs with personal knowledge graphs.",
        sourceType: "voice",
        dateStr: "January 22, 2026",
        sourceUrl: ""
      },
      {
        title: "Urban Planning: Density, Walkability & 15-Minute Cities",
        content: "Urban density is not just high-rise buildings; it's about transit connectivity, mixed-use zoning, and pedestrianized streets. 15-minute city models reduce carbon emissions while drastically boosting local economic activity and community health.",
        sourceType: "clip",
        dateStr: "February 04, 2026",
        sourceUrl: "https://urbanplanningjournal.org/15-minute-cities"
      },
      {
        title: "Article Clip: Sleep, Circadian Rhythms & Memory Consolidation",
        content: "During non-REM deep sleep, the brain replays neural firing sequences experienced during waking hours, transferring short-term hippocampal memories into long-term neocortical storage. Disrupted sleep impairs procedural and declarative memory retention.",
        sourceType: "clip",
        dateStr: "February 12, 2026",
        sourceUrl: "https://neuroscience.org/sleep-memory-consolidation"
      },
      {
        title: "Distributed Systems: Kafka Event Streaming & Partitioning",
        content: "Kafka partitions enable horizontal scalability by distributing topic messages across multiple brokers. Consumer groups read from specific partitions to maintain order. Important for event-driven microservices architecture.",
        sourceType: "bookmark",
        dateStr: "March 01, 2026",
        sourceUrl: "https://kafka.apache.org/documentation/"
      },
      {
        title: "Book Notes: Atomic Habits by James Clear",
        content: "Four laws of habit building: 1. Make it obvious. 2. Make it attractive. 3. Make it easy. 4. Make it satisfying. You do not rise to the level of your goals; you fall to the level of your systems.",
        sourceType: "typing",
        dateStr: "March 10, 2026",
        sourceUrl: ""
      },
      {
        title: "PDF Upload: Cis-Regulatory Elements & ENCODE Registry Analysis",
        content: "Extracted from research paper PDF: Cis-regulatory elements (cCREs) govern gene expression by acting as promoters and enhancers. ENCODE Registry maps thousands of human cell-type specific TFBS motifs.",
        sourceType: "file",
        dateStr: "March 18, 2026",
        sourceUrl: "cCREs_paper_draft.pdf"
      },
      {
        title: "Email Forward: AI Engineering Newsletter - RAG & Vector DB Benchmarks",
        content: "Forwarded from newsletter@aiweekly.io: Evaluating Pinecone vs Chroma vs Qdrant for semantic search. Cosine similarity performs consistently well for short note snippets when combined with hybrid BM25 lexical re-ranking.",
        sourceType: "email",
        dateStr: "April 02, 2026",
        sourceUrl: "email:notes@brain.ai"
      }
    ];

    const topics = [
      "Artificial Intelligence", "Startup Ideas", "Urban Planning", "Habit & Productivity",
      "Sleep & Memory", "Distributed Systems", "Web & Software Engineering", "Books & Literature"
    ];

    const notes = [];
    const nlp = getNLP();

    // Generate 100 realistic variations covering all topics and source types
    for (let i = 1; i <= 100; i++) {
      const template = rawTemplates[(i - 1) % rawTemplates.length];
      const topicIndex = (i - 1) % topics.length;
      const topic = topics[topicIndex];
      const sourceTypes = ["typing", "voice", "clip", "bookmark", "file", "email"];
      const sourceType = sourceTypes[i % sourceTypes.length];

      const monthNames = ["January", "February", "March", "April", "May", "June"];
      const month = monthNames[i % monthNames.length];
      const day = (i % 28) + 1;
      const dateStr = `${month} ${day}, 2026`;

      const title = `${template.title} #${i}`;
      const content = `${template.content} (Ref item ${i}: Detailed notes on ${topic.toLowerCase()} discussing implementation strategies and practical takeaways).`;

      const entities = nlp.extractEntities(title + ' ' + content);
      const tags = nlp.classifyTopics(title, content);
      const summary = nlp.generateSummary(content);

      notes.push({
        id: `note-${Date.now()}-${i}`,
        title,
        content,
        summary,
        sourceType,
        sourceUrl: template.sourceUrl || (sourceType === 'clip' || sourceType === 'bookmark' ? `https://example.com/item-${i}` : ''),
        dateStr,
        timestamp: Date.now() - (100 - i) * 86400000,
        entities,
        tags,
        pinned: i <= 2 // Pin first 2 notes by default
      });
    }

    return notes;
  }

  const Store = {
    notes: [],
    dismissedIds: [],
    settings: {
      theme: 'royal-gold',
      privacyMode: true, // Default privacy mode on-device as requested in PDF page 7
      ttsEnabled: true,
      apiKey: ''
    },
    isOffline: false,
    offlineQueue: [],
    goals: [],
    listeners: [],

    /**
     * Safely gets item from localStorage or polyfill
     */
    _getItem: function (key) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      } else if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    },

    /**
     * Safely sets item in localStorage or polyfill
     */
    _setItem: function (key, value) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    },

    /**
     * Initializes the database store
     */
    init: function () {
      const savedNotes = this._getItem(STORAGE_KEY);
      if (savedNotes) {
        try {
          this.notes = JSON.parse(savedNotes);
        } catch (e) {
          console.error('Failed to parse local notes:', e);
          this.notes = generate100PreSeededNotes();
        }
      } else {
        this.notes = generate100PreSeededNotes();
        this.saveNotes();
      }

      const savedDismissed = this._getItem(DISMISSED_KEY);
      if (savedDismissed) {
        try { this.dismissedIds = JSON.parse(savedDismissed); } catch (e) { }
      }

      const savedSettings = this._getItem(SETTINGS_KEY);
      if (savedSettings) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
          if (this.settings.theme === 'sunflower-yellow' || this.settings.theme === 'gemini-light') {
            this.settings.theme = 'gemini-dark';
            this.saveSettings();
          }
        } catch (e) { }
      }

      const savedGoals = this._getItem(GOALS_KEY);
      if (savedGoals) {
        try {
          const parsed = JSON.parse(savedGoals);
          this.goals = (Array.isArray(parsed) && parsed.length > 0) ? parsed : generateDefaultGoals();
        } catch (e) { this.goals = generateDefaultGoals(); }
      } else {
        this.goals = generateDefaultGoals();
        this._setItem(GOALS_KEY, JSON.stringify(this.goals));
      }
    },

    saveNotes: function () {
      this._setItem(STORAGE_KEY, JSON.stringify(this.notes));
      this._setItem(DISMISSED_KEY, JSON.stringify(this.dismissedIds));
      this._setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      this._setItem(GOALS_KEY, JSON.stringify(this.goals));
      this.notifyListeners();
    },

    getNotes: function () {
      return this.notes;
    },

    getGoals: function () {
      if (!this.goals || this.goals.length === 0) {
        this.goals = generateDefaultGoals();
        this._setItem(GOALS_KEY, JSON.stringify(this.goals));
      }
      return this.goals || [];
    },

    addGoal: function ({ title, category = 'General', targetDate = '', description = '', linkedTags = [] }) {
      const newGoal = {
        id: `goal-${Date.now()}`,
        title: title || 'New Goal',
        category,
        targetDate: targetDate || '2026-12-31',
        progress: 0,
        targetCount: 10,
        linkedTags: Array.isArray(linkedTags) ? linkedTags : ['General'],
        description
      };
      this.goals.unshift(newGoal);
      this.saveNotes();
      return newGoal;
    },

    updateGoalProgress: function (id, progressVal) {
      const goal = this.goals.find(g => g.id === id);
      if (goal) {
        goal.progress = Math.min(100, Math.max(0, parseInt(progressVal, 10) || 0));
        this.saveNotes();
      }
    },

    deleteGoal: function (id) {
      this.goals = this.goals.filter(g => g.id !== id);
      this.saveNotes();
    },

    /**
     * Ingests a new note into the Second Brain
     * @param {Object} noteData {title, content, sourceType, sourceUrl}
     * @returns {Object} Newly created note
     */
    addNote: function ({ title, content, sourceType = 'typing', sourceUrl = '' }) {
      const nlp = getNLP();
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      const entities = nlp.extractEntities(title + ' ' + content);
      const tags = nlp.classifyTopics(title, content);
      const summary = nlp.generateSummary(content);

      const newNote = {
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: title || 'Untitled Note',
        content,
        summary,
        sourceType,
        sourceUrl,
        dateStr,
        timestamp: Date.now(),
        entities,
        tags,
        pinned: false
      };

      if (this.isOffline) {
        this.offlineQueue.push(newNote);
        this.emitSyncState('offline');
      } else {
        this.notes.unshift(newNote);
        this.saveNotes();
        this.emitSyncState('synced');
      }

      return newNote;
    },

    deleteNote: function (id) {
      this.notes = this.notes.filter(n => n.id !== id);
      this.saveNotes();
    },

    togglePin: function (id) {
      const note = this.notes.find(n => n.id === id);
      if (note) {
        note.pinned = !note.pinned;
        this.saveNotes();
      }
    },

    dismissResurfaced: function (id) {
      if (!this.dismissedIds.includes(id)) {
        this.dismissedIds.push(id);
        this.saveNotes();
      }
    },

    updateSettings: function (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.saveNotes();
    },

    setOffline: function (offlineState) {
      this.isOffline = offlineState;
      if (!offlineState && this.offlineQueue.length > 0) {
        // Sync offline items
        this.emitSyncState('syncing');
        setTimeout(() => {
          this.notes.unshift(...this.offlineQueue);
          this.offlineQueue = [];
          this.saveNotes();
          this.emitSyncState('synced');
        }, 1200);
      } else {
        this.emitSyncState(offlineState ? 'offline' : 'synced');
      }
    },

    emitSyncState: function (state) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('brain-sync-state', { detail: { state, queueLength: this.offlineQueue.length } });
        window.dispatchEvent(event);
      }
    },

    subscribe: function (fn) {
      this.listeners.push(fn);
    },

    notifyListeners: function () {
      this.listeners.forEach(fn => fn(this.notes));
    },

    // --- Chat Thread Persistence for ChatGPT / Gemini Interface ---
    getChatThreads: function () {
      const saved = this._getItem('second_brain_chat_threads_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) { }
      }
      // Initial default conversation thread
      const defaultThread = {
        id: 'thread-default',
        title: 'Welcome to Juno AI',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: 'msg-welcome',
            role: 'assistant',
            content: '### 👋 Welcome to Juno AI Studio!\n\nI am your **AI Thinking Partner & Grounded Research Assistant**, combining the visual excellence of **Google Gemini** and the multi-turn conversational power of **ChatGPT**.\n\n#### 🚀 Quick Start Features:\n- 🤖 **Multi-Model Switching**: Choose between Gemini 1.5 Flash/Pro, GPT-4o, or On-Device Local RAG Engine.\n- 🗝️ **Custom API Keys**: Plug in your Google Gemini or OpenAI API Key in **Settings** for unlimited cloud completions.\n- 📚 **Grounded RAG Knowledge**: Upload documents or query your 100+ saved notes with zero hallucination.\n- 🎙️ **Voice & Audio**: Speak out loud with speech recognition and read answers back with voice synthesis.\n\nHow can I assist your research today?',
            timestamp: Date.now(),
            provider: 'Juno On-Device Intelligence Engine'
          }
        ]
      };
      this._setItem('second_brain_chat_threads_v1', JSON.stringify([defaultThread]));
      return [defaultThread];
    },

    saveChatThread: function (thread) {
      if (!thread || !thread.id) return;
      const threads = this.getChatThreads();
      const idx = threads.findIndex(t => t.id === thread.id);
      if (idx >= 0) {
        threads[idx] = { ...threads[idx], ...thread, updatedAt: Date.now() };
      } else {
        threads.unshift({ ...thread, updatedAt: Date.now() });
      }
      this._setItem('second_brain_chat_threads_v1', JSON.stringify(threads));
    },

    deleteChatThread: function (id) {
      let threads = this.getChatThreads();
      threads = threads.filter(t => t.id !== id);
      this._setItem('second_brain_chat_threads_v1', JSON.stringify(threads));
    },

    getActiveThreadId: function () {
      return this._getItem('second_brain_active_thread_v1') || 'thread-default';
    },

    setActiveThreadId: function (id) {
      this._setItem('second_brain_active_thread_v1', id);
    }
  };

  // Auto-init
  Store.init();

  // Export module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Store;
  }
  if (typeof window !== 'undefined') window.Store = Store;
  if (typeof global !== 'undefined') global.Store = Store;
  if (typeof globalThis !== 'undefined') globalThis.Store = Store;

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
