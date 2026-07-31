/**
 * Second Brain AI System — Chat Controller (Layered Architecture)
 * Handles HTTP & WebSocket chat requests and delegates processing to ChatService.
 */

(function (global) {
  'use strict';

  class ChatController {
    constructor(chatService) {
      if (typeof require !== 'undefined' && !chatService) {
        const ChatServiceClass = require('../services/ChatService');
        this.chatService = new ChatServiceClass();
      } else {
        this.chatService = chatService;
      }
    }

    getHistory(req, res) {
      try {
        const room = (req && req.query && req.query.room) ? req.query.room : 'general';
        const history = this.chatService.getChannelHistory(room);
        if (res && typeof res.json === 'function') {
          return res.status(200).json({ success: true, room, count: history.length, data: history });
        }
        return { success: true, room, count: history.length, data: history };
      } catch (err) {
        if (res && typeof res.status === 'function') {
          return res.status(500).json({ success: false, error: err.message });
        }
        throw err;
      }
    }

    handleIncomingMessage(messagePayload) {
      try {
        return this.chatService.processIncomingMessage(messagePayload);
      } catch (err) {
        return { error: err.message, status: 'FAILED' };
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatController;
  } else {
    global.ChatController = ChatController;
  }
})(typeof window !== 'undefined' ? window : this);
