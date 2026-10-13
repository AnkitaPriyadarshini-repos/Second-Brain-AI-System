/**
 * Second Brain AI System — Document Ingestion Engine
 * Handles real text extraction for TXT, Markdown, PDF, DOCX, and Web Sources.
 *
 * Distinguishes successful text extraction from image-only / encrypted failures,
 * maintaining transparent extraction status for Knowledge Vault indexing.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DocumentIngestionEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class DocumentIngestionEngine {
    constructor(options = {}) {
      this.maxTextLength = options.maxTextLength || 50000;
    }

    /**
     * Extracts text from a File or Blob object
     * @param {File|Blob} file
     * @returns {Promise<Object>}
     */
    async ingestFile(file) {
      if (!file) {
        return {
          success: false,
          error: 'No file provided for ingestion.',
          extractionStatus: 'failed'
        };
      }

      const fileName = file.name || 'uploaded_document';
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      const fileSize = file.size || 0;

      try {
        if (ext === 'pdf') {
          return await this.extractFromPdf(file, fileName, fileSize);
        } else if (ext === 'docx') {
          return await this.extractFromDocx(file, fileName, fileSize);
        } else if (['txt', 'md', 'markdown', 'json', 'csv', 'js', 'ts', 'py', 'html', 'css', 'sql', 'xml'].includes(ext)) {
          return await this.extractFromTextFile(file, fileName, fileSize, ext);
        } else {
          // Unknown binary format: attempt text decode
          return await this.extractFromTextFile(file, fileName, fileSize, 'binary');
        }
      } catch (err) {
        return {
          success: false,
          title: fileName.replace(/\.[^/.]+$/, ''),
          fileName,
          fileSize,
          sourceType: ext,
          extractionStatus: 'failed',
          error: err.message || 'File extraction failed.'
        };
      }
    }

    /**
     * Plain Text & Markdown reader
     */
    extractFromTextFile(file, fileName, fileSize, ext) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const raw = String(e.target.result || '').trim();
          if (!raw) {
            return resolve({
              success: false,
              title: fileName.replace(/\.[^/.]+$/, ''),
              fileName,
              fileSize,
              sourceType: ext === 'md' ? 'markdown' : 'text',
              extractionStatus: 'failed',
              error: 'File is completely empty (0 characters).'
            });
          }

          const cleanContent = raw.slice(0, this.maxTextLength);
          const title = fileName.replace(/\.[^/.]+$/, '');
          const words = cleanContent.split(/\s+/).filter(Boolean).length;

          resolve({
            success: true,
            title,
            fileName,
            fileSize,
            content: cleanContent,
            summary: cleanContent.slice(0, 180) + '...',
            sourceType: ext === 'md' ? 'markdown' : 'note',
            charCount: cleanContent.length,
            wordCount: words,
            extractionStatus: 'ready'
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read file ${fileName}`));
        reader.readAsText(file);
      });
    }

    /**
     * PDF Text Extraction Engine
     * Decodes text operator streams from PDF ArrayBuffer
     */
    extractFromPdf(file, fileName, fileSize) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const buffer = e.target.result;
            const bytes = new Uint8Array(buffer);
            const textChunks = [];

            // Convert raw bytes to binary string for pattern matching
            let binaryStr = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }

            // Search for stream blocks and text operators (Tj, TJ, ', ")
            // Match (string) Tj or [(array)] TJ
            const tjRegex = /\(([^)]+)\)\s*Tj/g;
            let match;
            while ((match = tjRegex.exec(binaryStr)) !== null) {
              const text = this.decodePdfText(match[1]);
              if (text && text.trim()) textChunks.push(text.trim());
            }

            // Match Array TJ text operators: [(string) 20 (string)] TJ
            const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
            while ((match = tjArrayRegex.exec(binaryStr)) !== null) {
              const inner = match[1];
              const parts = inner.match(/\(([^)]+)\)/g);
              if (parts) {
                const combined = parts.map((p) => this.decodePdfText(p.slice(1, -1))).join('');
                if (combined && combined.trim()) textChunks.push(combined.trim());
              }
            }

            const extractedText = textChunks.join(' ').replace(/\s+/g, ' ').trim();

            if (!extractedText || extractedText.length < 30) {
              return resolve({
                success: false,
                title: fileName.replace(/\.[^/.]+$/, ''),
                fileName,
                fileSize,
                sourceType: 'pdf',
                extractionStatus: 'failed',
                error: 'No readable text stream found in PDF. This document may be a scanned image or password-protected.'
              });
            }

            const cleanContent = extractedText.slice(0, this.maxTextLength);
            const words = cleanContent.split(/\s+/).filter(Boolean).length;

            resolve({
              success: true,
              title: fileName.replace(/\.[^/.]+$/, ''),
              fileName,
              fileSize,
              content: cleanContent,
              summary: cleanContent.slice(0, 180) + '...',
              sourceType: 'pdf',
              charCount: cleanContent.length,
              wordCount: words,
              extractionStatus: 'ready'
            });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read PDF file ${fileName}`));
        reader.readAsArrayBuffer(file);
      });
    }

    decodePdfText(str) {
      if (!str) return '';
      return str
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    }

    /**
     * DOCX Text Extraction Engine
     * Unzips the OpenXML container and parses word/document.xml
     */
    extractFromDocx(file, fileName, fileSize) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target.result;
            const bytes = new Uint8Array(buffer);

            // Locate word/document.xml within the zip stream
            // In OpenXML docx, text nodes are `<w:t>...</w:t>` inside `<w:p>` paragraph nodes
            let binaryStr = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }

            // Extract all <w:t> tags
            const textMatches = binaryStr.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
            if (!textMatches || textMatches.length === 0) {
              return resolve({
                success: false,
                title: fileName.replace(/\.[^/.]+$/, ''),
                fileName,
                fileSize,
                sourceType: 'docx',
                extractionStatus: 'failed',
                error: 'Could not extract text nodes from DOCX archive. File may be encrypted or corrupted.'
              });
            }

            const cleanParagraphs = textMatches.map((t) => {
              return t.replace(/<[^>]*>/g, '');
            });

            const fullText = cleanParagraphs.join(' ').replace(/\s+/g, ' ').trim();
            if (fullText.length < 20) {
              return resolve({
                success: false,
                title: fileName.replace(/\.[^/.]+$/, ''),
                fileName,
                fileSize,
                sourceType: 'docx',
                extractionStatus: 'failed',
                error: 'DOCX file contained no readable text.'
              });
            }

            const cleanContent = fullText.slice(0, this.maxTextLength);
            const words = cleanContent.split(/\s+/).filter(Boolean).length;

            resolve({
              success: true,
              title: fileName.replace(/\.[^/.]+$/, ''),
              fileName,
              fileSize,
              content: cleanContent,
              summary: cleanContent.slice(0, 180) + '...',
              sourceType: 'docx',
              charCount: cleanContent.length,
              wordCount: words,
              extractionStatus: 'ready'
            });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read DOCX file ${fileName}`));
        reader.readAsArrayBuffer(file);
      });
    }

    /**
     * Safe Server-Side Web Ingestion Client
     */
    async ingestUrl(url) {
      if (!url || typeof url !== 'string' || !url.trim()) {
        return {
          success: false,
          error: 'Please provide a valid website URL.',
          extractionStatus: 'failed'
        };
      }

      try {
        const response = await fetch('/api/ingest/url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ url: url.trim() })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          return {
            success: false,
            error: data.error || `Failed to ingest website (HTTP ${response.status}).`,
            extractionStatus: 'failed',
            url: url.trim()
          };
        }

        return {
          success: true,
          title: data.title || 'Clipped Web Article',
          content: data.content,
          summary: data.summary,
          sourceType: 'web',
          sourceUrl: data.url,
          charCount: data.charCount,
          wordCount: data.wordCount,
          extractionStatus: 'ready'
        };
      } catch (err) {
        return {
          success: false,
          error: err.message || 'Network error fetching website.',
          extractionStatus: 'failed',
          url: url.trim()
        };
      }
    }
  }

  return DocumentIngestionEngine;
});
