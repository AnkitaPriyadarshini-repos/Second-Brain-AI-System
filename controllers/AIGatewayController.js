/**
 * Second Brain AI System — AI Gateway Controller
 * Handles HTTP POST requests for AI execution and RAG context synthesis.
 */

const AIGatewayService = require('../services/AIGatewayService');
const CoordinatorService = require('../services/CoordinatorService');
const authGuard = require('../api/auth-guard');
const { ChatGatewaySchema } = require('../api/validation-schemas');
const DistributedRateLimiter = require('../services/DistributedRateLimiter');
const Logger = require('../services/Logger');

class AIGatewayController {
  constructor() {
    this.aiGatewayService = new AIGatewayService();
    this.coordinatorService = new CoordinatorService();
    this.limiter = DistributedRateLimiter.rateLimiter || new DistributedRateLimiter();
  }

  async handleQuery(req, res) {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 10);
    const startTime = Date.now();
    const body = req.body || {};

    // 1. Strict Zod Schema Validation
    const validation = ChatGatewaySchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => i.message).join('; ');
      return res.status(400).json({ success: false, requestId, error: errorMsg });
    }

    const { prompt, model, mode, stream } = validation.data;
    const contextNotes = Array.isArray(body.contextNotes)
      ? body.contextNotes
      : Array.isArray(body.context)
        ? body.context
        : [];
    const history = Array.isArray(body.history) ? body.history : [];
    
    // Derive identity securely from verified session token or signed guest hash, never trusting raw x-user-id
    const clientIdentity = authGuard.extractClientIdentity(req);
    const userId = clientIdentity.id;

    // 2a. Atomic Request Rate Limiting (30 req/min auth, 15 req/min guest)
    const maxRequests = clientIdentity.isGuest ? 15 : 30;
    const rateLimitKey = `${userId}:${clientIdentity.ip || 'ip'}`;
    const rateCheck = await this.limiter.checkLimit(rateLimitKey, maxRequests, 60_000);
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
      res.setHeader('X-RateLimit-Reset', String(rateCheck.resetSeconds));
      if (rateCheck.distributed) res.setHeader('X-RateLimit-Mode', 'distributed');
      if (rateCheck.degraded) res.setHeader('X-RateLimit-Degraded', 'true');
    }
    if (!rateCheck.allowed) {
      if (typeof res.setHeader === 'function') res.setHeader('Retry-After', String(rateCheck.resetSeconds));
      return res.status(429).json({
        success: false,
        requestId,
        error: `Rate limit exceeded. Maximum ${maxRequests} requests per minute. Please try again shortly.`
      });
    }

    // 2b. Sliding-Window Daily Token Budget Cap (100k auth, 20k guest)
    const estimatedTokens = Math.max(25, Math.ceil((prompt.length + 200) / 4));
    const dailyCap = clientIdentity.isGuest ? 20_000 : 100_000;
    const tokenCheck = await this.limiter.checkDailyTokenBudget(userId, estimatedTokens, dailyCap);
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-Daily-Token-Limit', String(tokenCheck.limit));
      res.setHeader('X-Daily-Token-Remaining', String(tokenCheck.remainingTokens));
    }
    if (!tokenCheck.allowed) {
      if (typeof res.setHeader === 'function') res.setHeader('Retry-After', String(tokenCheck.resetSeconds));
      return res.status(429).json({
        success: false,
        requestId,
        error: `Daily token budget exceeded (${dailyCap.toLocaleString()} tokens/day). Please upgrade or try again tomorrow.`
      });
    }

    // Reject pathological payloads before they reach retrieval/model execution.
    if (prompt.length > 12000) {
      return res.status(413).json({ success: false, requestId, error: 'Prompt is too long. Please keep it under 12,000 characters.' });
    }
    if (contextNotes.length > 12 || history.length > 24) {
      return res.status(413).json({ success: false, requestId, error: 'Request context is too large. Please start a new chat or reduce the attached context.' });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${requestId}] AI Query start - user:${userId} model:${model || 'default'} mode:${mode || 'milo'} context:${contextNotes.length}`);
    }

    // Context-Isolated Slash Commands (/fork, /snooze, /btw)
    if (/^\/fork(?:\s+(.*))?$/i.test(prompt)) {
      const branchMatch = prompt.match(/^\/fork(?:\s+(.*))?$/i);
      const branchName = branchMatch && branchMatch[1] ? branchMatch[1].trim() : undefined;
      const threadId = body.threadId || body.currentThreadId || 'th_active';
      try {
        const forked = await this.coordinatorService.forkThread({ threadId, userId, branchName });
        return res.status(200).json({
          success: true,
          isFork: true,
          forkedThread: forked,
          answer: `🌿 **Parallel Branch Created**: Successfully deep-cloned thread history into \`${forked.title}\`. You can test alternative architectures or prompts without mutating your primary thread context.`,
          requestId,
          durationMs: Date.now() - startTime
        });
      } catch (err) {
        return res.status(400).json({ success: false, error: err.message, requestId });
      }
    }

    if (/^\/snooze(?:\s+(.*))?$/i.test(prompt)) {
      const snoozeMatch = prompt.match(/^\/snooze(?:\s+(.*))?$/i);
      const rawArg = snoozeMatch && snoozeMatch[1] ? snoozeMatch[1].trim() : '30m';
      let durationMs = 30 * 60 * 1000;
      if (rawArg.endsWith('m')) durationMs = parseInt(rawArg, 10) * 60 * 1000;
      else if (rawArg.endsWith('h')) durationMs = parseInt(rawArg, 10) * 60 * 60 * 1000;
      else if (rawArg.endsWith('d')) durationMs = parseInt(rawArg, 10) * 24 * 60 * 60 * 1000;

      const threadId = body.threadId || body.currentThreadId || 'th_active';
      try {
        const snoozeResult = await this.coordinatorService.snoozeThread({ threadId, userId, durationMs });
        return res.status(200).json({
          success: true,
          isSnooze: true,
          snoozeResult,
          answer: `⏰ **Thread Snoozed**: This thread is now snoozed until ${snoozeResult.snoozeExpiryISO}. It has been hidden from your active list and will resurface automatically with an alert banner when the snooze period expires.`,
          requestId,
          durationMs: Date.now() - startTime
        });
      } catch (err) {
        return res.status(400).json({ success: false, error: err.message, requestId });
      }
    }

    let effectivePrompt = prompt;
    let isSideTangent = false;
    if (/^\/btw(?:\s+(.*))?$/i.test(prompt)) {
      const btwMatch = prompt.match(/^\/btw(?:\s+(.*))?$/i);
      effectivePrompt = btwMatch && btwMatch[1] ? btwMatch[1].trim() : '';
      isSideTangent = true;
      if (!effectivePrompt) {
        return res.status(400).json({ success: false, error: 'Usage: /btw <your side-tangent question>' });
      }
    }

    try {
      const result = await this.aiGatewayService.processGatewayRequest({
        prompt: effectivePrompt,
        contextNotes,
        history: isSideTangent ? [] : history, // Keep side-tangents strictly decoupled from parent history
        model,
        mode,
        userId,
        requestId
      });

      const duration = Date.now() - startTime;

      if (result.error) {
        const statusCode = result.error.includes('Rate limit') ? 429 : (result.error.includes('too large') ? 413 : 400);
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`[${requestId}] AI Query rejected (${statusCode}) - duration:${duration}ms error:${result.error}`);
        }
        return res.status(statusCode).json({ success: false, requestId, error: result.error });
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`[${requestId}] AI Query success - duration:${duration}ms citations:${(result.citations || []).length}`);
      }

      // 3. Server-Sent Events (SSE) Streaming for Sub-500ms TTFT
      const isStream = Boolean(stream) || req.headers?.accept === 'text/event-stream';
      if (isStream && typeof res.write === 'function') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        const ttftMs = Date.now() - startTime;
        res.setHeader('X-Time-To-First-Token-Ms', String(ttftMs));
        if (typeof res.flushHeaders === 'function') res.flushHeaders();

        const answerText = result.answer || '';
        const words = answerText.split(/(\s+)/);
        let sentText = '';
        for (let i = 0; i < words.length; i++) {
          sentText += words[i];
          res.write(`data: ${JSON.stringify({
            chunk: words[i],
            currentText: sentText,
            done: false,
            requestId
          })}\n\n`);
          if (i % 3 === 0 && words.length > 10) {
            await new Promise(r => setTimeout(r, 6));
          }
        }

        const estimatedTokens = Math.ceil(((result.answer || '').length + (prompt || '').length) / 4);
        res.tokenCount = estimatedTokens;
        res.aiModel = result.model || 'gemini-1.5-flash';

        Logger.info('AI Gateway Stream Completed', {
          request_id: requestId,
          user_id: userId,
          model: res.aiModel,
          tokens: estimatedTokens,
          duration_ms: Date.now() - startTime,
          grounded: result.grounded
        });

        res.write(`data: ${JSON.stringify({
          done: true,
          fullAnswer: answerText,
          grounded: result.grounded,
          citations: result.citations,
          model: result.model,
          isBtwTangent: isSideTangent,
          doNotSaveToHistory: isSideTangent,
          requestId,
          durationMs: Date.now() - startTime
        })}\n\n`);
        return res.end();
      }

      const estimatedTokens = Math.ceil(((result.answer || '').length + (prompt || '').length) / 4);
      res.tokenCount = estimatedTokens;
      res.aiModel = result.model || 'gemini-1.5-flash';

      Logger.info('AI Gateway Request Completed', {
        request_id: requestId,
        user_id: userId,
        model: res.aiModel,
        tokens: estimatedTokens,
        duration_ms: duration,
        grounded: result.grounded
      });

      return res.status(200).json({
        ...result,
        isBtwTangent: isSideTangent,
        doNotSaveToHistory: isSideTangent,
        requestId,
        durationMs: duration
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      Logger.error('AI Query exception', { request_id: requestId, duration_ms: duration, error: err.message });
      return res.status(500).json({ success: false, requestId, error: 'The AI service could not complete this request. Please try again.' });
    }
  }
}

module.exports = AIGatewayController;
