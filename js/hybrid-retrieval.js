/**
 * Second Brain AI System — Hybrid Retrieval Engine
 * Combines Okapi BM25 Lexical Ranking + TF-IDF Vector Cosine Similarity +
 * Reciprocal Rank Fusion (RRF) + Passage Chunking + Metadata-Aware Boosting.
 *
 * Provides grounded, evidence-based retrieval for Milo personal AI workspace.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HybridRetrievalEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would',
    'you', 'your', 'yours', 'yourself', 'yourselves', 'note', 'notes', 'save', 'saved'
  ]);

  class HybridRetrievalEngine {
    constructor(options = {}) {
      this.k1 = options.k1 || 1.2;
      this.b = options.b || 0.75;
      this.rrfK = options.rrfK || 60; // Standard reciprocal rank fusion constant
      this.minRelevanceThreshold = options.minRelevanceThreshold || 0.16;
      this.maxCitations = options.maxCitations || 6;
      this.stopWords = options.stopWords || DEFAULT_STOP_WORDS;
    }

    clean(text) {
      return String(text == null ? '' : text).trim();
    }

    tokenize(text) {
      if (!text || typeof text !== 'string') return [];
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !this.stopWords.has(t));
    }

    createTermFrequencyMap(tokens) {
      const tf = Object.create(null);
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        tf[t] = (tf[t] || 0) + 1;
      }
      return tf;
    }

    cosineSimilarity(vecA, vecB) {
      let dot = 0;
      let magA = 0;
      let magB = 0;
      for (const k in vecA) {
        const valA = vecA[k];
        magA += valA * valA;
        if (vecB[k]) dot += valA * vecB[k];
      }
      for (const k in vecB) {
        magB += vecB[k] * vecB[k];
      }
      if (!magA || !magB) return 0;
      return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }

    /**
     * Extracts the most relevant chunk/passage window from a document
     * around the highest concentration of query tokens.
     */
    extractBestChunk(doc, queryTokens, maxChunkLen = 350) {
      const rawText = `${doc.title || ''}\n\n${doc.summary || ''}\n\n${doc.content || ''}`.trim();
      if (rawText.length <= maxChunkLen) {
        return rawText;
      }

      if (!queryTokens.length) {
        return rawText.slice(0, maxChunkLen) + '...';
      }

      const sentences = rawText.split(/(?<=[.?!;:\n])\s+/).filter(Boolean);
      let bestScore = -1;
      let bestIndex = 0;

      for (let i = 0; i < sentences.length; i++) {
        const lower = sentences[i].toLowerCase();
        let matches = 0;
        for (const token of queryTokens) {
          if (lower.includes(token)) matches++;
        }
        if (matches > bestScore) {
          bestScore = matches;
          bestIndex = i;
        }
      }

      let start = Math.max(0, bestIndex - 1);
      let end = Math.min(sentences.length, bestIndex + 2);
      let passage = sentences.slice(start, end).join(' ');

      if (passage.length > maxChunkLen) {
        const matchIdx = passage.toLowerCase().indexOf(queryTokens[0]);
        if (matchIdx !== -1) {
          const sliceStart = Math.max(0, matchIdx - 60);
          passage = (sliceStart > 0 ? '...' : '') + passage.slice(sliceStart, sliceStart + maxChunkLen) + '...';
        } else {
          passage = passage.slice(0, maxChunkLen) + '...';
        }
      }

      return passage.trim();
    }

    calculateMetadataBoost(doc, queryTokens) {
      let boost = 0.0;

      // Source type boost if mentioned in query
      const sourceType = String(doc.sourceType || 'note').toLowerCase();
      for (const token of queryTokens) {
        if (sourceType.includes(token)) boost += 0.25;
      }

      // Tag match boost
      if (Array.isArray(doc.tags)) {
        for (const tag of doc.tags) {
          const tagLower = String(tag).toLowerCase();
          for (const token of queryTokens) {
            if (tagLower.includes(token)) boost += 0.15;
          }
        }
      }

      // Recency boost (subtle, up to +15% for items created in last 30 days)
      if (doc.dateStr || doc.timestamp || doc.updatedAt) {
        try {
          const docDate = new Date(doc.dateStr || doc.timestamp || doc.updatedAt).getTime();
          if (!isNaN(docDate)) {
            const ageDays = (Date.now() - docDate) / (1000 * 60 * 60 * 24);
            if (ageDays <= 30) boost += Math.max(0, 0.15 * (1 - ageDays / 30));
          }
        } catch (_) {}
      }

      return Math.min(0.60, boost);
    }

    /**
     * Executes evidence-based hybrid retrieval across the provided documents.
     */
    search(query, documents = []) {
      const cleanQuery = this.clean(query);
      if (!cleanQuery || !Array.isArray(documents) || !documents.length) {
        return {
          contextNotes: [],
          citations: [],
          isGrounded: false,
          retrievalMethod: 'none',
          query: cleanQuery
        };
      }

      const queryTokens = [...new Set(this.tokenize(cleanQuery))];
      if (!queryTokens.length) {
        return {
          contextNotes: [],
          citations: [],
          isGrounded: false,
          retrievalMethod: 'empty-query-tokens',
          query: cleanQuery
        };
      }

      // Deduplicate documents by id and title
      const seen = new Set();
      const uniqueDocs = [];
      for (const d of documents) {
        if (!d) continue;
        const key = (d.id || '') + '::' + (d.title || '').trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueDocs.push(d);
        }
      }

      const N = uniqueDocs.length;
      if (N === 0) {
        return { contextNotes: [], citations: [], isGrounded: false, retrievalMethod: 'none', query: cleanQuery };
      }

      // Build token representations with field weighting
      const parsedDocs = uniqueDocs.map((doc) => {
        const titleTokens = this.tokenize(doc.title || '');
        const tagTokens = this.tokenize(Array.isArray(doc.tags) ? doc.tags.join(' ') : (doc.tags || ''));
        const summaryTokens = this.tokenize(doc.summary || '');
        const bodyTokens = this.tokenize(doc.content || '');

        const allTokens = [...titleTokens, ...tagTokens, ...summaryTokens, ...bodyTokens];
        const tf = this.createTermFrequencyMap(allTokens);

        return {
          doc,
          titleTokens,
          tagTokens,
          summaryTokens,
          bodyTokens,
          allTokens,
          tf,
          docLen: allTokens.length || 1
        };
      });

      // Calculate avg doc length
      let totalLen = 0;
      parsedDocs.forEach((p) => { totalLen += p.docLen; });
      const avgdl = totalLen / N || 1;

      // Calculate document frequency per query term
      const df = Object.create(null);
      for (const term of queryTokens) {
        let count = 0;
        for (const p of parsedDocs) {
          if (p.tf[term]) count++;
        }
        df[term] = count;
      }

      // 1. BM25 Lexical Ranking
      const bm25Scored = parsedDocs.map((p) => {
        let score = 0;
        const titleTf = this.createTermFrequencyMap(p.titleTokens);
        const tagTf = this.createTermFrequencyMap(p.tagTokens);
        const summaryTf = this.createTermFrequencyMap(p.summaryTokens);
        const bodyTf = this.createTermFrequencyMap(p.bodyTokens);

        for (const term of queryTokens) {
          // Weighted frequency: Title 3x, Tags 2x, Summary 1.5x, Body 1x
          const weightedFreq =
            (titleTf[term] || 0) * 3.0 +
            (tagTf[term] || 0) * 2.0 +
            (summaryTf[term] || 0) * 1.5 +
            (bodyTf[term] || 0) * 1.0;

          if (weightedFreq > 0) {
            const docFreq = df[term] || 0;
            const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
            const num = weightedFreq * (this.k1 + 1);
            const den = weightedFreq + this.k1 * (1 - this.b + this.b * (p.docLen / avgdl));
            score += Math.max(0, idf * (num / den));
          }
        }
        return { p, bm25Score: score };
      });

      const bm25Ranked = [...bm25Scored]
        .filter((item) => item.bm25Score > 0)
        .sort((a, b) => b.bm25Score - a.bm25Score);

      // 2. Semantic / Cosine Vector Ranking (Lexical Vector Fallback)
      const queryTf = this.createTermFrequencyMap(queryTokens);
      const vectorScored = parsedDocs.map((p) => {
        const sim = this.cosineSimilarity(queryTf, p.tf);
        return { p, vectorScore: sim };
      });

      const vectorRanked = [...vectorScored]
        .filter((item) => item.vectorScore > 0)
        .sort((a, b) => b.vectorScore - a.vectorScore);

      // 3. Reciprocal Rank Fusion (RRF)
      const bm25RankMap = new Map();
      bm25Ranked.forEach((item, idx) => bm25RankMap.set(item.p.doc, idx + 1));

      const vectorRankMap = new Map();
      vectorRanked.forEach((item, idx) => vectorRankMap.set(item.p.doc, idx + 1));

      const combinedDocs = new Set([...bm25RankMap.keys(), ...vectorRankMap.keys()]);
      const fusedResults = [];

      for (const doc of combinedDocs) {
        const r1 = bm25RankMap.get(doc) || 999;
        const r2 = vectorRankMap.get(doc) || 999;

        const rrfScore = 1.0 / (this.rrfK + r1) + 1.0 / (this.rrfK + r2);
        const metadataBoost = this.calculateMetadataBoost(doc, queryTokens);
        const finalScore = rrfScore * (1.0 + metadataBoost);

        fusedResults.push({
          doc,
          rrfScore,
          metadataBoost,
          finalScore
        });
      }

      fusedResults.sort((a, b) => b.finalScore - a.finalScore);

      // Check if top match passes relevance threshold
      // Baseline RRF for top item without match: ~ 1/(60+1) + 1/(60+1) = ~0.0328
      // If no BM25 term hit occurred, or score is too low, filter it out.
      const qualified = fusedResults.filter((item) => {
        const hasLexicalHit = bm25RankMap.has(item.doc);
        return hasLexicalHit && item.finalScore >= 0.012;
      });

      if (!qualified.length) {
        return {
          contextNotes: [],
          citations: [],
          isGrounded: false,
          retrievalMethod: 'BM25+RRF (no qualified matches)',
          query: cleanQuery
        };
      }

      const topCandidates = qualified.slice(0, this.maxCitations);

      // 4. Chunking & Rich Citation Metadata Extraction
      const citations = topCandidates.map(({ doc, finalScore }, index) => {
        const chunk = this.extractBestChunk(doc, queryTokens);
        return {
          id: doc.id || `src_${index + 1}`,
          title: this.clean(doc.title) || `Untitled Document ${index + 1}`,
          sourceType: doc.sourceType || 'note',
          date: doc.dateStr || (doc.timestamp ? new Date(doc.timestamp).toLocaleDateString() : ''),
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          url: doc.url || doc.sourceUrl || '',
          snippet: chunk,
          relevanceScore: parseFloat(Math.min(1.0, finalScore * 25).toFixed(2)),
          retrievalMethod: 'BM25+RRF Hybrid'
        };
      });

      const contextNotes = topCandidates.map(({ doc }, index) => {
        const chunk = this.extractBestChunk(doc, queryTokens, 600);
        return {
          id: doc.id || `note_${index + 1}`,
          title: this.clean(doc.title) || `Untitled Note ${index + 1}`,
          summary: this.clean(doc.summary),
          content: chunk,
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          sourceType: doc.sourceType || 'note',
          url: doc.url || doc.sourceUrl || ''
        };
      });

      return {
        contextNotes,
        citations,
        isGrounded: citations.length > 0,
        retrievalMethod: 'BM25 + Cosine Vector + Reciprocal Rank Fusion (RRF)',
        query: cleanQuery
      };
    }
  }

  return HybridRetrievalEngine;
});
