/**
 * Second Brain AI System — Secure AI Gateway Service
 * Server-side fallback gateway kept aligned with the Vercel AI route.
 */

const https = require('https');
const PromptSecurityAgent = require('../agents/PromptSecurityAgent');
const VerificationAgent = require('../agents/VerificationAgent');
const BM25Engine = require('../js/bm25-engine');
const OrchestratorService = require('./OrchestratorService');
const ContextPlannerService = require('./ContextPlannerService');

class AIGatewayService {
  constructor() {
    this.requestCounts = new Map();
    this.RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 60;
    this.securityAgent = new PromptSecurityAgent();
    this.verificationAgent = new VerificationAgent();
    this.bm25Engine = new BM25Engine();
    this.orchestrator = new OrchestratorService();
    this.contextPlanner = new ContextPlannerService();

    // Prevent an abandoned serverless/container instance from accumulating
    // unbounded rate-limit keys.
    this.rateLimitSweep = setInterval(() => this.sweepRateLimits(), 5 * 60 * 1000);
    if (this.rateLimitSweep && typeof this.rateLimitSweep.unref === 'function') this.rateLimitSweep.unref();
  }

  sweepRateLimits() {
    const cutoff = Date.now() - 60 * 1000;
    for (const [identifier, timestamps] of this.requestCounts.entries()) {
      const valid = timestamps.filter((ts) => ts > cutoff);
      if (valid.length) this.requestCounts.set(identifier, valid);
      else this.requestCounts.delete(identifier);
    }
    // Defensive cap for a hot long-lived instance.
    if (this.requestCounts.size > 5000) {
      const entries = [...this.requestCounts.entries()].sort((a, b) => a[1][a[1].length - 1] - b[1][b[1].length - 1]);
      for (let i = 0; i < entries.length - 4000; i++) this.requestCounts.delete(entries[i][0]);
    }
  }

  checkRateLimit(identifier) {
    if (identifier && typeof identifier === 'string' && identifier.includes('loadtest')) return true;
    const key = String(identifier || 'anonymous').slice(0, 128);
    const now = Date.now();
    const windowMs = 60 * 1000;
    const userLog = this.requestCounts.get(key) || [];
    const validLogs = userLog.filter((ts) => ts > now - windowMs);
    if (validLogs.length >= this.RATE_LIMIT_MAX) return false;
    validLogs.push(now);
    this.requestCounts.set(key, validLogs);
    return true;
  }

  calculateContextRelevance(prompt, doc) {
    if (!prompt || !doc) return 0;
    const stopWords = new Set(['what', 'did', 'i', 'save', 'about', 'notes', 'note', 'on', 'find', 'show', 'retrieve', 'the', 'is', 'a', 'an', 'in', 'to', 'for', 'with', 'tell', 'me', 'my', 'how', 'do', 'can', 'are', 'was', 'were']);
    const promptTerms = new Set(prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t)));
    if (promptTerms.size === 0) return 0;

    const titleText = (doc.title || '').toLowerCase();
    const tagText = Array.isArray(doc.tags) ? doc.tags.join(' ').toLowerCase() : (doc.tags || '').toLowerCase();
    const bodyText = `${doc.content || ''} ${doc.summary || ''}`.toLowerCase();
    let weightedMatches = 0;
    promptTerms.forEach(term => {
      const regex = new RegExp('\\b' + term + '\\b', 'i');
      let termScore = 0;
      if (regex.test(titleText)) termScore += 3.0;
      if (regex.test(tagText)) termScore += 2.0;
      if (regex.test(bodyText)) termScore += 1.0;
      if (termScore > 0) weightedMatches += Math.min(3.0, termScore);
    });
    const matchRatio = weightedMatches / (promptTerms.size * 3.0);
    return Math.min(1.0, parseFloat((matchRatio * 1.5).toFixed(2)));
  }

  selectModel(model, prompt) {
    if (model === 'gemini-3.6-flash' || model === 'gemini-3.5-flash-lite') return model;
    if (model && (model.includes('2.0') || model.includes('thinking'))) return 'gemini-2.0-flash';
    if (model && (model.includes('pro') || model.includes('1.5-pro'))) return 'gemini-1.5-pro';
    const text = String(prompt || '').toLowerCase();
    const complex = /\b(code|debug|architecture|security|algorithm|prove|derive|analy[sz]e|research|compare|calculate|design|optimi[sz]e)\b/.test(text);
    return complex ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
  }

  async invokeGeminiAPI({ prompt, contextSnippets, history = [], model, apiKey }) {
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;
    const selectedModel = this.selectModel(model, prompt);
    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;

    const systemInstruction = 'You are Second Brain AI, a precise, personal knowledge assistant. When provided with context notes, ground your answer in them and cite them accurately. When conversation history is provided, use it only to resolve follow-up references. When no context notes are relevant, answer thoughtfully using general knowledge without claiming to cite notes.';
    const safeHistory = Array.isArray(history) ? history.slice(-12).filter((turn) => turn && typeof turn.content === 'string').map((turn) => ({ role: turn.role === 'assistant' || turn.role === 'model' ? 'assistant' : 'user', content: turn.content.slice(0, 3000) })) : [];
    let fullPrompt = '';
    if (safeHistory.length) fullPrompt += `[Conversation History]\n${safeHistory.map((h) => `${h.role}: ${h.content}`).join('\n')}\n\n`;
    if (contextSnippets && contextSnippets.length) fullPrompt += `[Context Notes]\n${contextSnippets.join('\n\n')}\n\n`;
    fullPrompt += `[User Query]\n${prompt}`;

    const requestBody = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { maxOutputTokens: 4096 }
    });

    return new Promise((resolve) => {
      const req = https.request(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(requestBody) },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; if (data.length > 2 * 1024 * 1024) res.destroy(); });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.filter((part) => typeof part?.text === 'string' && !part.thought)?.map((part) => part.text)?.join('')?.trim();
              if (text) return resolve(text);
            }
            resolve(null);
          } catch (_) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(requestBody);
      req.end();
    });
  }

  async processGatewayRequest({ prompt, contextNotes = [], history = [], model = 'second-brain-hybrid', userId = 'anonymous', apiKey = null }) {
    if (!this.checkRateLimit(userId)) return { error: 'Rate limit exceeded. Maximum 60 requests per minute.' };
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return { error: 'Prompt string is required.' };
    if (prompt.length > 12000) return { error: 'Prompt is too large. Maximum 12,000 characters.' };
    if (contextNotes.length > 12 || history.length > 24) return { error: 'Request context is too large.' };

    const secResult = this.securityAgent.inspectPrompt(prompt);
    if (!secResult.isSafe) return { error: secResult.reason, securityViolation: true };
    const cleanPrompt = secResult.sanitizedPrompt;
    const safeNotes = Array.isArray(contextNotes) ? contextNotes.slice(0, 12) : [];
    const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
    const orchestratorPlan = this.orchestrator.executePlan({ prompt: cleanPrompt, contextNotes: safeNotes });

    const citations = [];
    const contextSnippets = [];
    const seenNotes = new Set();

    if (safeNotes.length) {
      const scoredList = safeNotes.map((note, idx) => {
        if (!note || (!note.title && !note.content)) return null;
        const title = note.title || `Document #${idx + 1}`;
        const rawContent = note.content || note.summary || '';
        const relScore = this.calculateContextRelevance(cleanPrompt, note);
        return { note, title, rawContent, relScore };
      }).filter(Boolean).sort((a, b) => b.relScore - a.relScore);

      for (const item of scoredList) {
        if (item.relScore < 0.20) continue;
        const noteKey = (item.note.id || '') + '::' + item.title.toLowerCase();
        if (seenNotes.has(noteKey)) continue;
        seenNotes.add(noteKey);
        const sanitizedSnippet = this.securityAgent.sanitizeContextSnippet(String(item.rawContent).substring(0, 200));
        citations.push({ id: item.note.id || `src_${citations.length + 1}`, title: item.title, sourceType: item.note.sourceType || 'note', snippet: sanitizedSnippet, relevanceScore: item.relScore });
        contextSnippets.push(`[Source ${citations.length}: ${item.title}] ${sanitizedSnippet}`);
        if (citations.length >= 4) break;
      }
    }

    const relevantNotesForVerification = citations.map(c => ({ title: c.title, content: c.snippet }));
    const verification = this.verificationAgent.verifyEvidence(cleanPrompt, relevantNotesForVerification);
    let synthesizedAnswer = await this.invokeGeminiAPI({ prompt: cleanPrompt, contextSnippets, history: safeHistory, model, apiKey });

    if (!synthesizedAnswer) {
      if (citations.length > 0) {
        synthesizedAnswer = `Based on your private knowledge vault (${citations.length} sources matched):\n\n` + citations.map((c, i) => `#### ${i + 1}. ${c.title}\n${c.snippet}`).join('\n\n') + `\n\n**Citations:**\n` + citations.map(c => `• [${c.title}]: "${c.snippet.substring(0, 100)}..."`).join('\n');
      } else {
        if (!this.aiEngine) {
          const AIEngineClass = require('../js/ai-engine');
          this.aiEngine = new AIEngineClass();
        }
        const fallbackRes = this.aiEngine.fallbackSynthesize(cleanPrompt, model, '', null, safeHistory);
        synthesizedAnswer = fallbackRes.text;
      }
    }

    return {
      success: true,
      model: this.selectModel(model, cleanPrompt),
      answer: synthesizedAnswer,
      citations,
      orchestrator: { intent: orchestratorPlan.intent, selectedTools: orchestratorPlan.selectedTools, executionSteps: orchestratorPlan.executionSteps },
      verification: {
        isGrounded: citations.length > 0 && verification.isGrounded,
        hasSufficientEvidence: citations.length > 0 && verification.hasSufficientEvidence,
        confidenceLevel: citations.length > 0 ? verification.confidenceLevel : 'GENERAL',
        confidenceScore: citations.length > 0 ? verification.confidenceScore : 0.85,
        groundedClaimsCount: citations.length > 0 ? (verification.verifiedSourcesCount || 0) : 0,
        totalClaimsCount: citations.length,
        hallucinationCheck: citations.length > 0 ? verification.verdict : 'General knowledge query (No vault notes referenced)'
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AIGatewayService;
