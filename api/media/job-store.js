/**
 * Milo AI Workspace — Durable Job Store
 * 
 * Provides resilient, durable job persistence for asynchronous operations (video, media, research).
 * - Persists job metadata to disk in os.tmpdir()/milo_jobs (survives process reloads)
 * - Keeps an in-memory cache for fast lookups
 * - Enforces owner isolation (ownerId) so one client cannot view or cancel another client's job
 * - Cleans up jobs older than JOB_TTL_MS (30 minutes)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const JOB_TTL_MS = 1000 * 60 * 30; // 30 minutes
const STORAGE_DIR = path.join(os.tmpdir(), 'milo_jobs');

// In-memory cache for sub-millisecond retrieval
const memoryCache = new Map();

// Ensure storage directory exists
function ensureStorageDir() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  } catch (err) {
    // Filesystem may be restricted in some read-only containers
    console.warn('[milo/job-store] Could not create storage directory:', err.message);
  }
}

ensureStorageDir();

function getFilePath(jobId) {
  // Sanitize jobId to prevent path traversal
  const safeId = String(jobId).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(STORAGE_DIR, `${safeId}.json`);
}

function cleanupExpiredJobs() {
  const now = Date.now();
  // Clean memory cache
  for (const [id, job] of memoryCache.entries()) {
    if (now - (job.createdAt || 0) > JOB_TTL_MS) {
      memoryCache.delete(id);
    }
  }

  // Clean disk files
  try {
    if (fs.existsSync(STORAGE_DIR)) {
      const files = fs.readdirSync(STORAGE_DIR);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(STORAGE_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > JOB_TTL_MS) {
            fs.unlinkSync(filePath);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
}

const JobStore = {
  /**
   * Save or update a job record
   */
  saveJob(job) {
    if (!job || !job.jobId) return null;
    job.updatedAt = Date.now();
    memoryCache.set(job.jobId, job);

    try {
      ensureStorageDir();
      const filePath = getFilePath(job.jobId);
      fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf8');
    } catch (err) {
      // If disk write fails, memory cache still holds it
      console.warn('[milo/job-store] Disk save failed for job', job.jobId, err.message);
    }
    return job;
  },

  /**
   * Retrieve a job by ID
   */
  getJob(jobId) {
    if (!jobId) return null;
    cleanupExpiredJobs();

    // Check memory cache first
    if (memoryCache.has(jobId)) {
      return memoryCache.get(jobId);
    }

    // Try reading from disk
    try {
      const filePath = getFilePath(jobId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.createdAt || 0) <= JOB_TTL_MS) {
          memoryCache.set(jobId, parsed);
          return parsed;
        } else {
          // Expired on disk
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
    } catch (_) {}

    return null;
  },

  /**
   * Delete a job
   */
  deleteJob(jobId) {
    if (!jobId) return false;
    memoryCache.delete(jobId);
    try {
      const filePath = getFilePath(jobId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Count active (queued/processing) jobs for a specific owner
   */
  getActiveJobCountForOwner(ownerId) {
    if (!ownerId) return 0;
    cleanupExpiredJobs();

    let count = 0;
    for (const job of memoryCache.values()) {
      if (job.ownerId === ownerId && ['queued', 'processing'].includes(job.status)) {
        count++;
      }
    }
    return count;
  },

  /**
   * Verify ownership of a job
   */
  verifyOwnership(job, requesterId) {
    if (!job) return false;
    // If no owner is assigned or requester matches owner
    if (!job.ownerId) return true;
    return job.ownerId === requesterId;
  },

  cleanup: cleanupExpiredJobs
};

module.exports = JobStore;
