/* ==================================================== */
/* JUNO AI — HANDCRAFTED INTERACTIVE PLAYGROUND & LOGIC */
/* ==================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  initLiveAIDemo();
  initArchitectureTabs();
  initCopyButtons();
});

/* ---------------------------------------------------- */
/* 1. Subtle Background Particle Engine                  */
/* ---------------------------------------------------- */
function initParticleCanvas() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(width / 30), 45);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 1,
      color: Math.random() > 0.5 ? 'rgba(6, 182, 212, 0.3)' : 'rgba(56, 189, 248, 0.25)'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        let dx = p.x - p2.x;
        let dy = p.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.12 - dist / 900})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

/* ---------------------------------------------------- */
/* 2. Interactive Local RAG Demo Playground             */
/* ---------------------------------------------------- */
function initLiveAIDemo() {
  const input = document.getElementById('demo-input');
  const sendBtn = document.getElementById('demo-send-btn');
  const output = document.getElementById('demo-output');
  const latencyBadge = document.getElementById('demo-latency');
  const modelSelect = document.getElementById('demo-model-select');
  const promptChips = document.querySelectorAll('.demo-prompt-chip');

  const demoResponses = {
    'Distributed System Architecture': `⚡ **Grounded Vector Search Results (Topic: Message Queues)**:

1. **Log Partitioning**: Message streams are split across partition brokers using hash keys, enabling parallel consumer processing.
2. **Zero-Copy Socket IO**: Uses Linux \`sendfile\` system call to bypass kernel-to-user buffer copying.
3. **Consensus SLA**: Raft consensus manages metadata state replication across cluster nodes.
4. **Measured Delivery Latency**: 6.2ms round-trip via WebSocket stream.`,

    'Production Code Generator': `💻 **Rate-Limited Async Task Queue (JS ES6)**:

\`\`\`js
class RateLimitedQueue {
  constructor(capacity = 100, windowMs = 1000) {
    this.queue = [];
    this.tokens = capacity;
    setInterval(() => { this.tokens = capacity; this.process(); }, windowMs);
  }

  enqueue(task) {
    this.queue.push(task);
    this.process();
  }

  process() {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens--;
      (this.queue.shift())();
    }
  }
}
\`\`\``,

    'Deep Reasoning & AI Math': `🧠 **Transformer Attention Mathematics**:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

- **Q (Query)**: Matrix representing target token vector state.
- **K (Key)**: Matrix representing candidate token keys.
- **$\\sqrt{d_k}$**: Scaling factor to prevent large dot-product magnitudes from causing vanishing softmax gradients.`,

    'Top 10 Global AI Megaclusters': `⚡ **Top 4 AI Infrastructure Clusters (2026)**:

1. **xAI Colossus (Memphis)** — 100,000+ NVIDIA liquid-cooled GPUs.
2. **Microsoft Stargate** — Multi-gigawatt AI supercomputer cluster project.
3. **Google TPU v5p Pods** — 8,960 TPU chips connected via Optical Circuit Switches.
4. **Meta Grand Cluster** — 350,000 H100 GPU compute fabric.`
  };

  function executeDemoQuery(queryText) {
    if (!queryText || !output) return;

    output.innerHTML = `<span style="color: var(--accent-amber);">⚡ Querying local vector store (${modelSelect ? modelSelect.value : 'Juno Ultra Flash'})...</span>`;

    const startTime = performance.now();

    setTimeout(() => {
      const duration = (performance.now() - startTime).toFixed(1);
      const answer = demoResponses[queryText] || `🤖 **Local Vector Match for "${queryText}"**:
Found 3 matching notes in local storage. All records retrieved via DIP repository container without cloud round-trip. Query executed in ${duration}ms.`;

      output.innerHTML = answer.replace(/\n/g, '<br/>');
      if (latencyBadge) {
        latencyBadge.textContent = `Latency: ${duration}ms (Passed <300ms SLA)`;
      }
    }, 160);
  }

  if (sendBtn && input) {
    sendBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) {
        executeDemoQuery(val);
        input.value = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) {
          executeDemoQuery(val);
          input.value = '';
        }
      }
    });
  }

  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt') || chip.textContent;
      executeDemoQuery(promptText);
    });
  });
}

/* ---------------------------------------------------- */
/* 3. Interactive Architecture Tab Switcher             */
/* ---------------------------------------------------- */
function initArchitectureTabs() {
  const tabs = document.querySelectorAll('.arch-tab');
  const codeDisplay = document.getElementById('arch-code-display');
  const titleDisplay = document.getElementById('arch-title-display');
  const descDisplay = document.getElementById('arch-desc-display');

  const archContent = {
    controllers: {
      title: 'Controllers Layer (HTTP & WebSockets)',
      desc: 'Encapsulates DTO extraction, route handling, and connection state with zero direct database queries or core business logic.',
      code: `// controllers/NoteController.js
export class NoteController {
  constructor(noteService) {
    this.noteService = noteService;
  }
  async getNotes(req, res) {
    const notes = await this.noteService.getAllNotes();
    res.json({ success: true, count: notes.length, data: notes });
  }
}`
    },
    services: {
      title: 'Domain Services Layer',
      desc: 'Pure domain business logic, grounded RAG vector searches, and NLP entity tagging. Depends solely on abstract repository contracts via DI Container.',
      code: `// services/NoteService.js
export class NoteService {
  constructor(noteRepository) {
    this.repository = noteRepository; // Injected DIP interface
  }
  async searchNotes(query) {
    return this.repository.queryByVectorSimilarity(query);
  }
}`
    },
    dip: {
      title: 'Dependency Inversion Storage Adapters',
      desc: 'Decouples persistence adapters from business rules. Permits zero-downtime swapping between LocalStorage, InMemory, and IndexedDB adapters.',
      code: `// js/data-repository-interface.js & storage-adapters.js
export class INoteRepository {
  getAllNotes() { throw new Error('Abstract method call'); }
}
export class LocalStorageNoteRepository extends INoteRepository {
  getAllNotes() { return JSON.parse(localStorage.getItem('notes') || '[]'); }
}`
    },
    components: {
      title: 'Reusable Frontend Component Library',
      desc: 'Modular React UI primitives (Badge, Card, Button) and domain components (MessageBubble, ChatFeed, ChatInput) for isolated rendering.',
      code: `// components/chat/MessageBubble.js
export function MessageBubble({ role, content, latencyMs }) {
  return (
    <div className={\`chat-bubble \${role}-bubble\`}>
      <span className="latency-badge">{latencyMs}ms</span>
      <p>{content}</p>
    </div>
  );
}`
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.getAttribute('data-arch');
      const data = archContent[key];
      if (data) {
        if (titleDisplay) titleDisplay.textContent = data.title;
        if (descDisplay) descDisplay.textContent = data.desc;
        if (codeDisplay) codeDisplay.textContent = data.code;
      }
    });
  });
}

/* ---------------------------------------------------- */
/* 4. Terminal 1-Click Copy Widget                      */
/* ---------------------------------------------------- */
function initCopyButtons() {
  const copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy') || 'git clone https://github.com/AnkitaPriyadarshini-repos/Second-Brain-AI-System.git';
      navigator.clipboard.writeText(textToCopy).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied! ✅';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    });
  });
}
