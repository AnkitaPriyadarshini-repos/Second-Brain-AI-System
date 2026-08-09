/**
 * Second Brain AI System — Share Service
 * Manages public/private shareable links for chat threads, study guides, and notes.
 */

const crypto = require('crypto');

class ShareService {
  constructor() {
    this.shareStore = new Map();
  }

  /**
   * Generates a secure shareable token for content
   * @param {Object} payload { type: 'chat'|'note'|'guide', data: Object, title: string }
   * @returns {Object} shareRecord
   */
  createShareLink(payload) {
    if (!payload || !payload.data) {
      throw new Error('Invalid share payload');
    }

    const shareId = 'sb_' + crypto.randomBytes(8).toString('hex');
    const shareRecord = {
      id: shareId,
      type: payload.type || 'note',
      title: payload.title || 'Second Brain Shared Content',
      data: payload.data,
      createdAt: new Date().toISOString(),
      views: 0
    };

    this.shareStore.set(shareId, shareRecord);
    return shareRecord;
  }

  /**
   * Retrieves shared content by ID
   * @param {string} shareId 
   * @returns {Object|null}
   */
  getShareLink(shareId) {
    const record = this.shareStore.get(shareId);
    if (record) {
      record.views += 1;
      return record;
    }
    return null;
  }
}

module.exports = new ShareService();
