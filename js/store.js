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
      // World's Top 10 AI Infrastructure & Data Center Megaprojects
      {
        title: "Global AI Infrastructure #1: xAI Memphis Colossus Supercluster (Tennessee, USA)",
        content: "Rank #1 Global AI Infrastructure: Elon Musk's xAI Colossus supercluster in Memphis, Tennessee. Scale: 100,000 to 200,000 Nvidia H100/H200 GPUs. Power Capacity: 150MW to 300MW dedicated liquid-cooled facility. Hardware: Direct-to-chip liquid cooling manifolds, 400Gbps RoCE Ethernet. Built in under 122 days to train xAI Grok-3 foundation models.",
        sourceType: "typing",
        dateStr: "July 15, 2026",
        sourceUrl: "https://x.ai/colossus-infrastructure"
      },
      {
        title: "Global AI Infrastructure #2: Microsoft & OpenAI Stargate AI Supercomputer (USA)",
        content: "Rank #2 Global AI Infrastructure: Microsoft & OpenAI Stargate Megaproject. Scale: $100 Billion supercomputer deployment with millions of Nvidia GB200 Blackwell & Maia 100 accelerators. Power Capacity: 5 Gigawatts (5,000 Megawatts) nuclear & clean energy. Hardware: Liquid-cooled GB200 NVL72 chassis & Small Modular Nuclear Reactors (SMRs).",
        sourceType: "typing",
        dateStr: "July 16, 2026",
        sourceUrl: "https://microsoft.com/stargate-ai-datacenter"
      },
      {
        title: "Global AI Infrastructure #3: Google Council Bluffs & Fairview TPU Pod Hub (Iowa/Oregon, USA)",
        content: "Rank #3 Global AI Infrastructure: Google Alphabet Council Bluffs & Fairview Hub. Scale: Over 1 Million Custom TPU v5p & Trillium AI Pods. Power Capacity: 2.4 Gigawatts (2,400 Megawatts) clean-powered campus. Hardware: 3D torus TPU topologies with 100% Optical Circuit Switches (OCS) for zero-packet-loss Gemini 1.5 & Gemini 2.0 training.",
        sourceType: "typing",
        dateStr: "July 17, 2026",
        sourceUrl: "https://cloud.google.com/tpu-infrastructure"
      },
      {
        title: "Global AI Infrastructure #4: Meta Llama 3 Infrastructure - Prometheus & Hyperion (USA)",
        content: "Rank #4 Global AI Infrastructure: Meta AI Megaclusters (Mark Zuckerberg). Scale: 350,000 Nvidia H100 GPUs (scaling to 600,000 H100 equivalents). Power Capacity: 600 Megawatts (600MW) across 4 data center sites. Hardware: Custom Meta Grand Teton hardware chassis, 400Gbps RoCE v2, PyTorch distributed cluster orchestration for Llama 3 & Llama 4.",
        sourceType: "typing",
        dateStr: "July 18, 2026",
        sourceUrl: "https://ai.meta.com/infrastructure"
      },
      {
        title: "Global AI Infrastructure #5: Amazon AWS Project Rainier & Indiana Campus (Indiana, USA)",
        content: "Rank #5 Global AI Infrastructure: AWS Project Rainier AI Hub. Scale: $11 Billion campus featuring custom Trainium2 & Inferentia2 chips + Nvidia GB200 NVL72 racks. Power Capacity: 1.2 Gigawatts (1,200 Megawatts). Hardware: Direct-to-chip liquid cooling loops powering Anthropic Claude 3.5 & AWS Bedrock model synthesis.",
        sourceType: "typing",
        dateStr: "July 19, 2026",
        sourceUrl: "https://aws.amazon.com/trainium2-rainier"
      },
      {
        title: "Global AI Infrastructure #6: Oracle OCI 131k GPU Supercluster (Abilene, Texas, USA)",
        content: "Rank #6 Global AI Infrastructure: Oracle Cloud Infrastructure (OCI) Supercluster Hub. Scale: 131,072 Nvidia Blackwell GB200 & H200 GPUs in a single fabric. Power Capacity: 1.2 Gigawatts (1,200 Megawatts) liquid-cooled infrastructure. Hardware: OCI RDMA over Converged Ethernet (RoCE) networking powering OpenAI enterprise workloads.",
        sourceType: "typing",
        dateStr: "July 20, 2026",
        sourceUrl: "https://oracle.com/cloud/oci-ai-supercomputer"
      },
      {
        title: "Global AI Infrastructure #7: Saudi Arabia HUMAIN & Alat AI Megacity Hub (Riyadh, KSA)",
        content: "Rank #7 Global AI Infrastructure: Saudi Sovereign AI Megacity Project (PIF / Alat). Scale: $100 Billion sovereign compute initiative. Power Capacity: 500 Megawatts initial, scaling to 2 Gigawatts (2,000MW) solar + nuclear energy. Hardware: Nvidia GH200 Grace Hopper superchips powering Arabic LLMs and global AI research.",
        sourceType: "typing",
        dateStr: "July 21, 2026",
        sourceUrl: "https://alat.sa/humain-ai-infrastructure"
      },
      {
        title: "Global AI Infrastructure #8: UAE G42 & Microsoft Stargate Abu Dhabi Hub (Abu Dhabi, UAE)",
        content: "Rank #8 Global AI Infrastructure: G42 & Microsoft Stargate Abu Dhabi AI Center. Scale: $15 Billion sovereign AI cluster. Power Capacity: 1 Gigawatt (1,000 Megawatts) clean energy from Barakah Nuclear Plant. Hardware: High-density Microsoft Azure AI racks powering enterprise AI vaults and regional LLM models.",
        sourceType: "typing",
        dateStr: "July 22, 2026",
        sourceUrl: "https://g42.ai/abudhabi-stargate"
      },
      {
        title: "Global AI Infrastructure #9: Tesla Cortex AI Supercomputer (Giga Texas, USA)",
        content: "Rank #9 Global AI Infrastructure: Elon Musk / Tesla Cortex Supercomputer. Scale: 50,000 Nvidia H100 GPUs + 20,000 Tesla Dojo D1 custom AI processors. Power Capacity: 130 Megawatts (130MW) liquid-cooled facility inside Giga Texas. Hardware: High-density liquid cooling manifolds powering Full Self-Driving (FSD V13) vision models and Optimus humanoid robot neural networks.",
        sourceType: "typing",
        dateStr: "July 23, 2026",
        sourceUrl: "https://tesla.com/cortex-ai-supercomputer"
      },
      {
        title: "Global AI Infrastructure #10: Yotta Shakti-Cloud AI Megacenter (Navi Mumbai, India)",
        content: "Rank #10 Global AI Infrastructure: Yotta Shakti-Cloud Supercomputing Center. Scale: 16,000 to 24,000 Nvidia H100 & GH200 GPUs. Power Capacity: 250 Megawatts (250MW) green NM1 facility. Hardware: Asia-Pacific's largest sovereign AI data center offering enterprise LLM training, Indian AI startups, and AI research infrastructure.",
        sourceType: "typing",
        dateStr: "July 24, 2026",
        sourceUrl: "https://yotta.com/shakti-cloud-ai"
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
          if (!this.settings.theme || ['gemini-dark', 'obsidian'].includes(this.settings.theme)) {
            this.settings.theme = 'gold-glassmorphism';
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

    getChatThreads: function () {
      const saved = this._getItem('second_brain_chat_threads_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) { }
      }
      // Initial clean default conversation thread (Starts on clean main hero screen)
      const defaultThread = {
        id: 'thread-default',
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      this._setItem('second_brain_chat_threads_v2', JSON.stringify([defaultThread]));
      this._setItem('second_brain_active_thread_id', 'thread-default');
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
      this._setItem('second_brain_chat_threads_v2', JSON.stringify(threads));
    },

    deleteChatThread: function (id) {
      let threads = this.getChatThreads();
      threads = threads.filter(t => t.id !== id);
      this._setItem('second_brain_chat_threads_v2', JSON.stringify(threads));
    },

    getActiveThreadId: function () {
      return this._getItem('second_brain_active_thread_v2') || 'thread-default';
    },

    setActiveThreadId: function (id) {
      this._setItem('second_brain_active_thread_v2', id);
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
