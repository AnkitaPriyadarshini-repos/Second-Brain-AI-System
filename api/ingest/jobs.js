/**
 * Milo AI Workspace — Async Ingestion API Endpoint
 *
 * POST /api/ingest/jobs -> Returns 202 Accepted { jobId, status: 'queued' }
 * GET  /api/ingest/jobs?id=jobId -> Returns { jobId, status: 'queued'|'indexing'|'ready', progress, result }
 */

const authGuard = require('../auth-guard');
const ingestionJobService = require('../../services/IngestionJobService');

module.exports = async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  const clientIdentity = authGuard.extractClientIdentity(req);
  const userId = clientIdentity.id;

  if (req.method === 'POST') {
    const body = req.body || {};
    const { fileName, fileSize, mimeType, content, buffer } = body;

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required for ingestion' });
    }

    const job = ingestionJobService.createJob({
      fileName,
      fileSize: fileSize || (content ? Buffer.byteLength(content) : 0),
      mimeType,
      content,
      buffer,
      userId
    });

    if (job.error) {
      return res.status(400).json({ success: false, error: job.error });
    }

    return res.status(202).json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      hash: job.hash,
      message: job.message
    });
  } else if (req.method === 'GET') {
    const jobId = req.query?.id || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('id') : null);
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'Job ID parameter "id" is required' });
    }

    const job = ingestionJobService.getJob(jobId, userId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Ingestion job not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      hash: job.hash,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  }

  if (typeof res.setHeader === 'function') res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
