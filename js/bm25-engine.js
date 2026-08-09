/**
 * Second Brain AI System — BM25 Keyword Search Engine
 * Implements standard BM25 Okapi probabilistic ranking algorithm.
 * Formula: score(D, Q) = sum( IDF(q_i) * (f(q_i, D) * (k1 + 1)) / (f(q_i, D) + k1 * (1 - b + b * (|D| / avgdl))) )
 */

class BM25Engine {
  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  search(query, documents = []) {
    if (!query || !Array.isArray(documents) || documents.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = documents.length;
    const docTokenLists = documents.map(d => this.tokenize(`${d.title || ''} ${d.content || ''} ${d.summary || ''}`));
    
    let totalDocLen = 0;
    docTokenLists.forEach(tokens => totalDocLen += tokens.length);
    const avgdl = totalDocLen / N || 1;

    // Document frequencies per term
    const df = {};
    queryTokens.forEach(term => {
      let count = 0;
      docTokenLists.forEach(tokens => {
        if (tokens.includes(term)) count++;
      });
      df[term] = count;
    });

    // Score each document
    const results = documents.map((doc, idx) => {
      const tokens = docTokenLists[idx];
      const docLen = tokens.length;
      let score = 0.0;

      // Frequency map for current document
      const tf = {};
      tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);

      queryTokens.forEach(term => {
        const termFreq = tf[term] || 0;
        if (termFreq > 0) {
          const docFreq = df[term] || 0;
          const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
          const num = termFreq * (this.k1 + 1);
          const den = termFreq + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
          score += idf * (num / den);
        }
      });

      return {
        doc,
        bm25Score: parseFloat(score.toFixed(4))
      };
    });

    return results
      .filter(r => r.bm25Score > 0)
      .sort((a, b) => b.bm25Score - a.bm25Score);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BM25Engine;
} else if (typeof window !== 'undefined') {
  window.BM25Engine = BM25Engine;
}
