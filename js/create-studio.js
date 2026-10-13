/**
 * Milo AI Workspace — Unified Image and Video Create Studio
 *
 * Capabilities:
 * - Text-to-Image & Image-to-Image generation via /api/media/image
 * - Asynchronous Video Generation lifecycle with status polling via /api/media/video
 * - IndexedDB Persistent Storage (MiloMediaDB) to avoid localStorage size limits
 * - Interactive media gallery with preview modal, download, and variation actions
 */

(function () {
  'use strict';

  // --- 1. IndexedDB Persistent Storage ---
  const DB_NAME = 'MiloMediaDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'media_assets';

  function openMediaDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return resolve(null);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveMediaItem(item) {
    try {
      const db = await openMediaDB();
      if (!db) return item;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[MiloMediaDB save failed]', e);
      return item;
    }
  }

  async function getAllMediaItems() {
    try {
      const db = await openMediaDB();
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          resolve(items);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[MiloMediaDB getAll failed]', e);
      return [];
    }
  }

  async function deleteMediaItem(id) {
    try {
      const db = await openMediaDB();
      if (!db) return;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('[MiloMediaDB delete failed]', e);
    }
  }

  // --- 2. Create Studio Engine Class ---
  class CreateStudioEngine {
    constructor() {
      this.activeVideoJob = null;
      this.videoPollInterval = null;
      this.listeners = new Set();
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    notify(event, data) {
      for (const listener of this.listeners) {
        try { listener(event, data); } catch (e) { console.error(e); }
      }
    }

    async generateImage({ prompt, negativePrompt, aspectRatio = '1:1', provider = 'auto', style = 'cinematic', seed, referenceImage }) {
      if (!prompt || !prompt.trim()) {
        throw new Error('Prompt is required for image generation.');
      }

      this.notify('image:generating', { prompt });
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('thinking', 'Synthesizing visual concepts…');
      }

      let styledPrompt = prompt.trim();
      if (style && style !== 'none') {
        styledPrompt = `${styledPrompt}, high resolution, professional lighting, masterpiece, style: ${style}`;
      }

      try {
        const res = await fetch('/api/media/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: styledPrompt,
            negativePrompt,
            aspectRatio,
            provider,
            seed,
            referenceImage
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.imageUrl) {
          throw new Error(data.error || `Image generation failed (HTTP ${res.status}).`);
        }

        const mediaItem = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          url: data.imageUrl,
          prompt: prompt.trim(),
          styledPrompt,
          provider: data.provider || 'Milo Image Studio',
          aspectRatio,
          dimensions: data.dimensions || { width: 1024, height: 1024 },
          seed: data.seed,
          createdAt: new Date().toISOString()
        };

        await saveMediaItem(mediaItem);
        this.notify('image:ready', mediaItem);

        if (typeof MiloCompanion !== 'undefined') {
          MiloCompanion.setGlobalState('happy', 'Your image is ready!');
          setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
        }

        return mediaItem;
      } catch (err) {
        this.notify('image:error', { error: err.message });
        if (typeof MiloCompanion !== 'undefined') {
          MiloCompanion.setGlobalState('error', 'Image generation encountered an error.');
          setTimeout(() => MiloCompanion.setGlobalState('idle'), 4000);
        }
        throw err;
      }
    }

    async startVideoJob({ prompt, aspectRatio = '16:9', duration = 5, motionStrength = 5, referenceImage }) {
      if (!prompt || !prompt.trim()) {
        throw new Error('Prompt is required for video generation.');
      }

      this.stopVideoPolling();

      const res = await fetch('/api/media/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          prompt: prompt.trim(),
          aspectRatio,
          duration,
          motionStrength,
          referenceImage
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.jobId) {
        throw new Error(data.error || `Failed to initiate video generation (HTTP ${res.status}).`);
      }

      this.activeVideoJob = {
        jobId: data.jobId,
        prompt: prompt.trim(),
        aspectRatio,
        duration,
        status: data.status || 'queued',
        progress: 10,
        step: data.step || 'Allocating GPU compute'
      };

      this.notify('video:started', this.activeVideoJob);
      this.pollVideoJob(data.jobId);
      return this.activeVideoJob;
    }

    pollVideoJob(jobId) {
      this.videoPollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/media/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'status', jobId })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) {
            this.stopVideoPolling();
            this.notify('video:failed', { jobId, error: data.error || 'Job failed' });
            return;
          }

          this.activeVideoJob = data;
          this.notify('video:progress', data);

          if (data.status === 'completed') {
            this.stopVideoPolling();
            const mediaItem = {
              id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              type: 'video',
              url: data.videoUrl,
              prompt: data.prompt,
              provider: 'Milo Video Studio',
              aspectRatio: data.aspectRatio,
              duration: data.duration,
              createdAt: data.createdAt || new Date().toISOString()
            };
            await saveMediaItem(mediaItem);
            this.notify('video:ready', mediaItem);
            if (typeof MiloCompanion !== 'undefined') {
              MiloCompanion.setGlobalState('happy', 'Your video has finished rendering!');
              setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
            }
          } else if (data.status === 'failed' || data.status === 'cancelled') {
            this.stopVideoPolling();
            this.notify('video:ended', data);
          }
        } catch (err) {
          console.error('[Milo video poll error]', err);
        }
      }, 1800);
    }

    async cancelVideoJob(jobId) {
      const targetId = jobId || this.activeVideoJob?.jobId;
      if (!targetId) return;

      this.stopVideoPolling();
      try {
        await fetch('/api/media/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', jobId: targetId })
        });
      } catch (_) {}

      this.activeVideoJob = null;
      this.notify('video:cancelled', { jobId: targetId });
    }

    stopVideoPolling() {
      if (this.videoPollInterval) {
        clearInterval(this.videoPollInterval);
        this.videoPollInterval = null;
      }
    }

    async getGalleryItems() {
      return getAllMediaItems();
    }

    async removeMediaItem(id) {
      await deleteMediaItem(id);
      this.notify('gallery:updated', { deletedId: id });
    }
  }

  // Instantiate singleton
  const engine = new CreateStudioEngine();

  // Export to window
  if (typeof window !== 'undefined') {
    window.MiloCreateStudio = engine;
    window.saveMediaItem = saveMediaItem;
    window.getAllMediaItems = getAllMediaItems;
    window.deleteMediaItem = deleteMediaItem;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      CreateStudioEngine,
      openMediaDB,
      saveMediaItem,
      getAllMediaItems,
      deleteMediaItem
    };
  }
})();
