// ============================================
// BlogSphere AI — Content Platform
// Module: Automated Unit Test Suite
// Author: Ankita Priyadarshini Pallai
// ============================================

const { SEOAnalyzer } = require('../js/seo-analyzer.js');

let passed = 0;
let total = 0;

function assert(condition, name) {
  total++;
  if (condition) {
    console.log(`  ✓ PASSED: ${name}`);
    passed++;
  } else {
    console.error(`  ✕ FAILED: ${name}`);
  }
}

function runTests() {
  console.log('\n=============================================');
  console.log('  BlogSphere AI — Automated Test Suite');
  console.log('=============================================\n');

  const analyzer = new SEOAnalyzer();

  // Test 1: SEO Analyzer Title Check
  console.log('[Test 1] SEO Analyzer Title Check');
  const md1 = '# Optimal Title For BlogSphere Platform\n\n## Section 1\n\n' + 'BlogSphere content text '.repeat(30);
  const res1 = analyzer.analyze('Optimal Title For BlogSphere Platform', md1, 'BlogSphere');
  assert(res1.score >= 70, 'SEO Analyzer scores structured title correctly (score >= 70)');

  // Test 2: SEO Analyzer Word Count
  console.log('\n[Test 2] SEO Word Count Calculation');
  const md2 = '# Comprehensive Guide to AI Engineering\n\n## Introduction\n\n' + 'Word '.repeat(350);
  const res2 = analyzer.analyze('Comprehensive Guide to AI Engineering', md2, 'AI');
  assert(res2.wordCount > 350, 'SEO Analyzer calculates word count accurately (>350 words)');
  assert(res2.score >= 80, 'SEO Analyzer awards high score for long structured article (80+)');

  // Test 3: Markdown Heading Parsing
  console.log('\n[Test 3] Heading Tag Detection');
  const md3 = '# Main Title\n\n## Subheading 1\n\n## Subheading 2\n\nBody text...';
  const res3 = analyzer.analyze('Test Article Title Heading Check', md3);
  assert(res3.h1Count === 1 && res3.h2Count === 2, 'Detects H1 and H2 tags accurately');

  console.log('\n=============================================');
  console.log(`  Results: ${passed} / ${total} Passed`);
  console.log('=============================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
