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
      /you\s+are\s+now\s+DAN/i,
      /jailbreak/i,
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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptSecurityAgent;
} else if (typeof window !== 'undefined') {
  window.PromptSecurityAgent = PromptSecurityAgent;
}
