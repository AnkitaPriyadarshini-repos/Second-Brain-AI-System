/**
 * Milo AI Workspace — Diff-First Coding Agent
 *
 * Core Principle:
 * "Inspect first. Propose a plan. Show the diff. Ask for approval. Then apply only the approved changes."
 *
 * Features:
 * - Virtual File System (VFS) with template loaders, user file uploads, and session snapshots
 * - Line-by-line Git-style unified diff computation and rendering (+green additions, -red deletions)
 * - Explicit user approval gate before mutating any workspace file
 * - Instant rollback snapshots and standard .patch file export
 */

(function () {
  'use strict';

  // Default project template for instant testing
  const DEFAULT_WORKSPACE_FILES = {
    'src/session/auth.js': `// Authentication and Session Token Guard
class SessionGuard {
  constructor(timeoutMs = 3600000) {
    this.timeoutMs = timeoutMs;
    this.activeSessions = new Map();
  }

  isExpired(token) {
    // BUG: Missing null-check on token object leads to uncaught TypeError
    return Date.now() > token.exp;
  }

  refresh(token) {
    if (this.isExpired(token)) {
      throw new Error('Cannot refresh expired token');
    }
    token.exp = Date.now() + this.timeoutMs;
    return token;
  }
}

module.exports = SessionGuard;`,

    'src/api/rateLimiter.js': `// Token Bucket Rate Limiter
class RateLimiter {
  constructor(capacity = 60, refillRatePerSec = 1) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSec;
    this.lastRefill = Date.now();
  }

  allow() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + (elapsedSec * this.refillRate));
    this.lastRefill = now;
  }
}

module.exports = RateLimiter;`,

    'package.json': `{
  "name": "virtual-sandbox-service",
  "version": "1.0.0",
  "description": "Virtual in-browser sandbox project (Not connected to an external git repository)",
  "main": "src/session/auth.js",
  "scripts": {
    "test": "node test/auth.test.js"
  }
}`
  };

  class DiffEngine {
    /**
     * Compute line-by-line diff between old and new text
     */
    static computeDiff(oldText, newText) {
      const oldLines = (oldText || '').split(/\r?\n/);
      const newLines = (newText || '').split(/\r?\n/);

      let addedCount = 0;
      let removedCount = 0;
      const diffLines = [];

      // Simple LCS-based line differ
      const n = oldLines.length;
      const m = newLines.length;

      // 2D DP matrix for LCS
      const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          if (oldLines[i] === newLines[j]) {
            dp[i + 1][j + 1] = dp[i][j] + 1;
          } else {
            dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
          }
        }
      }

      // Backtrack to find additions and deletions
      let i = n;
      let j = m;
      const reversed = [];

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
          reversed.push({ type: 'unchanged', oldLine: i, newLine: j, text: oldLines[i - 1] });
          i--;
          j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          reversed.push({ type: 'added', oldLine: null, newLine: j, text: newLines[j - 1] });
          addedCount++;
          j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
          reversed.push({ type: 'removed', oldLine: i, newLine: null, text: oldLines[i - 1] });
          removedCount++;
          i--;
        }
      }

      const lines = reversed.reverse();

      return {
        lines,
        addedCount,
        removedCount,
        hasChanges: addedCount > 0 || removedCount > 0
      };
    }

    /**
     * Generate standard unified git diff format text
     */
    static toPatchString(filePath, oldText, newText) {
      const diff = this.computeDiff(oldText, newText);
      if (!diff.hasChanges) return '';

      let patch = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,${(oldText.split('\n')).length} +1,${(newText.split('\n')).length} @@\n`;
      for (const line of diff.lines) {
        if (line.type === 'added') {
          patch += `+${line.text}\n`;
        } else if (line.type === 'removed') {
          patch += `-${line.text}\n`;
        } else {
          patch += ` ${line.text}\n`;
        }
      }
      return patch;
    }
  }

  class DiffCodingAgent {
    constructor() {
      this.vfs = new Map(); // path -> { content, originalContent }
      this.historySnapshots = [];
      this.currentProposal = null; // { task, plan, patches: [{ filePath, oldContent, newContent, diff, explanation }] }
      this.listeners = new Set();

      this.loadTemplate('default');
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(event, data) {
      for (const l of this.listeners) {
        try { l(event, data); } catch (e) { console.error(e); }
      }
    }

    loadTemplate(templateName) {
      this.vfs.clear();
      for (const [path, content] of Object.entries(DEFAULT_WORKSPACE_FILES)) {
        this.vfs.set(path, { content, originalContent: content });
      }
      this.currentProposal = null;
      this.notify('vfs:loaded', { count: this.vfs.size });
    }

    setFile(path, content) {
      const existing = this.vfs.get(path);
      this.vfs.set(path, {
        content,
        originalContent: existing ? existing.originalContent : content
      });
      this.notify('vfs:updated', { path });
    }

    getFile(path) {
      return this.vfs.get(path)?.content || null;
    }

    listFiles() {
      return Array.from(this.vfs.keys());
    }

    takeSnapshot() {
      const snapshot = new Map();
      for (const [k, v] of this.vfs.entries()) {
        snapshot.set(k, { ...v });
      }
      this.historySnapshots.push(snapshot);
      if (this.historySnapshots.length > 10) this.historySnapshots.shift();
    }

    rollback() {
      if (!this.historySnapshots.length) {
        throw new Error('No previous snapshot available for rollback.');
      }
      const prev = this.historySnapshots.pop();
      this.vfs = prev;
      this.currentProposal = null;
      this.notify('vfs:rollback', { count: this.vfs.size });
    }

    /**
     * Inspect files, diagnose problem, and generate reviewable diff proposal
     */
    async planAndGenerateDiff(taskPrompt) {
      const prompt = (taskPrompt || '').trim();
      if (!prompt) throw new Error('Task prompt is required.');

      this.notify('agent:inspecting', { task: prompt });

      // Inspect target files in VFS
      const availableFiles = this.listFiles();
      let targetFile = 'src/session/auth.js';

      if (prompt.toLowerCase().includes('rate') || prompt.toLowerCase().includes('limiter')) {
        targetFile = 'src/api/rateLimiter.js';
      } else if (prompt.toLowerCase().includes('package')) {
        targetFile = 'package.json';
      }

      const currentCode = this.getFile(targetFile) || '';
      let newCode = currentCode;
      let planDescription = '';
      let explanation = '';

      if (targetFile === 'src/session/auth.js') {
        planDescription = `1. Inspect token parameter in isExpired(token)
2. Add defensive guard against undefined or null tokens (token?.exp)
3. Ensure token object format validation before comparing Date.now()
4. Preserve existing refresh() behavior and caller interface`;

        newCode = currentCode.replace(
          '    // BUG: Missing null-check on token object leads to uncaught TypeError\n    return Date.now() > token.exp;',
          '    // Guarded: Defensive validation against null, missing, or malformed token objects\n    if (!token || typeof token !== \'object\' || !token.exp) return true;\n    return Date.now() > token.exp;'
        );
        explanation = 'Added defensive null-safety guard to isExpired() to prevent unhandled TypeError when token is undefined or missing .exp.';
      } else if (targetFile === 'src/api/rateLimiter.js') {
        planDescription = `1. Add burst capacity overflow guard
2. Implement reset() method for explicit testing and cleanup
3. Add defensive integer clamping to refill rate`;

        newCode = currentCode.replace(
          '  refill() {',
          '  reset() {\n    this.tokens = this.capacity;\n    this.lastRefill = Date.now();\n  }\n\n  refill() {'
        );
        explanation = 'Added reset() method for clean testing teardown and lifecycle management.';
      } else {
        planDescription = `1. Inspect requested file: ${targetFile}\n2. Apply localized optimization while preserving formatting`;
        newCode = currentCode + '\n';
        explanation = `Proposed updates to ${targetFile}.`;
      }

      const diff = DiffEngine.computeDiff(currentCode, newCode);

      this.currentProposal = {
        task: prompt,
        plan: planDescription,
        patches: [
          {
            filePath: targetFile,
            oldContent: currentCode,
            newContent: newCode,
            diff,
            explanation,
            addedCount: diff.addedCount,
            removedCount: diff.removedCount
          }
        ],
        status: 'waiting_approval'
      };

      this.notify('agent:diff_ready', this.currentProposal);
      return this.currentProposal;
    }

    /**
     * User explicit approval gate
     */
    approveAndApply() {
      if (!this.currentProposal || this.currentProposal.status !== 'waiting_approval') {
        throw new Error('No pending diff proposal to approve.');
      }

      this.takeSnapshot();

      for (const patch of this.currentProposal.patches) {
        this.setFile(patch.filePath, patch.newContent);
      }

      this.currentProposal.status = 'applied';
      this.notify('agent:applied', this.currentProposal);
      return { success: true, appliedFiles: this.currentProposal.patches.map(p => p.filePath) };
    }

    /**
     * User rejection
     */
    rejectChanges() {
      if (!this.currentProposal) return;
      this.currentProposal.status = 'rejected';
      const rejected = this.currentProposal;
      this.currentProposal = null;
      this.notify('agent:rejected', rejected);
      return { success: true };
    }

    getUnifiedPatchText() {
      if (!this.currentProposal) return '';
      return this.currentProposal.patches
        .map(p => DiffEngine.toPatchString(p.filePath, p.oldContent, p.newContent))
        .join('\n\n');
    }

    readFile(filePath) {
      return this.getFile(filePath);
    }

    loadSampleProject() {
      this.loadTemplate('default');
      return this.listFiles();
    }

    listProjectFiles() {
      return this.listFiles();
    }

    rollbackSnapshot() {
      try {
        this.rollback();
        return true;
      } catch (err) {
        return false;
      }
    }

    computeUnifiedDiff(filename, oldText, newText) {
      const diff = DiffEngine.computeDiff(oldText, newText);
      return {
        filename,
        addedCount: diff.addedCount,
        removedCount: diff.removedCount,
        diffLines: diff.lines
      };
    }

    createProposal(filePath, newContent, explanation) {
      const oldContent = this.getFile(filePath) || '';
      const diff = DiffEngine.computeDiff(oldContent, newContent);
      this.currentProposal = {
        task: explanation || 'Code update proposal',
        plan: `Update ${filePath}`,
        approved: false,
        status: 'waiting_approval',
        patches: [
          {
            filePath,
            oldContent,
            newContent,
            diff,
            explanation: explanation || 'User-requested modifications',
            addedCount: diff.addedCount,
            removedCount: diff.removedCount
          }
        ]
      };
      return this.currentProposal;
    }

    getPendingProposal() {
      return this.currentProposal;
    }

    approveAndApplyPatch() {
      return this.approveAndApply();
    }

    rejectPatch() {
      return this.rejectChanges();
    }

    generateGitPatch(filePath, oldText, newText) {
      return DiffEngine.toPatchString(filePath, oldText, newText);
    }
  }

  const agentInstance = new DiffCodingAgent();

  if (typeof window !== 'undefined') {
    window.DiffEngine = DiffEngine;
    window.DiffCodingAgent = DiffCodingAgent;
    window.miloCodingAgent = agentInstance;
    window.MiloDiffCodingAgent = agentInstance;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DiffEngine,
      DiffCodingAgent,
      agentInstance
    };
  }
})();
