/**
 * Second Brain AI System — NLP Engine
 * Entity Extraction, Auto-Tagging, Summarization, and TF-IDF Vectorization
 */

(function (global) {
  'use strict';

  // Common stop words for TF-IDF vectorization
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
    'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
    'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
    'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
    'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
    'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
    'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
    'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  // Topic vocabulary rules
  const TOPIC_KEYWORDS = {
    'Artificial Intelligence': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network', 'llm', 'transformer', 'rag', 'whisper', 'spacy', 'gpt', 'model', 'embeddings'],
    'Startup Ideas': ['startup', 'business', 'product', 'market', 'monetization', 'founder', 'mvp', 'saas', 'customer', 'revenue', 'venture'],
    'Urban Planning': ['urban', 'planning', 'city', 'transit', 'zoning', 'housing', 'transportation', 'infrastructure', 'density', 'walkability', 'suburb'],
    'Habit & Productivity': ['habit', 'productivity', 'workflow', 'focus', 'routine', 'time', 'obsidian', 'notion', 'roam', 'pkm', 'second brain', 'learning', 'discipline'],
    'Sleep & Memory': ['sleep', 'memory', 'rem', 'brain', 'neuroscience', 'circadian', 'consolidation', 'retention', 'cognition', 'recall', 'dreams'],
    'Distributed Systems': ['distributed', 'kafka', 'microservices', 'database', 'event-driven', 'consensus', 'raft', 'paxos', 'replication', 'latency', 'cluster'],
    'Web & Software Engineering': ['javascript', 'react', 'python', 'fastapi', 'frontend', 'backend', 'api', 'web', 'manifest', 'css', 'html', 'code'],
    'Books & Literature': ['book', 'author', 'reading', 'novel', 'chapter', 'summary', 'literature', 'quote', 'non-fiction']
  };

  const NLPEngine = {
    /**
     * Extracts named entities (People, Places, Concepts, Dates, Tech) from text.
     * @param {string} text 
     * @returns {{people: string[], places: string[], concepts: string[], dates: string[], tech: string[]}}
     */
    extractEntities: function (text) {
      if (!text) return { people: [], places: [], concepts: [], dates: [], tech: [] };

      const entities = {
        people: [],
        places: [],
        concepts: [],
        dates: [],
        tech: []
      };

      // Extract Dates
      const dateRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{1,2}\/\d{2,4}|20\d{2}|last month|yesterday|today|in January|in February|in March|in April|in May|in June|in July|in August|in September|in October|in November|in December)\b/gi;
      const matchedDates = text.match(dateRegex) || [];
      entities.dates = Array.from(new Set(matchedDates.map(d => d.trim())));

      // Extract Technology/Tools
      const techRegex = /\b(Kafka|Whisper|Python|FastAPI|PostgreSQL|Neo4j|React|Tesseract|PyMuPDF|Obsidian|Notion|Roam|Claude|OpenAI|GPT-4|Pinecone|Chroma|spaCy|Transformers|Docker|Kubernetes|JavaScript|HTML|CSS|Node\.js|Express)\b/gi;
      const matchedTech = text.match(techRegex) || [];
      entities.tech = Array.from(new Set(matchedTech.map(t => t.trim())));

      // Extract People (Capitalized two words or known names)
      const peopleRegex = /\b(Sam Altman|Dario Amodei|Andrew Ng|Yann LeCun|Geoffrey Hinton|Demis Hassabis|Ilya Sutskever|James Clear|Cal Newport|Andrew Huberman|Matthew Walker)\b/gi;
      const matchedPeople = text.match(peopleRegex) || [];
      entities.people = Array.from(new Set(matchedPeople.map(p => p.trim())));

      // Extract Concepts (Capitalized tech terms / multi-word phrases)
      const conceptRegex = /\b(Retrieval-Augmented Generation|RAG|Deep Learning|Urban Planning|Cis-Regulatory Elements|Consensus Protocol|Vector Database|Semantic Search|Knowledge Graph|Proactive Resurfacing|Zero-Friction Capture|Circadian Rhythm|Memory Consolidation|Event-Driven Architecture)\b/gi;
      const matchedConcepts = text.match(conceptRegex) || [];
      entities.concepts = Array.from(new Set(matchedConcepts.map(c => c.trim())));

      // Extract Places
      const placeRegex = /\b(San Francisco|New York|London|Tokyo|Berlin|Paris|Bangalore|Silicon Valley|California)\b/gi;
      const matchedPlaces = text.match(placeRegex) || [];
      entities.places = Array.from(new Set(matchedPlaces.map(p => p.trim())));

      return entities;
    },

    /**
     * Auto-assigns topics/tags based on content analysis
     * @param {string} title 
     * @param {string} content 
     * @returns {string[]} Tags list
     */
    classifyTopics: function (title, content) {
      const fullText = (title + ' ' + content).toLowerCase();
      const tags = new Set();

      for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        for (const kw of keywords) {
          if (fullText.includes(kw)) {
            tags.add(topic);
            break;
          }
        }
      }

      if (tags.size === 0) {
        tags.add('General Knowledge');
      }

      return Array.from(tags);
    },

    /**
     * Generates a concise 2-sentence summary for long text.
     * @param {string} text 
     * @returns {string} Summary
     */
    generateSummary: function (text) {
      if (!text) return '';
      const sentences = text
        .split(/(?<=[.?!])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 15);

      if (sentences.length <= 2) {
        return sentences.join(' ');
      }

      // Pick the first sentence and the sentence with the highest word density
      const first = sentences[0];
      let bestSecond = sentences[1];
      let maxScore = 0;

      for (let i = 1; i < sentences.length; i++) {
        const words = sentences[i].toLowerCase().split(/\W+/).filter(w => !STOP_WORDS.has(w));
        if (words.length > maxScore) {
          maxScore = words.length;
          bestSecond = sentences[i];
        }
      }

      return `${first} ${bestSecond}`;
    },

    /**
     * Tokenizes text into normalized word tokens (excluding stop words)
     * @param {string} text 
     * @returns {string[]}
     */
    tokenize: function (text) {
      if (!text) return [];
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOP_WORDS.has(w));
    },

    /**
     * Generates term-frequency vector map
     * @param {string} text 
     * @returns {Object<string, number>}
     */
    createTFVector: function (text) {
      const tokens = this.tokenize(text);
      const tf = {};
      if (tokens.length === 0) return tf;

      for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
      }

      // Normalize by total tokens
      for (const token in tf) {
        tf[token] = tf[token] / tokens.length;
      }

      return tf;
    },

    /**
     * Computes Cosine Similarity between two term-frequency vector maps
     * @param {Object<string, number>} vecA 
     * @param {Object<string, number>} vecB 
     * @returns {number} Score between 0.0 and 1.0
     */
    cosineSimilarity: function (vecA, vecB) {
      const keysA = Object.keys(vecA);
      const keysB = Object.keys(vecB);
      if (keysA.length === 0 || keysB.length === 0) return 0;

      let dotProduct = 0;
      let magA = 0;
      let magB = 0;

      for (const k of keysA) {
        const valA = vecA[k];
        magA += valA * valA;
        if (vecB[k]) {
          dotProduct += valA * vecB[k];
        }
      }

      for (const k of keysB) {
        const valB = vecB[k];
        magB += valB * valB;
      }

      if (magA === 0 || magB === 0) return 0;
      return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
    }
  };

  // Export module for browser and Node.js test environment
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NLPEngine;
  } else {
    global.NLPEngine = NLPEngine;
  }

})(typeof window !== 'undefined' ? window : globalThis);
