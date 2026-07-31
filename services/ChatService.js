/**
 * Second Brain AI System — Chat Domain Service (Layered Architecture)
 * Handles message stream processing, ACK validation, and real-time latency calculation.
 */

(function (global) {
  'use strict';

  class ChatService {
    constructor(containerRef) {
      this.container = containerRef || (typeof require !== 'undefined' ? require('../js/container').container : global.container);
    }

    get repository() {
      return this.container.resolve('MessageRepository');
    }

    getChannelHistory(room = 'general') {
      return this.repository.getHistory(room);
    }

    processIncomingMessage(messageDto) {
      if (!messageDto || !messageDto.text) {
        throw new Error('Message payload must contain text content');
      }

      const clientTimestamp = messageDto.clientTimestamp || Date.now();
      const serverReceiveTime = Date.now();
      const deliveryLatencyMs = Math.max(1, serverReceiveTime - clientTimestamp);

      const processedMessage = {
        id: messageDto.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        sender: messageDto.sender || 'Anonymous Researcher',
        avatar: messageDto.avatar || '⚡',
        text: messageDto.text.trim(),
        room: messageDto.room || 'general',
        timestamp: clientTimestamp,
        serverTimestamp: serverReceiveTime,
        deliveryLatencyMs,
        isUnder300ms: deliveryLatencyMs < 300
      };

      this.repository.saveMessage(processedMessage);

      return {
        message: processedMessage,
        ack: {
          messageId: processedMessage.id,
          status: 'DELIVERED',
          measuredLatencyMs: deliveryLatencyMs,
          isUnder300ms: processedMessage.isUnder300ms
        }
      };
    }

    clearChannelHistory(room = 'general') {
      return this.repository.clearHistory(room);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatService;
  } else {
    global.ChatService = ChatService;
  }
})(typeof window !== 'undefined' ? window : this);
