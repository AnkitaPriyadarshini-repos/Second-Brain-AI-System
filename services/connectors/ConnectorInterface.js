/**
 * Second Brain AI System — Connector Abstraction Interface
 * Milo Enterprise Connectors Architecture.
 *
 * Provides a standardized contract for data sources (Local Files, Web URLs,
 * and future cloud integrations like Google Drive, GitHub).
 */

class BaseConnector {
  constructor(name, config = {}) {
    if (new.target === BaseConnector) {
      throw new TypeError('Cannot construct BaseConnector instances directly.');
    }
    this.name = name;
    this.config = config;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'AUTHENTICATED' | 'SYNCING' | 'ERROR' | 'READY'
    this.lastSyncAt = null;
    this.error = null;
  }

  async authenticate() {
    throw new Error('Method authenticate() must be implemented.');
  }

  async sync(options = {}) {
    throw new Error('Method sync() must be implemented.');
  }

  async extract(sourceReference) {
    throw new Error('Method extract() must be implemented.');
  }

  getStatus() {
    return {
      connectorName: this.name,
      status: this.status,
      lastSyncAt: this.lastSyncAt,
      error: this.error
    };
  }
}

class LocalFileConnector extends BaseConnector {
  constructor(config = {}) {
    super('local_files', config);
    this.supportedExtensions = new Set(['txt', 'md', 'pdf', 'docx', 'json', 'csv']);
    this.status = 'READY';
  }

  async authenticate() {
    // Local files are trusted browser/client inputs; no remote token needed
    this.status = 'AUTHENTICATED';
    return { authenticated: true, source: 'local' };
  }

  async sync(options = {}) {
    this.status = 'SYNCING';
    this.lastSyncAt = new Date().toISOString();
    this.status = 'READY';
    return { syncedDocumentsCount: options.fileCount || 0, status: 'READY' };
  }

  async extract(file) {
    if (!file) throw new Error('File object is required.');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!this.supportedExtensions.has(ext)) {
      throw new Error(`Unsupported file extension .${ext}`);
    }
    return {
      title: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: file.size,
      sourceType: ext,
      extractedAt: new Date().toISOString()
    };
  }
}

class WebUrlConnector extends BaseConnector {
  constructor(config = {}) {
    super('web_urls', config);
    this.status = 'READY';
  }

  async authenticate() {
    this.status = 'AUTHENTICATED';
    return { authenticated: true, source: 'web' };
  }

  async sync(urls = []) {
    this.status = 'SYNCING';
    const results = [];
    for (const url of urls) {
      try {
        const item = await this.extract(url);
        results.push(item);
      } catch (err) {
        results.push({ url, error: err.message, status: 'failed' });
      }
    }
    this.lastSyncAt = new Date().toISOString();
    this.status = 'READY';
    return { syncedCount: results.length, items: results };
  }

  async extract(url) {
    if (!url || typeof url !== 'string') throw new Error('Valid URL string is required.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS protocols are supported.');
    }
    return {
      title: parsed.hostname + parsed.pathname,
      sourceUrl: url,
      sourceType: 'web',
      extractedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  BaseConnector,
  LocalFileConnector,
  WebUrlConnector
};
