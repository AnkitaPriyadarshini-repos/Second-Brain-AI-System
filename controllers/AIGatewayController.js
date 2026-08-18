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
    const { prompt, contextNotes, model } = req.body || {};
    const userId = req.headers['x-user-id'] || req.ip || 'client';

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${requestId}] AI Query start - user:${userId} model:${model || 'default'}`);
    }

    try {
      const result = await this.aiGatewayService.processGatewayRequest({
        prompt,
        contextNotes,
        model,
        userId,
        requestId
      });

      const duration = Date.now() - startTime;

      if (result.error) {
        const statusCode = result.error.includes('Rate limit') ? 429 : 400;
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
      return res.status(500).json({ success: false, requestId, error: err.message || 'Internal Server Error' });
    }
  }
}

module.exports = AIGatewayController;
