/**
 * Second Brain AI System — AI Gateway Controller
 * Handles HTTP POST requests for AI execution and RAG context synthesis.
 */

const AIGatewayService = require('../services/AIGatewayService');

class AIGatewayController {
  constructor() {
    this.aiGatewayService = new AIGatewayService();
  }

  async handleQuery(req, res) {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 10);
    const startTime = Date.now();
    const body = req.body || {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const contextNotes = Array.isArray(body.contextNotes)
      ? body.contextNotes
      : Array.isArray(body.context)
        ? body.context
        : [];
    const history = Array.isArray(body.history) ? body.history : [];
    const model = typeof body.model === 'string' ? body.model : undefined;
    const userId = String(req.headers['x-user-id'] || req.ip || 'client').slice(0, 128);

    // Reject pathological payloads before they reach retrieval/model execution.
    if (prompt.length > 12000) {
      return res.status(413).json({ success: false, requestId, error: 'Prompt is too long. Please keep it under 12,000 characters.' });
    }
    if (contextNotes.length > 12 || history.length > 24) {
      return res.status(413).json({ success: false, requestId, error: 'Request context is too large. Please start a new chat or reduce the attached context.' });
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${requestId}] AI Query start - user:${userId} model:${model || 'default'} context:${contextNotes.length}`);
    }

    try {
      const result = await this.aiGatewayService.processGatewayRequest({
        prompt,
        contextNotes,
        history,
        model,
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
      return res.status(200).json({ ...result, requestId, durationMs: duration });
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] AI Query exception - duration:${duration}ms error:`, err);
      return res.status(500).json({ success: false, requestId, error: 'The AI service could not complete this request. Please try again.' });
    }
  }
}

module.exports = AIGatewayController;
