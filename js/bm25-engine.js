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
    const stopWords = new Set(['what', 'did', 'i', 'save', 'about', 'notes', 'note', 'on', 'find', 'show', 'retrieve', 'the', 'is', 'a', 'an', 'in', 'to', 'for', 'with', 'tell', 'me', 'my', 'how', 'do', 'can', 'are', 'was', 'were']);
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 1 && !stopWords.has(t));
  }

  search(query, documents = []) {
    if (!query || !Array.isArray(documents) || documents.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    // Deduplicate input documents by id or title
    const seen = new Set();
    const uniqueDocs = documents.filter(d => {
      if (!d) return false;
      const key = (d.id || '') + '::' + (d.title || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const N = uniqueDocs.length;
    const docTokenLists = uniqueDocs.map(d => {
      const titleTokens = this.tokenize(d.title || '');
      const tagTokens = this.tokenize(Array.isArray(d.tags) ? d.tags.join(' ') : (d.tags || ''));
      const bodyTokens = this.tokenize(`${d.content || ''} ${d.summary || ''}`);
      return { titleTokens, tagTokens, bodyTokens, allTokens: [...titleTokens, ...tagTokens, ...bodyTokens] };
    });
    
    let totalDocLen = 0;
    docTokenLists.forEach(d => totalDocLen += d.allTokens.length);
    const avgdl = totalDocLen / N || 1;

    // Document frequencies per term
    const df = {};
    queryTokens.forEach(term => {
      let count = 0;
      docTokenLists.forEach(d => {
        if (d.allTokens.includes(term)) count++;
      });
      df[term] = count;
    });

    // Score each document with field weighting (Title x3.0, Tags x2.0, Body x1.0)
    const results = uniqueDocs.map((doc, idx) => {
      const { titleTokens, tagTokens, bodyTokens, allTokens } = docTokenLists[idx];
      const docLen = allTokens.length || 1;
      let score = 0.0;

      // Frequency maps
      const titleTf = {}, tagTf = {}, bodyTf = {};
      titleTokens.forEach(t => titleTf[t] = (titleTf[t] || 0) + 1);
      tagTokens.forEach(t => tagTf[t] = (tagTf[t] || 0) + 1);
      bodyTokens.forEach(t => bodyTf[t] = (bodyTf[t] || 0) + 1);

      queryTokens.forEach(term => {
        const tCount = (titleTf[term] || 0) * 3.0 + (tagTf[term] || 0) * 2.0 + (bodyTf[term] || 0) * 1.0;
        if (tCount > 0) {
          const docFreq = df[term] || 0;
          const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
          const num = tCount * (this.k1 + 1);
          const den = tCount + this.k1 * (1 - this.b + this.b * (docLen / avgdl));
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
