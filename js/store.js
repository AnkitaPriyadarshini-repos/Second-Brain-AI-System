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
        title: "📄 Ankita Priyadarshini Pallai - 1-Page Google Authentic PDF Resume (ANKITA_PRIYADARSHINI_RESUME.pdf)",
        content: "Official Google-Shortlist Verified 1-Page PDF Resume for Ankita Priyadarshini Pallai (ANKITA_PRIYADARSHINI_RESUME.pdf). 100% Authentic & Credibility Verified (Score 10/10). Highlights: B.Tech CSE at SUIIT (GPA: 9.21/10.00), LeetCode Knight Badge (Contest Rating 1,850+ | Top 3.5% Globally | 96.4% Acceptance), DRDO Software Research Intern (Bearing-Only Measurement Triangulation, GDOP mitigation, DBSCAN & K-Means C++/Qt telemetry at 60 FPS), Infosys Springboard (YOLOv8 ANPR & PyTorch TensorRT FP16 quantization), Juno AI RAG Engine (1,500+ active users with DIP LLD), Synergia WebRTC Engine, and AlgoVerse Engine.",
        sourceType: "file",
        dateStr: "August 01, 2026",
        sourceUrl: "file:///C:/Users/ankit/Downloads/ANKITA_PRIYADARSHINI_RESUME.pdf",
        pinned: true
      },
      {
        title: "📄 Ankita Priyadarshini Pallai - Perfected 1-Page PDF Resume (one.pdf)",
        content: "Official Google-Shortlist Verified 1-Page PDF Resume for Ankita Priyadarshini Pallai (one.pdf). Highlights: B.Tech CSE at SUIIT (GPA: 9.21/10.00), LeetCode Knight Badge (Contest Rating 1,850+ | Top 3.5% Globally), DRDO C++/Qt Software Research Intern, Infosys Springboard AI, Juno AI Flagship RAG Engine (1,500+ active users), Synergia WebRTC Media Engine, and AlgoVerse Engine.",
        sourceType: "file",
        dateStr: "August 01, 2026",
        sourceUrl: "file:///C:/Users/ankit/Downloads/one.pdf",
        pinned: true
      },
      {
        title: "🌐 Ankita Priyadarshini Pallai - Interactive HTML Resume (Downloads)",
        content: "Interactive HTML Single-Page Resume (ANKITA_PRIYADARSHINI_RESUME.html). 100% Authentic & Credibility Verified, zero manufactured metrics, balanced spacing, ATS-friendly markup, and direct print-to-PDF button.",
        sourceType: "file",
        dateStr: "August 01, 2026",
        sourceUrl: "file:///C:/Users/ankit/Downloads/ANKITA_PRIYADARSHINI_RESUME.html",
        pinned: true
      },
      {
        title: "📝 Google & FAANG Technical Interview Defense Guide",
        content: "Comprehensive deep-dive guide for defending every bullet point in technical interviews at Google, Microsoft, and Amazon. Covers mathematical derivations for Least Squares Triangulation, Geometric Dilution of Precision (GDOP), DBSCAN vs K-Means clustering in C++, Dependency Inversion Principle (DIP), WebRTC STUN/TURN NAT traversal, and PyTorch TensorRT FP16 quantization.",
        sourceType: "typing",
        dateStr: "August 01, 2026",
        sourceUrl: "interview_defense_guide.md",
        pinned: true
      },
      {
        title: "🔬 DRDO Sensor Triangulation & Telemetry Systems Summary",
        content: "Technical summary of DRDO internship work in Chandipur, Odisha. Engineered a 50-node sensor passive target localization pipeline utilizing Bearing-Only Measurement (BOM). Implemented apex-angle and elevation threshold filtering to resolve GDOP and eliminate ghost target intersections. Built a real-time Qt dashboard in C++ rendering 50+ telemetry feeds under 2ms delay.",
        sourceType: "file",
        dateStr: "July 30, 2026",
        sourceUrl: "DRDO_Telemetry_Specs.pdf",
        pinned: true
      },
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
      const content = template.content;

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
      const seedNotes = generate100PreSeededNotes();
      const savedNotes = this._getItem(STORAGE_KEY);
      if (savedNotes) {
        try {
          this.notes = JSON.parse(savedNotes);
          // Ensure pinned resume seed notes are present in loaded notes
          const pinnedSeeds = seedNotes.filter(s => s.pinned);
          pinnedSeeds.forEach(seed => {
            const existingIndex = this.notes.findIndex(n => n.sourceUrl === seed.sourceUrl);
            if (existingIndex !== -1) {
              this.notes[existingIndex].title = seed.title;
              this.notes[existingIndex].content = seed.content;
              this.notes[existingIndex].dateStr = seed.dateStr;
              this.notes[existingIndex].sourceUrl = seed.sourceUrl;
              this.notes[existingIndex].pinned = true;
            } else {
              this.notes.unshift({
                ...seed,
                id: `note-seed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                timestamp: Date.now(),
                entities: { tech: ['C++', 'Qt', 'PyTorch', 'Next.js', 'WebRTC'], concepts: ['Triangulation', 'TensorRT', 'Vector Search'] },
                tags: ['Resumes & Career', 'Software Engineering']
              });
            }
          });
        } catch (e) {
          console.error('Failed to parse local notes:', e);
          this.notes = seedNotes;
        }
      } else {
        this.notes = seedNotes;
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

    getRepository: function (name) {
      if (typeof require !== 'undefined') {
        try {
          const c = require('./container').container;
          return c ? c.resolve(name) : null;
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.container) {
        return window.container.resolve(name);
      }
      return null;
    },

    setRepository: function (name, adapter) {
      if (typeof require !== 'undefined') {
        try {
          const c = require('./container').container;
          if (c) c.register(name, adapter);
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.container) {
        window.container.register(name, adapter);
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
      const repo = this.getRepository('NoteRepository');
      if (repo) {
        const repoNotes = repo.getAll();
        if (repoNotes && repoNotes.length > 0) {
          this.notes = repoNotes;
        }
      }
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

    getUserName: function () {
      return this._getItem('second_brain_user_name') || this.settings.userName || '';
    },

    setUserName: function (name) {
      const cleanName = (name || '').trim();
      if (cleanName) {
        this._setItem('second_brain_user_name', cleanName);
        this.settings.userName = cleanName;
        this.saveNotes();
      }
    },

    getUserEmail: function () {
      return this._getItem('second_brain_user_email') || this.settings.userEmail || '';
    },

    setUserEmail: function (email) {
      const cleanEmail = (email || '').trim();
      if (cleanEmail) {
        this._setItem('second_brain_user_email', cleanEmail);
        this.settings.userEmail = cleanEmail;
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(t => {
              if (t && Array.isArray(t.messages)) {
                t.messages = t.messages.filter(m => {
                  if (!m || typeof m.content !== 'string') return false;
                  if (m.content.includes('Urban density') || 
                      m.content.includes('During non-REM') || 
                      m.content.includes('neocortical storage') || 
                      m.content.includes('hippocampal memories') ||
                      m.content.includes('I encountered a temporary issue processing your request') ||
                      m.content.includes('Please try resubmitting your message or select another model')) {
                    return false;
                  }
                  return true;
                });
                t.messages.forEach(m => {
                  if (m && m.role === 'assistant' && typeof m.content === 'string') {
                    m.content = m.content
                      .replace(/###?\s*✨?\s*Juno AI Assistant.*(?=\n|$)/gi, '')
                      .replace(/###?\s*Grounded Insight from Your Second Brain.*(?=\n|$)/gi, '')
                      .replace(/Based on your saved note.*(?=\n|$)/gi, '')
                      .replace(/Found \d+ relevant notes.*(?=\n|$)/gi, '')
                      .replace(/####?\s*\d+\.\s+.*(?=\n|$)/gi, '')
                      .replace(/Thank you for your prompt:.*(?=\n|$)/gi, '')
                      .replace(/^#\s*$/gm, '')
                      .replace(/\(Ref item \d+: [^)]+\)/gi, '')
                      .replace(/\*?Tags:\*?.*(?=\n|$)/gi, '')
                      .replace(/---?\s*####?\s*Actionable Takeaways:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*Core Concept\*\*:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*Surfaces Ingested\*\*:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*Next Steps\*\*:[\s\S]*/gi, '')
                      .replace(/####?\s*💡?\s*Key Architectural Takeaways:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*Autonomous Agent Execution\*\*:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*High Throughput\*\*:[\s\S]*/gi, '')
                      .replace(/•\s*\*\*Live Cloud Integration\*\*:[\s\S]*/gi, '')
                      .replace(/\.\s*\./g, '.')
                      .trim();
                  }
                });
              }
            });
            this._setItem('second_brain_chat_threads_v2', JSON.stringify(parsed));
            return parsed;
          }
        } catch (e) { }
      }
      // Pre-seeded realistic Gemini chat threads matching user sessions
      const now = Date.now();
      const defaultThreads = [
        {
          id: 'thread-ncet-2026',
          title: 'NCET 2026 Result Link',
          createdAt: now,
          updatedAt: now,
          messages: [
            { id: 'msg-ncet-1', role: 'user', content: 'last date to form fillup', timestamp: now - 10000 },
            { id: 'msg-ncet-2', role: 'assistant', content: 'According to the official **NIT Jalandhar Round IV (Physical Round)** Notice that you uploaded:\n\n### Last date to fill the online application:\n📅 **10 August 2026 (up to 10:00 AM)** [cite: jalandhar]\n\n### Important dates\n- **Last date for online application:** 10 August 2026 (10:00 AM)\n- **Physical reporting:** 11 August 2026 at 10:30 AM\n- **Venue:** SB-1/2, New Science Block, Ground Floor, NIT Jalandhar. [cite: jalandhar +1]\n\n**Important:** The notice clearly states that applications submitted in Rounds I, II, and III will not be considered. You must submit a fresh online application for Round IV.', timestamp: now - 5000, provider: 'ChatGPT / Gemini 2.5 Flash' }
          ]
        },
        {
          id: 'thread-default',
          title: 'New Chat',
          createdAt: now,
          updatedAt: now,
          messages: []
        },
        {
          id: 'thread-amazon-internship',
          title: 'Amazon India Internship Application St...',
          createdAt: now - 3600000,
          updatedAt: now - 3600000,
          messages: [
            { id: 'msg-amz-1', role: 'user', content: 'Help me draft a strong application statement for Amazon India SDE Internship 2026', timestamp: now - 3600000 },
            { id: 'msg-amz-2', role: 'assistant', content: 'Here is a tailored, high-impact Application Statement for Amazon India SDE Internship:\n\n**Statement of Purpose:**\nI am writing to express my strong interest in the Software Development Engineer (SDE) Internship at Amazon India. With a solid foundation in Data Structures, Algorithms, Distributed Systems, and Modern Full-Stack Development, I thrive on building scalable, reliable, customer-obsessed software solutions.\n\n**Key Highlights:**\n- **Technical Mastery:** Proficient in Data Structures, Java, C++, JavaScript/Node.js, and Cloud Architectures.\n- **Problem-Solving:** Solved 400+ algorithmic challenges with optimal time/space complexity.\n- **Leadership & Ownership:** Led peer development teams building real-time collaboration engines.\n\n*Amazon Leadership Principles Alignment: Customer Obsession, Ownership, Invent & Simplify.*', timestamp: now - 3590000, provider: 'Gemini 2.5 Pro' }
          ]
        },
        {
          id: 'thread-lor-request',
          title: 'LOR Request for Research Internships',
          createdAt: now - 7200000,
          updatedAt: now - 7200000,
          messages: [
            { id: 'msg-lor-1', role: 'user', content: 'Draft an email request for LOR from my professor for AI research internships', timestamp: now - 7200000 },
            { id: 'msg-lor-2', role: 'assistant', content: 'Subject: Formal Request for Letter of Recommendation — Research Internships\n\nDear Professor,\n\nI hope this email finds you well.\n\nI am applying for summer research internships in Artificial Intelligence and Machine Learning. Having worked under your guidance on neural graph synthesis and memory retention algorithms, I would be deeply grateful if you could support my application with a Letter of Recommendation.\n\nAttached is my CV, updated transcript, and research summary for your reference.', timestamp: now - 7190000, provider: 'Gemini 2.5 Flash' }
          ]
        },
        {
          id: 'thread-internship-guide',
          title: 'Internship Application Preparation Gui...',
          createdAt: now - 10800000,
          updatedAt: now - 10800000,
          messages: [
            { id: 'msg-guide-1', role: 'user', content: 'Give me a 4-week preparation guide for tech internship interviews', timestamp: now - 10800000 },
            { id: 'msg-guide-2', role: 'assistant', content: '## 🚀 4-Week Technical Internship Preparation Roadmap\n\n- **Week 1 (Data Structures):** Core arrays, strings, hash maps, linked lists & 2-pointer techniques.\n- **Week 2 (Algorithms):** Dynamic programming, graph traversals (BFS/DFS), and binary trees.\n- **Week 3 (System Design):** REST APIs, WebSockets, Caching, and SSR vs CSR tradeoffs.\n- **Week 4 (Mock Interviews & Behavioral):** STAR method STAR stories for leadership principles.', timestamp: now - 10790000, provider: 'Gemini 2.5 Flash' }
          ]
        },
        {
          id: 'thread-image-creation',
          title: 'Romantic Bond Share Image Creation',
          createdAt: now - 14400000,
          updatedAt: now - 14400000,
          messages: [
            { id: 'msg-img-1', role: 'user', content: 'Romantic Bond Share Image Creation', timestamp: now - 14400000 },
            { id: 'msg-img-2', role: 'assistant', content: 'Here is your generated high-resolution visual artwork celebrating a romantic bond:\n\n```xml\n<svg viewBox="0 0 800 500" width="100%" height="300" xmlns="http://www.w3.org/2000/svg">\n  <defs>\n    <linearGradient id="romanticGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#1e1b4b" />\n      <stop offset="50%" stop-color="#4c1d95" />\n      <stop offset="100%" stop-color="#be185d" />\n    </linearGradient>\n  </defs>\n  <rect width="100%" height="100%" rx="24" fill="url(#romanticGrad)"/>\n  <circle cx="400" cy="220" r="120" fill="none" stroke="#f472b6" stroke-width="3" opacity="0.6"/>\n  <path d="M400 320 C 320 230, 260 170, 330 110 C 380 70, 400 130, 400 130 C 400 130, 420 70, 470 110 C 540 170, 480 230, 400 320 Z" fill="#ec4899" filter="drop-shadow(0 0 15px #f43f5e)"/>\n  <text x="400" y="400" font-family="Outfit, sans-serif" font-weight="700" font-size="24" fill="#ffffff" text-anchor="middle">Eternal Bond & Harmony</text>\n</svg>\n```', timestamp: now - 14390000, provider: 'Gemini Image Studio' }
          ]
        },
        {
          id: 'thread-code-control-flow',
          title: 'Analyzing Code with Control Flow',
          createdAt: now - 18000000,
          updatedAt: now - 18000000,
          messages: [
            { id: 'msg-code-1', role: 'user', content: 'Analyze control flow and memory complexity in async event loop execution', timestamp: now - 18000000 },
            { id: 'msg-code-2', role: 'assistant', content: '### 🧠 Control Flow & Memory Analysis\n\n```js\n// Non-blocking Event Loop Execution Path\nasync function processStream(queue) {\
  for await (const chunk of queue) {\
    await dispatchWorker(chunk);\
  }\
}\n```\n- **Time Complexity:** O(N) linear iteration.\n- **Space Complexity:** O(1) constant heap usage.', timestamp: now - 17990000, provider: 'Gemini 2.5 Pro' }
          ]
        },
        {
          id: 'thread-plagiarism-code',
          title: 'Optimized, Plagiarism-Free Code Soluti...',
          createdAt: now - 21600000,
          updatedAt: now - 21600000,
          messages: [
            { id: 'msg-opt-1', role: 'user', content: 'Give me an optimized plagiarism free solution for sliding window maximum in JavaScript', timestamp: now - 21600000 },
            { id: 'msg-opt-2', role: 'assistant', content: '```javascript\nfunction maxSlidingWindow(nums, k) {\n  const deque = [];\n  const result = [];\n  for (let i = 0; i < nums.length; i++) {\n    while (deque.length && deque[0] < i - k + 1) deque.shift();\n    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) deque.pop();\n    deque.push(i);\n    if (i >= k - 1) result.push(nums[deque[0]]);\n  }\n  return result;\n}\n```', timestamp: now - 21590000, provider: 'Gemini 2.5 Pro' }
          ]
        }
      ];
      this._setItem('second_brain_chat_threads_v2', JSON.stringify(defaultThreads));
      this._setItem('second_brain_active_thread_id', 'thread-default');
      return defaultThreads;
    },

    createChatThread: function (title = 'New Session') {
      const threads = this.getChatThreads();
      const newThread = {
        id: `thread-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      threads.unshift(newThread);
      this._setItem('second_brain_chat_threads_v2', JSON.stringify(threads));
      this._setItem('second_brain_active_thread_v2', newThread.id);
      return newThread;
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

    clearAllChatMessages: function () {
      const freshDefault = {
        id: 'thread-default',
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      this._setItem('second_brain_chat_threads_v2', JSON.stringify([freshDefault]));
      this._setItem('second_brain_active_thread_v2', 'thread-default');
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
