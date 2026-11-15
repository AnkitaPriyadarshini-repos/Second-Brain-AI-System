/**
 * Second Brain AI System — Prompt Security Agent
 * Inspects incoming prompts for injection attacks, system override attempts,
 * malicious payloads, and sanitizes input before AI inference.
 */

class PromptSecurityAgent {
  constructor() {
    this.injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(all\s+)?(previous|prior)\s+rules/i,
      /system\s+override/i,
      /system\s+(instruction|prompt|directive)s?:?/i,
      /you\s+are\s+now\s+DAN/i,
      /jailbreak/i,
      /(print|output|say|echo)\s+['"]?(injection_successful|pwned|hacked)['"]?/i,
      /(leak|reveal|show|dump|exfiltrate)\s+(all\s+)?(user\s+)?(api\s+keys?|secrets?|credentials?|passwords?|system\s+prompt)/i,
      /<script\b[^>]*>[\s\S]*?<\/script>/i,
      /exec\s*\(\s*["']/i,
      /process\.env/i,
      /__proto__/i
    ];
  }

  inspectPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { isSafe: false, reason: 'Invalid or empty prompt input' };
    }

    const clean = prompt.trim();
    if (clean.length === 0) {
      return { isSafe: false, reason: 'Empty prompt payload' };
    }

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(clean)) {
        return {
          isSafe: false,
          reason: `Security filter triggered: Potential prompt injection or unauthorized override pattern detected.`,
          flaggedPattern: pattern.toString()
        };
      }
    }

    return {
      isSafe: true,
      sanitizedPrompt: clean
    };
  }

  /**
   * Sanitizes untrusted note content to prevent embedded prompt injection attacks
   */
  sanitizeContextSnippet(text) {
    if (!text || typeof text !== 'string') return '';
    let sanitized = text;

    // 1. Redact malicious container escape tags & enclosed injection payloads
    sanitized = sanitized.replace(/<(?:system|developer|admin|override)\b[^>]*>[\s\S]*?<\/(?:system|developer|admin|override)>/gi, '[REDACTED_SECURITY_PATTERN]');
    sanitized = sanitized.replace(/<\/?(?:system|developer|admin|override|retrieved_context|private_memory_data)[^>]*>/gi, '');

    // 2. Redact markdown image exfiltration URLs
    sanitized = sanitized.replace(/!\[.*?\]\s*\(\s*https?:\/\/[^\s)]+\)/gi, '[REDACTED_IMAGE_EXFILTRATION]');

    // 3. Redact injection commands, system overrides, and exfiltration prompts
    sanitized = sanitized.replace(/(?:output|say|print|echo)\s+(?:the\s+word\s+)?['"]?(?:pwned|injection_successful|hacked)['"]?/gi, '[REDACTED_SECURITY_PATTERN]');
    sanitized = sanitized.replace(/admin\s+maintenance\s+mode/gi, '[REDACTED_SECURITY_PATTERN]');

    // 4. Redact known prompt injection regex patterns
    for (const pattern of this.injectionPatterns) {
      sanitized = sanitized.replace(new RegExp(pattern.source, 'gi'), '[REDACTED_SECURITY_PATTERN]');
    }

    return sanitized.replace(/<[^>]*>/g, '').trim();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptSecurityAgent;
} else if (typeof window !== 'undefined') {
  window.PromptSecurityAgent = PromptSecurityAgent;
}
