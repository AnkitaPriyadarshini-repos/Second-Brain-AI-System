// ============================================
// BlogSphere AI — Content Platform
// Module: Main UI Application Controller
// Author: Ankita Priyadarshini Pallai
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Navigation View Switching
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewSections = document.querySelectorAll('.view-section');

  function switchView(viewName) {
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    viewSections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    if (viewName === 'feed') renderFeed();
    if (viewName === 'analytics') renderAnalytics();
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(tab.dataset.view);
    });
  });

  // Render Feed & Featured Posts
  function renderFeed(searchQuery = '', category = 'All') {
    const posts = window.blogStore.searchPosts(searchQuery, category);
    const grid = document.getElementById('posts-grid');
    const featuredCard = document.getElementById('featured-post-card');

    if (!grid) return;
    grid.innerHTML = '';

    // Render Featured Post
    const featured = posts.find(p => p.isFeatured) || posts[0];
    if (featuredCard && featured) {
      featuredCard.innerHTML = `
        <div class="featured-badge">🌟 Featured Article</div>
        <h2 class="featured-title">${featured.title}</h2>
        <p class="featured-excerpt">${featured.excerpt}</p>
        <div class="meta-row">
          <span>✍️ ${featured.author}</span>
          <span>📅 ${featured.date}</span>
          <span>⏱ ${featured.readTime}</span>
          <span>👁 ${featured.views.toLocaleString()} views</span>
        </div>
        <div class="tag-row" style="margin-top: 1rem;">
          ${featured.tags.map(t => `<span class="tag-pill">#${t}</span>`).join('')}
        </div>
        <button class="btn btn-primary btn-read-post" data-id="${featured.id}" style="margin-top: 1.25rem;">
          Read Complete Article ➔
        </button>
      `;
    }

    // Render Grid Cards
    if (posts.length === 0) {
      grid.innerHTML = `<div class="empty-state">No articles found matching your query. Try generating one with AI!</div>`;
      return;
    }

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'post-card glass-card';
      card.innerHTML = `
        <div class="post-card-category">${post.category}</div>
        <h3 class="post-card-title">${post.title}</h3>
        <p class="post-card-excerpt">${post.excerpt}</p>
        <div class="post-card-meta">
          <span>📅 ${post.date}</span>
          <span>⏱ ${post.readTime}</span>
        </div>
        <div class="post-card-footer">
          <div class="tag-row">
            ${post.tags.slice(0, 2).map(t => `<span class="tag-pill">#${t}</span>`).join('')}
          </div>
          <button class="btn btn-secondary btn-sm btn-read-post" data-id="${post.id}">
            Read ➔
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach Read Button Events
    document.querySelectorAll('.btn-read-post').forEach(btn => {
      btn.addEventListener('click', () => openArticleModal(btn.dataset.id));
    });
  }

  // Open Article Detail Reader Modal
  function openArticleModal(id) {
    const post = window.blogStore.getPostById(id);
    if (!post) return;

    // Increment views
    post.views = (post.views || 0) + 1;
    window.blogStore.savePost(post);

    const modal = document.getElementById('article-modal');
    const body = document.getElementById('modal-article-content');

    body.innerHTML = `
      <div class="article-reader-header">
        <span class="brand-badge">${post.category}</span>
        <h1 style="font-size: 2.2rem; margin: 0.75rem 0; font-weight: 800;">${post.title}</h1>
        <div class="meta-row" style="color: var(--text-secondary); font-size: 0.9rem;">
          <span>By ${post.author}</span> • <span>${post.date}</span> • <span>${post.readTime}</span> • <span>👁 ${post.views} views</span>
        </div>
      </div>
      <div class="article-reader-body" style="margin-top: 2rem; line-height: 1.8;">
        ${window.markdownEditor.parseMarkdown(post.content)}
      </div>
    `;

    modal.classList.add('active');
  }

  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('article-modal').classList.remove('active');
  });

  // AI Content Generator Form
  const aiForm = document.getElementById('ai-generator-form');
  if (aiForm) {
    aiForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('ai-topic').value;
      const category = document.getElementById('ai-category').value;
      const tone = document.getElementById('ai-tone').value;

      const btn = aiForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '⚡ Generating AI Content...';

      try {
        const article = await window.aiEngine.generateArticle(topic, category, tone);
        
        // Populate Editor
        document.getElementById('editor-title').value = article.title;
        document.getElementById('editor-category').value = article.category;
        document.getElementById('editor-textarea').value = article.content;
        window.markdownEditor.updatePreview();
        triggerSEOAnalysis();

        switchView('editor');
        showToast('AI Article generated successfully! Switch to Editor tab.', 'success');
      } catch (err) {
        showToast('Failed to generate AI article.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ Generate AI Article';
      }
    });
  }

  // Real-time SEO Analysis Trigger
  function triggerSEOAnalysis() {
    const title = document.getElementById('editor-title')?.value || '';
    const content = document.getElementById('editor-textarea')?.value || '';
    const keyword = document.getElementById('editor-keyword')?.value || '';

    const results = window.seoAnalyzer.analyze(title, content, keyword);

    // Update UI
    const scoreVal = document.getElementById('seo-score-value');
    const scoreBar = document.getElementById('seo-score-bar');
    const wordCount = document.getElementById('seo-word-count');
    const readTime = document.getElementById('seo-read-time');
    const feedbackList = document.getElementById('seo-feedback-list');

    if (scoreVal) scoreVal.textContent = `${results.score}/100`;
    if (scoreBar) {
      scoreBar.style.width = `${results.score}%`;
      scoreBar.style.backgroundColor = results.score >= 80 ? '#00b09b' : results.score >= 50 ? '#f6d365' : '#ff4b2b';
    }
    if (wordCount) wordCount.textContent = `${results.wordCount} words`;
    if (readTime) readTime.textContent = results.readingTime;

    if (feedbackList) {
      feedbackList.innerHTML = results.feedback.map(item => `<li>${item}</li>`).join('');
    }
  }

  ['editor-title', 'editor-textarea', 'editor-keyword'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', triggerSEOAnalysis);
  });

  // Editor Formatting Buttons
  document.querySelectorAll('.btn-format').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      if (format === 'bold') window.markdownEditor.insertFormat('**', '**');
      if (format === 'italic') window.markdownEditor.insertFormat('*', '*');
      if (format === 'h2') window.markdownEditor.insertFormat('\n## ');
      if (format === 'quote') window.markdownEditor.insertFormat('\n> ');
      if (format === 'code') window.markdownEditor.insertFormat('`', '`');
    });
  });

  // Save Article Button
  document.getElementById('btn-save-article')?.addEventListener('click', () => {
    const title = document.getElementById('editor-title').value.trim();
    const category = document.getElementById('editor-category').value;
    const content = document.getElementById('editor-textarea').value.trim();

    if (!title || !content) {
      showToast('Title and Article content cannot be empty.', 'error');
      return;
    }

    const seo = window.seoAnalyzer.analyze(title, content);
    window.blogStore.savePost({
      title,
      category,
      content,
      excerpt: content.replace(/[#*`\-\\]/g, '').substring(0, 140) + '...',
      readTime: seo.readingTime,
      author: 'Ankita Priyadarshini Pallai',
      tags: [category.replace(/\s+/g, ''), 'BlogSphere']
    });

    showToast('Article published to BlogSphere Feed!', 'success');
    switchView('feed');
  });

  // Export Buttons
  document.getElementById('btn-export-md')?.addEventListener('click', () => {
    window.markdownEditor.exportMarkdown('blogsphere-article.md');
  });

  document.getElementById('btn-export-html')?.addEventListener('click', () => {
    window.markdownEditor.exportHTML('blogsphere-article.html');
  });

  // Search & Filter
  document.getElementById('feed-search')?.addEventListener('input', (e) => {
    const cat = document.getElementById('feed-category-filter')?.value || 'All';
    renderFeed(e.target.value, cat);
  });

  document.getElementById('feed-category-filter')?.addEventListener('change', (e) => {
    const query = document.getElementById('feed-search')?.value || '';
    renderFeed(query, e.target.value);
  });

  // Analytics Render
  function renderAnalytics() {
    const posts = window.blogStore.getPosts();
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);

    document.getElementById('analytics-total-posts').textContent = posts.length;
    document.getElementById('analytics-total-views').textContent = totalViews.toLocaleString();
    document.getElementById('analytics-total-likes').textContent = totalLikes.toLocaleString();
  }

  // Toast System
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div class="toast-message">${msg}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Init
  switchView('feed');
});
