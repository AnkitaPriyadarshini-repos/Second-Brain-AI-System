// ============================================
// BlogSphere AI — Blogging & Content Platform
// Module: Local Data Store, Theme Engine & Persistence
// Author: Ankita Priyadarshini Pallai
// ============================================

const INITIAL_POSTS = [
  {
    id: 'post-1',
    title: 'The Future of Web Development with AI Co-Engineers',
    slug: 'future-of-web-development-ai-co-engineers',
    category: 'Artificial Intelligence',
    author: 'Ankita Priyadarshini Pallai',
    date: '2026-07-24',
    readTime: '5 min read',
    tags: ['AI', 'WebDev', 'FutureTech'],
    excerpt: 'Explore how generative AI assistants and agentic coding platforms are redefining frontend workflows, automated testing, and software architecture.',
    content: `# The Future of Web Development with AI Co-Engineers

Artificial Intelligence is no longer just a autocomplete tool for code snippets—it has evolved into **agentic pair programmers** capable of understanding entire project architectures.

## 🚀 Key Shifts in Software Engineering

1. **Context-Aware Codebase Comprehension**: Modern AI models analyze whole repositories, tracing cross-file dependencies and API contracts.
2. **Automated Verification Loops**: Rather than just outputting text, AI agents run unit test suites and verify execution before committing.
3. **Design System Generation**: Creating glassmorphic responsive interfaces with dynamic design tokens in seconds.

> "The developer of tomorrow will orchestrate AI systems rather than typing every syntax character manually."

## 💻 Code Example

\`\`\`javascript
// AI-assisted API Handler
async function fetchBlogPost(slug) {
  const response = await fetch(\`/api/posts/\${slug}\`);
  if (!response.ok) throw new Error('Post not found');
  return response.json();
}
\`\`\`

## Conclusion
Embracing AI tools elevates developers from code typists to high-level system architects.`,
    views: 1420,
    likes: 98,
    isFeatured: true
  },
  {
    id: 'post-2',
    title: 'Mastering Responsive Glassmorphism Design in 2026',
    slug: 'mastering-responsive-glassmorphism-design-2026',
    category: 'UI/UX Design',
    author: 'Ankita Priyadarshini Pallai',
    date: '2026-07-22',
    readTime: '4 min read',
    tags: ['CSS3', 'UI Design', 'Frontend'],
    excerpt: 'A comprehensive guide to creating futuristic translucent UI cards, glowing neon accents, and accessible contrast ratios using modern CSS3.',
    content: `# Mastering Responsive Glassmorphism Design in 2026

Glassmorphism continues to dominate modern web aesthetic trends by combining frosted glass overlays with dynamic background radial gradients.

## 🎨 Key CSS Design Tokens

To achieve a sleek glass card effect:

\`\`\`css
.glass-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}
\`\`\`

## Best Practices
- **Maintain Accessibility**: Always test text contrast against background gradients.
- **Subtle Neon Accents**: Use cyan (\`#00f2fe\`) and purple (\`#9b51e0\`) for interactive focus states.`,
    views: 950,
    likes: 74,
    isFeatured: false
  },
  {
    id: 'post-3',
    title: 'Building Scalable Micro-Frontends with Clean Architecture',
    slug: 'building-scalable-micro-frontends-clean-architecture',
    category: 'Engineering',
    author: 'Ankita Priyadarshini Pallai',
    date: '2026-07-20',
    readTime: '6 min read',
    tags: ['Architecture', 'JavaScript', 'Scale'],
    excerpt: 'Learn how to structure multi-team web applications into decoupled micro-frontends with unified state management and fast build targets.',
    content: `# Building Scalable Micro-Frontends with Clean Architecture

Scaling web applications across multiple independent teams requires modular boundaries and clear communication protocols.

## Core Architectural Principles
- **Loose Coupling**: Sub-applications should operate independently without shared global mutations.
- **Unified Event Bus**: Communication between modules using custom DOM events or lightweight pub-sub state engines.
- **Shared Design Tokens**: Consistent typography, CSS variables, and component tokens.`,
    views: 1890,
    likes: 135,
    isFeatured: false
  }
];

class BlogStore {
  constructor() {
    this.storageKey = 'blogsphere_posts_v1';
    this.themeKey = 'blogsphere_theme_v1';
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(INITIAL_POSTS));
    }
  }

  getPosts() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : INITIAL_POSTS;
    } catch (e) {
      return INITIAL_POSTS;
    }
  }

  getPostById(id) {
    const posts = this.getPosts();
    return posts.find(p => p.id === id || p.slug === id);
  }

  savePost(postData) {
    const posts = this.getPosts();
    const existingIdx = posts.findIndex(p => p.id === postData.id);

    if (existingIdx >= 0) {
      posts[existingIdx] = { ...posts[existingIdx], ...postData, updatedAt: new Date().toISOString() };
    } else {
      const newPost = {
        id: `post-${Date.now()}`,
        slug: postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        date: new Date().toISOString().split('T')[0],
        views: 0,
        likes: 0,
        isFeatured: false,
        ...postData
      };
      posts.unshift(newPost);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(posts));
    return posts;
  }

  deletePost(id) {
    let posts = this.getPosts();
    posts = posts.filter(p => p.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(posts));
    return posts;
  }

  searchPosts(query = '', category = 'All') {
    let posts = this.getPosts();
    if (category !== 'All') {
      posts = posts.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      posts = posts.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return posts;
  }
}

window.blogStore = new BlogStore();
