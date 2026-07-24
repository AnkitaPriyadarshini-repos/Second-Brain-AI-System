// ============================================
// BlogSphere AI — Content Platform
// Module: Real-time SEO & Readability Analyzer
// Author: Ankita Priyadarshini Pallai
// ============================================

class SEOAnalyzer {
  analyze(title = '', content = '', focusKeyword = '') {
    const text = content.replace(/[#*`\-[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).filter(w => w.length > 0) : [];
    const wordCount = words.length;
    const charCount = content.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Heading hierarchy checks
    const h1Count = (content.match(/^#\s+/gm) || []).length;
    const h2Count = (content.match(/^##\s+/gm) || []).length;
    const h3Count = (content.match(/^###\s+/gm) || []).length;

    // SEO Score calculation (0 - 100)
    let score = 0;
    const feedback = [];

    // 1. Title Length check (20 - 70 chars)
    if (title.length >= 20 && title.length <= 70) {
      score += 20;
      feedback.push('✓ Title length is optimal for SEO.');
    } else {
      score += 10;
      feedback.push('⚠ Title should be between 20 and 70 characters.');
    }

    // 2. Word Count check (>300 words ideal)
    if (wordCount >= 300) {
      score += 25;
      feedback.push('✓ Article length meets depth recommendations (300+ words).');
    } else if (wordCount >= 100) {
      score += 15;
      feedback.push('⚠ Article is somewhat brief. Aim for 300+ words for better ranking.');
    } else {
      score += 5;
      feedback.push('✕ Article is too short for search engine indexing.');
    }

    // 3. Headings check
    if (h1Count >= 1 && h2Count >= 1) {
      score += 20;
      feedback.push('✓ Excellent heading structure (H1 & H2 tags present).');
    } else {
      score += 5;
      feedback.push('⚠ Use subheadings (H2, H3) to structure your content.');
    }

    // 4. Focus Keyword check
    if (focusKeyword.trim()) {
      const kw = focusKeyword.toLowerCase();
      const titleHasKw = title.toLowerCase().includes(kw);
      const contentOccurrences = (text.toLowerCase().match(new RegExp(kw, 'g')) || []).length;

      if (titleHasKw) score += 15;
      if (contentOccurrences >= 2) score += 20;

      feedback.push(
        titleHasKw
          ? `✓ Focus keyword "${focusKeyword}" appears in the title.`
          : `⚠ Focus keyword "${focusKeyword}" is missing from the title.`
      );
      feedback.push(`ℹ Focus keyword appears ${contentOccurrences} time(s) in body text.`);
    } else {
      score += 15;
      feedback.push('ℹ Add a focus keyword to get targeted SEO density metrics.');
    }

    score = Math.min(100, Math.max(0, score));

    return {
      score,
      wordCount,
      charCount,
      readingTime: `${readingTimeMinutes} min read`,
      h1Count,
      h2Count,
      h3Count,
      feedback
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SEOAnalyzer };
} else {
  window.seoAnalyzer = new SEOAnalyzer();
}
