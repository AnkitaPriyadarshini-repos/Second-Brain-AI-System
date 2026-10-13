/**
 * Second Brain AI System — Artifacts Engine
 * Produces, manages, previews, and exports practical artifacts:
 *  - Markdown Research Reports
 *  - Plain-Text Summaries
 *  - Structured CSV Exports
 *  - Copyable Code & Config Files
 *
 * Keeps artifact generation separate from chat rendering so workflows stay smooth.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ArtifactsEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class ArtifactsEngine {
    constructor() {
      this.artifacts = new Map();
      this.loadArtifacts();
    }

    loadArtifacts() {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('milo_artifacts');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(a => {
                if (a && a.id) this.artifacts.set(a.id, a);
              });
            }
          }
        }
      } catch (_) {}
    }

    saveArtifacts() {
      try {
        if (typeof localStorage !== 'undefined') {
          const list = Array.from(this.artifacts.values()).slice(-50);
          localStorage.setItem('milo_artifacts', JSON.stringify(list));
        }
      } catch (_) {}
    }

    createArtifact({ title, type = 'markdown', content = '', metadata = {} }) {
      const cleanTitle = String(title || 'Untitled Artifact').trim();
      const cleanContent = String(content || '');
      const id = 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      const artifact = {
        id,
        title: cleanTitle,
        type: String(type).toLowerCase(), // 'markdown' | 'summary' | 'csv' | 'code' | 'json'
        content: cleanContent,
        metadata: {
          ...metadata,
          charCount: cleanContent.length,
          wordCount: cleanContent.split(/\s+/).filter(Boolean).length
        },
        createdAt: new Date().toISOString()
      };

      this.artifacts.set(id, artifact);
      this.saveArtifacts();

      // Dispatch global event for UI listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('milo:artifact-created', { detail: artifact }));
      }

      return artifact;
    }

    getArtifact(id) {
      return this.artifacts.get(id) || null;
    }

    listArtifacts() {
      return Array.from(this.artifacts.values()).sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    deleteArtifact(id) {
      const res = this.artifacts.delete(id);
      this.saveArtifacts();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('milo:artifact-deleted', { detail: { id } }));
      }
      return res;
    }

    /**
     * Triggers a real browser file download for the specified artifact
     */
    downloadArtifact(id) {
      const artifact = this.getArtifact(id);
      if (!artifact) return false;

      const extensionMap = {
        markdown: 'md',
        summary: 'txt',
        csv: 'csv',
        code: 'js',
        json: 'json'
      };

      const ext = extensionMap[artifact.type] || 'md';
      const safeTitle = artifact.title
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 40)
        .replace(/_+/g, '_');

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `milo_${safeTitle}_${dateStr}.${ext}`;

      const mimeTypeMap = {
        markdown: 'text/markdown;charset=utf-8',
        summary: 'text/plain;charset=utf-8',
        csv: 'text/csv;charset=utf-8',
        code: 'text/javascript;charset=utf-8',
        json: 'application/json;charset=utf-8'
      };

      const mime = mimeTypeMap[artifact.type] || 'text/plain;charset=utf-8';
      const blob = new Blob([artifact.content], { type: mime });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(`Downloaded ${filename} 📥`);
      }
      return true;
    }

    /**
     * Copies artifact content to clipboard
     */
    async copyArtifact(id) {
      const artifact = this.getArtifact(id);
      if (!artifact) return false;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(artifact.content);
        } else {
          const ta = document.createElement('textarea');
          ta.value = artifact.content;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }

        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast(`Copied "${artifact.title}" to clipboard! 📋`);
        }
        return true;
      } catch (err) {
        console.error('Failed to copy artifact:', err);
        return false;
      }
    }

    /**
     * Converts an artifact into a permanent Knowledge Vault note
     */
    saveToVault(id) {
      const artifact = this.getArtifact(id);
      if (!artifact) return null;

      if (typeof Store !== 'undefined' && typeof Store.addNote === 'function') {
        const note = Store.addNote({
          title: `Artifact: ${artifact.title}`,
          content: artifact.content,
          tags: ['artifact', artifact.type, 'milo-generated'],
          sourceType: 'artifact'
        });

        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast(`Saved artifact to Knowledge Vault! 📚`);
        }
        return note;
      }
      return null;
    }
  }

  // Global helper on window
  if (typeof window !== 'undefined') {
    const defaultEngine = new ArtifactsEngine();
    window.artifactsEngine = defaultEngine;
    window.saveMiloArtifact = (art) => defaultEngine.createArtifact(art);
    window.downloadMiloArtifact = (id) => defaultEngine.downloadArtifact(id);
    window.copyMiloArtifact = (id) => defaultEngine.copyArtifact(id);
    window.saveArtifactToVault = (id) => defaultEngine.saveToVault(id);
  }

  return ArtifactsEngine;
});
