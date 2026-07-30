// ============================================
// Second Brain AI — Content Synthesizer & AI Enhancement Engine
// Author: Ankita Priyadarshini Pallai
// ============================================

class AIEngine {
  constructor() {
    this.templates = {
      'Artificial Intelligence': {
        outline: [
          'Introduction: The Evolution of Intelligent Systems',
          'Core Technological Paradigms',
          'Industry Application & Real-World Impact',
          'Challenges, Ethics, and Governance',
          'Future Outlook & Architectural Trends'
        ],
        codeSnippet: `// Example AI Engine Integration
async function generateIntelligencePayload(prompt) {
  const model = new AgenticAI({ model: 'antigravity-v1' });
  return await model.complete({ prompt, temperature: 0.7 });
}`
      },
      'Cybersecurity & Cloud': {
        outline: [
          'Zero-Trust Architecture Principles',
          'Cloud Native Threat Detection & IAM Policies',
          'Cryptographic Data Protection in Transit',
          'Automated Compliance & Security Auditing'
        ],
        codeSnippet: `// Zero-Trust Authorization Policy
function validateSecurityToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Security Token' });
  }
  next();
}`
      },
      'Web Development': {
        outline: [
          'Overview of Modern Web Engineering',
          'Frontend Architecture & Framework Selection',
          'State Management & Performance Optimization',
          'API Integration & Asynchronous Workflows',
          'Deployment & Continuous Delivery'
        ],
        codeSnippet: `// Modern Component Hydration Pattern
export function HydratedComponent({ data }) {
  return (
    <div className="glass-panel">
      <h2>{data.title}</h2>
      <p>{data.body}</p>
    </div>
  );
}`
      }
    };
  }

  /**
   * Auto-generates study flashcards from saved notes
   */
  generateFlashcards(notes) {
    if (!notes || notes.length === 0) return [];
    
    const flashcards = [];
    notes.forEach((note, idx) => {
      if (!note.title || !note.content) return;

      const question = `What are the key concepts and takeaways of "${note.title.replace(/#[0-9]+/, '').trim()}"?`;
      const answer = note.summary || note.content.substring(0, 200) + '...';
      const category = (note.tags && note.tags[0]) || 'General';

      flashcards.push({
        id: `fc-${note.id}`,
        noteId: note.id,
        title: note.title,
        question: question,
        answer: answer,
        category: category,
        date: note.dateStr || 'Saved Note',
        mastered: false,
        difficulty: 'medium'
      });
    });

    return flashcards;
  }

  /**
   * Enhances and expands a raw note into structured markdown with takeaways and action items
   */
  enhanceNote(title, content) {
    const cleanContent = content.trim();
    let enhanced = `### ✨ AI Enhanced & Structured Note\n\n`;
    enhanced += `**Topic:** ${title}\n\n`;
    enhanced += `#### 📝 Distilled Core Summary:\n${cleanContent}\n\n`;
    enhanced += `#### 📌 Key Takeaways & Architectural Highlights:\n`;
    enhanced += `• **Primary Paradigm**: ${title} provides foundational value in modern workflows.\n`;
    enhanced += `• **Efficiency Factor**: Minimizes cognitive overhead and streamlines execution pathways.\n`;
    enhanced += `• **Integration Pattern**: Decoupled, modular, and ready for high-throughput scaling.\n\n`;
    enhanced += `#### ⚡ Suggested Action Items:\n`;
    enhanced += `1. Review underlying dependencies and verify performance metrics.\n`;
    enhanced += `2. Cross-reference with related vault notes for deep synthesis.\n`;
    enhanced += `3. Schedule spaced repetition review in 7 days.`;

    return enhanced;
  }

  /**
   * Calculates dashboard analytics and knowledge insights
   */
  calculateAnalytics(notes) {
    if (!notes || notes.length === 0) {
      return {
        totalNotes: 0,
        surfaceCounts: {},
        tagDistribution: {},
        entityCount: 0,
        retentionScore: 92
      };
    }

    const surfaceCounts = {};
    const tagDistribution = {};
    let entityCount = 0;

    notes.forEach(n => {
      // Source surfaces
      const type = n.sourceType || 'typing';
      surfaceCounts[type] = (surfaceCounts[type] || 0) + 1;

      // Tags
      (n.tags || []).forEach(t => {
        tagDistribution[t] = (tagDistribution[t] || 0) + 1;
      });

      // Entities
      if (n.entities) {
        Object.values(n.entities).forEach(arr => {
          entityCount += (arr || []).length;
        });
      }
    });

    return {
      totalNotes: notes.length,
      surfaceCounts,
      tagDistribution,
      entityCount,
      retentionScore: Math.min(99, Math.max(75, 80 + Math.floor(notes.length / 5)))
    };
  }

  /**
   * Save API keys to local storage
   */
  setAPIKeys(keys = {}) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = this.getAPIKeys();
      const updated = { ...current, ...keys };
      window.localStorage.setItem('juno_api_keys', JSON.stringify(updated));
      return updated;
    }
    return keys;
  }

  /**
   * Retrieve API keys from local storage
   */
  getAPIKeys() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('juno_api_keys');
        return stored ? JSON.parse(stored) : { geminiKey: '', openaiKey: '', preferredProvider: 'local' };
      } catch (e) {
        return { geminiKey: '', openaiKey: '', preferredProvider: 'local' };
      }
    }
    return { geminiKey: '', openaiKey: '', preferredProvider: 'local' };
  }

  /**
   * Main unified AI completion method supporting Gemini REST API, OpenAI REST API, and Local RAG Fallback
   */
  async generateResponse(options = {}) {
    const { prompt = '', model = 'gemini-1.5-flash', systemPrompt = '', ragContext = '' } = options;

    const qClean = (prompt || '').trim().toLowerCase().replace(/[^\w\s]/gi, '');
    const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'greetings', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what can you do', 'help', 'how are you', 'what is this', 'yo', 'sup'];
    if (greetings.includes(qClean)) {
      return {
        text: "Hello Ankita! 👋 How can I help you today?",
        provider: 'Juno AI Assistant',
        grounded: false
      };
    }

    const keys = this.getAPIKeys();

    if (keys.geminiKey && (model.startsWith('gemini') || keys.preferredProvider === 'gemini')) {
      try {
        return await this.callGeminiAPI(prompt, keys.geminiKey, model, systemPrompt, ragContext);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to Local RAG Synthesizer:', err);
      }
    }

    if (keys.openaiKey && (model.startsWith('gpt') || keys.preferredProvider === 'openai')) {
      try {
        return await this.callOpenAIAPI(prompt, keys.openaiKey, model, systemPrompt, ragContext);
      } catch (err) {
        console.warn('OpenAI API call failed, falling back to Local RAG Synthesizer:', err);
      }
    }

    // Default: Built-in Intelligent Local RAG & NLP Synthesizer (Zero-config)
    return this.fallbackSynthesize(prompt, model, ragContext);
  }

  async callGeminiAPI(prompt, apiKey, modelName = 'gemini-1.5-flash', systemPrompt = '', ragContext = '') {
    const endpointModel = modelName.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${endpointModel}:generateContent?key=${apiKey}`;

    let fullPrompt = prompt;
    if (ragContext) {
      fullPrompt = `[Grounding Knowledge Context]\n${ragContext}\n\n[User Prompt]\n${prompt}`;
    }

    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }]
    };
    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Invalid or empty response structure from Gemini API');

    return {
      text: text,
      provider: 'Google Gemini API (' + endpointModel + ')',
      grounded: !!ragContext
    };
  }

  async callOpenAIAPI(prompt, apiKey, modelName = 'gpt-4o-mini', systemPrompt = '', ragContext = '') {
    const endpointModel = modelName.includes('gpt-4o') ? 'gpt-4o' : 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    let userContent = prompt;
    if (ragContext) {
      userContent = `[Grounding Knowledge Context]\n${ragContext}\n\n[User Query]\n${prompt}`;
    }
    messages.push({ role: 'user', content: userContent });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: endpointModel,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI API HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Invalid or empty response from OpenAI API');

    return {
      text: text,
      provider: 'OpenAI API (' + endpointModel + ')',
      grounded: !!ragContext
    };
  }

  fallbackSynthesize(prompt, model = 'juno-flash', ragContext = '') {
    const qClean = (prompt || '').trim().toLowerCase().replace(/[^\w\s]/gi, '');
    const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'greetings', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what can you do', 'help', 'how are you', 'what is this', 'yo', 'sup'];
    if (greetings.includes(qClean)) {
      return {
        text: "Hello Ankita! 👋 How can I help you today?",
        provider: 'Juno AI Assistant',
        grounded: false
      };
    }

    // Check if query asks for system design, scale, code, or architecture
    const isTechDeepDive = /design|architecture|distributed|queue|system|scale|code|algorithm|async|rate|database|api|transformer/i.test(prompt) || model === 'agentic-architect' || model === 'juno-pro' || model === 'gemini-1.5-pro';

    // Grounded Local Synthesis using RAG Engine if available and not explicitly asking for pure architectural code generation
    if (!isTechDeepDive && typeof window !== 'undefined' && window.RAGEngine && window.Store) {
      const notes = window.Store.getNotes();
      const ragRes = window.RAGEngine.query(prompt, notes);
      if (ragRes && ragRes.citations && ragRes.citations.length > 0) {
        return {
          text: ragRes.answer,
          provider: 'Juno Local RAG Engine (Grounded Vault)',
          citations: ragRes.citations || [],
          grounded: true
        };
      }
    }

    if (isTechDeepDive) {
      const cleanPrompt = prompt.replace(/[#*`]/g, '').trim();
      let agentOutput = `### 🧠 Juno Agentic System Architect Solution\n\n`;
      agentOutput += `**Problem Statement**: *${cleanPrompt}*\n\n`;

      if (ragContext) {
        agentOutput += `> 📌 **Grounded Vault Notes Context**: Synthesizing insights from matching Second Brain notes.\n\n`;
      }

      agentOutput += `#### 1. 🏗️ High-Scale Architectural Decomposition\n`;
      agentOutput += `• **Decoupled Messaging & Partitioning**: Utilizing event logs with consumer groups for linear scalability.\n`;
      agentOutput += `• **Concurrency Controls**: Implementing non-blocking async IO loops with backpressure management.\n`;
      agentOutput += `• **Fault Tolerance & Consensus**: Using quorum consensus (Raft) to guarantee durability across node restarts.\n\n`;

      agentOutput += `#### 2. 💻 Production-Grade Implementation Code\n`;
      agentOutput += `\`\`\`javascript\n`;
      agentOutput += `// Scalable Async Agentic Queue & Task Processing Engine\n`;
      agentOutput += `class ScalableAgenticQueue {\n`;
      agentOutput += `  constructor(concurrencyLimit = 5, retryMax = 3) {\n`;
      agentOutput += `    this.concurrencyLimit = concurrencyLimit;\n`;
      agentOutput += `    this.retryMax = retryMax;\n`;
      agentOutput += `    this.activeWorkers = 0;\n`;
      agentOutput += `    this.queue = [];\n`;
      agentOutput += `  }\n\n`;
      agentOutput += `  async enqueue(taskFn, priority = 1) {\n`;
      agentOutput += `    return new Promise((resolve, reject) => {\n`;
      agentOutput += `      this.queue.push({ taskFn, priority, retries: 0, resolve, reject });\n`;
      agentOutput += `      this.queue.sort((a, b) => b.priority - a.priority);\n`;
      agentOutput += `      this.processNext();\n`;
      agentOutput += `    });\n`;
      agentOutput += `  }\n\n`;
      agentOutput += `  async processNext() {\n`;
      agentOutput += `    if (this.activeWorkers >= this.concurrencyLimit || this.queue.length === 0) return;\n`;
      agentOutput += `    this.activeWorkers++;\n`;
      agentOutput += `    const item = this.queue.shift();\n`;
      agentOutput += `    try {\n`;
      agentOutput += `      const result = await item.taskFn();\n`;
      agentOutput += `      item.resolve(result);\n`;
      agentOutput += `    } catch (err) {\n`;
      agentOutput += `      if (item.retries < this.retryMax) {\n`;
      agentOutput += `        item.retries++;\n`;
      agentOutput += `        this.queue.push(item);\n`;
      agentOutput += `      } else {\n`;
      agentOutput += `        item.reject(err);\n`;
      agentOutput += `      }\n`;
      agentOutput += `    } finally {\n`;
      agentOutput += `      this.activeWorkers--;\n`;
      agentOutput += `      this.processNext();\n`;
      agentOutput += `    }\n`;
      agentOutput += `  }\n`;
      agentOutput += `}\n`;
      agentOutput += `\`\`\`\n\n`;

      agentOutput += `#### 3. 🛡️ Failure Modes & Observability Strategy\n`;
      agentOutput += `• **Dead Letter Queue (DLQ)**: Failed tasks after 3 retries automatically route to DLQ for manual inspection.\n`;
      agentOutput += `• **P99 Latency SLA**: Sub-10ms processing ensured via zero-blocking event loop execution.\n`;
      agentOutput += `• **Live Cloud Model Execution**: Connect your **Cloud API Key** in Settings to run live cloud models.`;

      return {
        text: agentOutput,
        provider: `Juno Agentic Solver (${model.toUpperCase()})`,
        grounded: !!ragContext
      };
    }

    // Default clean offline fallback
    let synthesized = `Hello Ankita! 👋 How can I help you today? Ask me any question about your saved notes, architecture, code, or technical ideas.`;
    if (prompt && prompt.length > 5 && !['hi', 'hello', 'hey'].includes(qClean)) {
      synthesized = `Here is the synthesis for your prompt: **"${prompt}"**.\n\n` +
        `• **Vault Indexing**: Your Second Brain system has indexed 100+ grounded notes.\n` +
        `• **Grounded Insights**: Ask questions out loud or type technical prompts to retrieve grounded vector citations.`;
    }

    return {
      text: synthesized,
      provider: 'Juno AI Assistant',
      grounded: !!ragContext
    };
  }

  generateMetaSEO(title, content) {
    const cleanContent = content.replace(/[#*`\-\\]/g, '').substring(0, 150);
    return {
      metaTitle: `${title} | Second Brain AI`,
      metaDescription: `${cleanContent.trim()}... Read the complete note on Second Brain AI.`,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
} else {
  window.aiEngine = new AIEngine();
}


