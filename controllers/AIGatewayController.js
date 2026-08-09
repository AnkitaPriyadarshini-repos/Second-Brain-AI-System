/**
 * Second Brain AI System — AI Gateway Controller
 * Handles HTTP POST requests for AI execution and RAG context synthesis.
 */

const AIGatewayService = require('../services/AIGatewayService');

class AIGatewayController {
  constructor() {
    this.aiGatewayService = new AIGatewayService();
  }

  handleQuery(req, res) {
    const { prompt, contextNotes, model } = req.body || {};
    const userId = req.headers['x-user-id'] || req.ip || 'client';

    const result = this.aiGatewayService.processGatewayRequest({
      prompt,
      contextNotes,
      model,
      userId
    });

    if (result.error) {
      const statusCode = result.error.includes('Rate limit') ? 429 : 400;
      return res.status(statusCode).json({ success: false, error: result.error });
    }

    return res.status(200).json(result);
  }
}

module.exports = AIGatewayController;
