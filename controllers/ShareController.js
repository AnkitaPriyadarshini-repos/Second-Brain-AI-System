/**
 * Second Brain AI System — Share Controller
 * Exposes /api/share endpoints for creating and viewing public share links
 */

const shareService = require('../services/ShareService');

class ShareController {
  createShareLink(req, res) {
    try {
      const { type, title, data } = req.body || {};
      if (!data) {
        return res.status(400).json({ error: 'Missing share content payload' });
      }

      const record = shareService.createShareLink({ type, title, data });
      return res.status(200).json({
        success: true,
        shareId: record.id,
        shareUrl: `/share/${record.id}`,
        record
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  getShareLink(req, res) {
    try {
      const { id } = req.params;
      const record = shareService.getShareLink(id);
      if (!record) {
        return res.status(404).json({ error: 'Shared content not found or expired' });
      }
      return res.status(200).json({ success: true, record });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = ShareController;
