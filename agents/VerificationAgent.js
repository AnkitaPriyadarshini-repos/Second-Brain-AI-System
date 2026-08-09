/**
 * Second Brain AI System — Verification Agent
 * Performs factual grounding checks, evidence verification, and prevents hallucinations
 * by asserting whether retrieved vault documents contain sufficient evidence.
 */

class VerificationAgent {
  constructor() {
    this.MIN_EVIDENCE_THRESHOLD = 0.15;
  }

  /**
   * Verifies retrieved context evidence against user query
   */
  verifyEvidence(query, contextNotes = []) {
    if (!query || typeof query !== 'string') {
      return {
        isGrounded: false,
        hasSufficientEvidence: false,
        confidenceLevel: 'LOW',
        confidenceScore: 0.0,
        verdict: 'Invalid query payload'
      };
    }

    if (!Array.isArray(contextNotes) || contextNotes.length === 0) {
      return {
        isGrounded: false,
        hasSufficientEvidence: false,
        confidenceLevel: 'GENERAL',
        confidenceScore: 0.70,
        verdict: 'Un-grounded general query (No local vault documents referenced)'
      };
    }

    const queryTokens = new Set(
      query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2)
    );

    if (queryTokens.size === 0) {
      return {
        isGrounded: false,
        hasSufficientEvidence: false,
        confidenceLevel: 'LOW',
        confidenceScore: 0.30,
        verdict: 'Query contains no searchable terms'
      };
    }

    let matchingNotesCount = 0;
    let maxOverlapRatio = 0.0;
    const verifiedSources = [];

    contextNotes.forEach((note, idx) => {
      if (!note) return;
      const text = `${note.title || ''} ${note.content || ''} ${note.summary || ''}`.toLowerCase();
      
      let matchedTerms = 0;
      queryTokens.forEach(term => {
        if (text.includes(term)) matchedTerms++;
      });

      const overlapRatio = matchedTerms / queryTokens.size;
      if (overlapRatio > maxOverlapRatio) {
        maxOverlapRatio = overlapRatio;
      }

      if (overlapRatio >= this.MIN_EVIDENCE_THRESHOLD) {
        matchingNotesCount++;
        verifiedSources.push({
          sourceId: note.id || `src_${idx + 1}`,
          title: note.title || `Document #${idx + 1}`,
          overlapRatio: parseFloat(overlapRatio.toFixed(2))
        });
      }
    });

    const hasSufficientEvidence = matchingNotesCount > 0 && maxOverlapRatio >= 0.20;

    let confidenceLevel = 'LOW';
    let confidenceScore = 0.40;

    if (hasSufficientEvidence) {
      if (maxOverlapRatio > 0.50 || matchingNotesCount >= 2) {
        confidenceLevel = 'HIGH';
        confidenceScore = Math.min(0.98, parseFloat((0.80 + maxOverlapRatio * 0.20).toFixed(2)));
      } else {
        confidenceLevel = 'MEDIUM';
        confidenceScore = Math.min(0.85, parseFloat((0.65 + maxOverlapRatio * 0.20).toFixed(2)));
      }
    }

    const verdict = hasSufficientEvidence
      ? `Sufficient local evidence confirmed (${matchingNotesCount} verified sources, max overlap ${(maxOverlapRatio * 100).toFixed(0)}%)`
      : `Insufficient local evidence found in vault to answer this specific query with high confidence.`;

    return {
      isGrounded: hasSufficientEvidence,
      hasSufficientEvidence,
      confidenceLevel,
      confidenceScore,
      verifiedSourcesCount: verifiedSources.length,
      verifiedSources,
      verdict
    };
  }

  /**
   * Enforces evidence check on response output
   */
  enforceGroundingGuard(verificationResult, candidateResponse) {
    if (!verificationResult.hasSufficientEvidence && verificationResult.confidenceLevel !== 'GENERAL') {
      return `⚠️ **Insufficient local evidence found in vault.**\n\nYour query could not be matched with high confidence against any saved notes or documents in your private knowledge vault. To prevent hallucinations, please add relevant notes or documents to your vault before querying this topic.`;
    }
    return candidateResponse;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VerificationAgent;
} else if (typeof window !== 'undefined') {
  window.VerificationAgent = VerificationAgent;
}
