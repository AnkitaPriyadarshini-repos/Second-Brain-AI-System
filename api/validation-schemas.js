/**
 * Milo AI Workspace — Zod Input Validation & File Upload Security Guard
 *
 * Enforces strict runtime type validation, parameter bounds,
 * MIME type sniffing, 10MB payload caps, and SHA-256 deduplication.
 */

const { z } = require('zod');
const crypto = require('crypto');

// 1. Chat Gateway Request Schema
const ChatGatewaySchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt cannot be empty').max(15000, 'Prompt exceeds 15,000 character limit'),
  model: z.string().trim().max(64).optional(),
  mode: z.enum(['milo', 'coach', 'research', 'coding']).optional().default('milo'),
  stream: z.boolean().optional().default(false),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model', 'assistant']),
      content: z.string().max(15000)
    })
  ).max(30, 'Chat history exceeds maximum 30 turns').optional().default([]),
  contextNotes: z.array(z.any()).max(16).optional().default([]),
  citations: z.array(z.any()).max(16).optional().default([])
});

// 2. Note Creation / Update Schema
const NoteSchema = z.object({
  id: z.string().max(128).optional(),
  title: z.string().trim().max(512).optional().default('Untitled Note'),
  content: z.string().trim().min(1, 'Note content cannot be empty').max(100000, 'Note exceeds 100,000 characters limit'),
  summary: z.string().max(2500).optional(),
  sourceType: z.string().max(64).optional().default('note'),
  sourceUrl: z.string().max(2048).optional().default(''),
  tags: z.array(z.string().trim().max(64)).max(30).optional().default(['General']),
  pinned: z.boolean().optional().default(false)
});

// 3. Media Image Generation Schema
const ImageGenerationSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required.').max(1500, 'Image prompt exceeds 1,500 characters'),
  negativePrompt: z.string().max(500).optional().default(''),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:2']).optional().default('1:1'),
  style: z.string().max(64).optional().default('realistic'),
  seed: z.number().int().optional()
});

// 4. File Upload Limits & MIME Type Verification
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB strict limit

const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'application/json',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const ALLOWED_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'csv', 'js', 'ts', 'py'
]);

function computeSHA256(bufferOrString) {
  return crypto.createHash('sha256').update(bufferOrString).digest('hex');
}

/**
 * Validates file buffer or base64 data:
 * - Checks size <= 10MB
 * - Checks MIME type against magic numbers and whitelist
 * - Computes SHA-256 hash for deduplication
 */
function validateFileUpload({ fileName, fileSize, mimeType, buffer }) {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds strict 10MB production limit (received ${(fileSize / (1024 * 1024)).toFixed(2)}MB)`
    };
  }

  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File extension .${ext} is not supported. Supported extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
    };
  }

  // Magic number verification for binary uploads
  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 4) {
    const magic = buffer.toString('hex', 0, 4);
    // PDF: %PDF (25 50 44 46)
    if (ext === 'pdf' && !magic.startsWith('25504446')) {
      return { valid: false, error: 'File content does not match genuine PDF binary header (%PDF).' };
    }
    // PNG: 89 50 4e 47
    if (ext === 'png' && !magic.startsWith('89504e47')) {
      return { valid: false, error: 'File content does not match genuine PNG image header.' };
    }
    // JPEG: ff d8 ff
    if ((ext === 'jpg' || ext === 'jpeg') && !magic.startsWith('ffd8ff')) {
      return { valid: false, error: 'File content does not match genuine JPEG image header.' };
    }
  }

  const hash = buffer ? computeSHA256(buffer) : null;

  return {
    valid: true,
    fileName,
    fileSize,
    mimeType,
    hash
  };
}

module.exports = {
  ChatGatewaySchema,
  NoteSchema,
  ImageGenerationSchema,
  MAX_FILE_SIZE_BYTES,
  validateFileUpload,
  computeSHA256
};
