/**
 * Second Brain AI System — Coordinator Controller
 * Handles HTTP & SSE endpoints for Project Coordination, Thread Forking,
 * Snooze Resurfacing, and Secure Read-Only Sharing.
 */

const CoordinatorService = require('../services/CoordinatorService');
const authGuard = require('../api/auth-guard');
const Logger = require('../services/Logger');

class CoordinatorController {
  constructor() {
    this.service = new CoordinatorService();
  }

  /**
   * POST /api/projects/:projectId/coordinate
   * Decomposes complex goals and streams sub-thread delegation rollups via SSE
   */
  async handleCoordinate(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const projectId = req.params?.projectId || req.query?.projectId || req.body?.projectId || 'prj_default';
    const { goal } = req.body || {};

    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ success: false, error: 'A valid project goal string is required.' });
    }

    const isStream = req.headers?.accept === 'text/event-stream' || Boolean(req.body?.stream);

    if (isStream && typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();

      try {
        await this.service.coordinateProject({
          projectId,
          goal,
          userId,
          emitCallback: (event) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        });
        return res.end();
      } catch (err) {
        Logger.error('Coordinator streaming failed', { error: err.message, user_id: userId });
        res.write(`data: ${JSON.stringify({ type: 'ERROR', error: err.message })}\n\n`);
        return res.end();
      }
    }

    // Non-streaming fallback
    try {
      const coordThread = await this.service.coordinateProject({
        projectId,
        goal,
        userId
      });
      return res.status(200).json({ success: true, coordinatorThread: coordThread });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/projects/:projectId/threads
   * Lists unexpired active threads for authenticated tenant
   */
  async handleGetThreads(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const projectId = req.params?.projectId || req.query?.projectId || 'prj_default';

    try {
      const threads = await this.service.getActiveThreads({ userId, projectId });
      return res.status(200).json({ success: true, threads });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/threads/:threadId/fork
   * Deep clones thread history into an isolated parallel branch
   */
  async handleFork(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const threadId = req.params?.threadId || req.body?.threadId;
    const { branchName } = req.body || {};

    if (!threadId) {
      return res.status(400).json({ success: false, error: 'threadId is required.' });
    }

    try {
      const forked = await this.service.forkThread({
        threadId,
        userId,
        branchName
      });
      return res.status(201).json({ success: true, forkedThread: forked });
    } catch (err) {
      const isForbidden = err.message.includes('IDOR') || err.message.includes('Forbidden');
      return res.status(isForbidden ? 403 : 400).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/threads/:threadId/snooze
   * Snoozes a thread until durationMs or untilTimestamp
   */
  async handleSnooze(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const threadId = req.params?.threadId || req.body?.threadId;
    const { durationMs, untilTimestamp } = req.body || {};

    if (!threadId) {
      return res.status(400).json({ success: false, error: 'threadId is required.' });
    }

    try {
      const result = await this.service.snoozeThread({
        threadId,
        userId,
        durationMs,
        untilTimestamp
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      const isForbidden = err.message.includes('IDOR') || err.message.includes('Forbidden');
      return res.status(isForbidden ? 403 : 400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/projects/:projectId/resurface
   * Checks for expired snoozes and returns notification banners
   */
  async handleCheckResurface(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const projectId = req.params?.projectId || req.query?.projectId || 'prj_default';

    try {
      const resurfaced = await this.service.checkSnoozedResurfacing({ userId, projectId });
      return res.status(200).json({ success: true, resurfaced });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/threads/:threadId/share
   * Creates a read-only cryptographic share link
   */
  async handleCreateShare(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const threadId = req.params?.threadId || req.body?.threadId;

    if (!threadId) {
      return res.status(400).json({ success: false, error: 'threadId is required.' });
    }

    try {
      const share = await this.service.createShareLink({ threadId, userId });
      return res.status(200).json({ success: true, ...share });
    } catch (err) {
      if (err.message.includes('UNSAFE_SANDBOX_THREAD')) {
        return res.status(400).json({ success: false, error: err.message });
      }
      const isForbidden = err.message.includes('IDOR') || err.message.includes('Forbidden');
      return res.status(isForbidden ? 403 : 400).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/threads/shared/:slug
   * Retrieves sanitized, read-only view of a shared thread
   */
  async handleGetShared(req, res) {
    const slug = req.params?.slug || req.query?.slug;
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Share slug is required.' });
    }

    try {
      const thread = await this.service.getSharedThread(slug);
      if (!thread) {
        return res.status(404).json({ success: false, error: 'Shared thread not found or link has expired.' });
      }
      return res.status(200).json({ success: true, thread });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/threads/:threadId/btw
   * Executes context-isolated side-tangent without mutating parent thread history
   */
  async handleBtw(req, res) {
    const identity = authGuard.extractClientIdentity(req);
    const userId = identity.id;
    const threadId = req.params?.threadId || req.body?.threadId || 'th_active';
    const { question } = req.body || {};

    if (!question) {
      return res.status(400).json({ success: false, error: 'A question is required for /btw.' });
    }

    try {
      const result = await this.service.executeBtwTangent({
        parentThreadId: threadId,
        question,
        userId
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      const isForbidden = err.message.includes('IDOR');
      return res.status(isForbidden ? 403 : 400).json({ success: false, error: err.message });
    }
  }
}

module.exports = CoordinatorController;
