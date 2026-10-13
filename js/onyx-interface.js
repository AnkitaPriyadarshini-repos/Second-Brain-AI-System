/**
 * Onyx Interface Controller
 * Provides interactive state, sample session loading, thought accordions,
 * model dropdowns, sources drawer, and connector modals.
 */

(function () {
  'use strict';

  const ONYX_SHOWCASE_SESSION = {
    id: 'onyx_use_cases',
    title: 'Onyx Use Cases',
    userQuery: 'What are some good use cases for Onyx? Give me a concise answer.',
    thoughtTime: '27s',
    thoughtSteps: 2,
    thoughtDetails: [
      'Step 1: Retrieved verified deployment and enterprise capability records across connectors.',
      'Step 2: Grouped applications into enterprise search, internal assistant, customer intelligence, feedback synthesis, sales enablement, and knowledge preservation.'
    ],
    answerMarkdown: `Good Onyx use cases include:

• **Enterprise search**: Find answers across Slack, Google Drive, email, CRM, tickets, and other tools.
• **Internal AI assistant**: Answer company-specific questions with source-backed responses.
• **Customer intelligence**: Analyze calls, support tickets, CRM data, and usage signals to identify ICPs and improve messaging <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.
• **Product feedback synthesis**: Cluster duplicate issues, detect trends, and prioritize work by customer or revenue impact <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.
• **Sales enablement**: Prepare account briefs, handle objections, and surface relevant proof points <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.
• **Knowledge preservation**: Make decisions and historical context searchable when people or teams change <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.`,
    model: 'GPT-5.0 Sol',
    sources: [
      {
        tool: 'Fireflies',
        type: 'Call Recording & Transcripts',
        title: 'Q3 Product & Customer Intelligence Synthesis',
        snippet: 'Identified top ICP signals: multi-source knowledge search, meeting transcript ingestion, and source-backed answers for support and sales teams.'
      },
      {
        tool: 'Slack',
        type: 'Team Communication',
        title: '#enterprise-architecture discussions',
        snippet: 'Connectors for Google Drive, Confluence, Slack, and Zendesk unified into private semantic search.'
      },
      {
        tool: 'Google Drive',
        type: 'Product Documentation',
        title: 'Onyx Enterprise Playbook v4.4.6',
        snippet: 'Role-based access control, document-level security, and private LLM routing.'
      }
    ]
  };

  class OnyxInterfaceController {
    constructor() {
      this.currentModel = 'GPT-5.0 Sol';
      this.currentSessionId = 'onyx_use_cases';
      this.isSidebarCollapsed = false;
      this.thoughtExpanded = false;
    }

    init() {
      this.bindSidebarToggle();
      this.bindModelPill();
      this.bindInputEvents();
      this.bindKeyboardShortcuts();
      
      // Auto-load Onyx showcase conversation if first visit or active
      const container = document.getElementById('chat-container');
      if (container && (!container.children.length || container.innerHTML.trim() === '')) {
        this.loadSession(ONYX_SHOWCASE_SESSION.id);
      }
    }

    bindSidebarToggle() {
      const toggleBtns = document.querySelectorAll('.onyx-sidebar-collapse-btn');
      toggleBtns.forEach((btn) => {
        btn.onclick = () => this.toggleSidebar();
      });
    }

    toggleSidebar() {
      const sidebar = document.getElementById('app-sidebar');
      if (!sidebar) return;
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      sidebar.classList.toggle('sidebar-collapsed', this.isSidebarCollapsed);
    }

    bindModelPill() {
      const pill = document.getElementById('onyx-model-pill');
      const dropdown = document.getElementById('onyx-model-dropdown');
      if (!pill || !dropdown) return;

      pill.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      };

      document.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('open');
      });

      const options = dropdown.querySelectorAll('.onyx-model-option');
      options.forEach((opt) => {
        opt.onclick = () => {
          const modelName = opt.getAttribute('data-model');
          if (modelName) this.selectModel(modelName);
        };
      });
    }

    selectModel(modelName) {
      this.currentModel = modelName;
      const label = document.getElementById('onyx-model-name-label');
      if (label) label.textContent = modelName;

      const dropdown = document.getElementById('onyx-model-dropdown');
      if (dropdown) {
        dropdown.querySelectorAll('.onyx-model-option').forEach((opt) => {
          opt.classList.toggle('selected', opt.getAttribute('data-model') === modelName);
        });
        dropdown.classList.remove('open');
      }
      if (window.showToast) window.showToast(`Switched active model to ${modelName}`, 'info');
    }

    bindInputEvents() {
      const input = document.getElementById('rag-query-input');
      const submitBtn = document.getElementById('rag-submit-btn');
      if (!input || !submitBtn) return;

      input.addEventListener('input', () => {
        const val = input.value.trim();
        submitBtn.classList.toggle('active', val.length > 0);
      });
    }

    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + K opens search
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (window.openSearchChatsModal) window.openSearchChatsModal();
        }
      });
    }

    loadSession(sessionId) {
      this.currentSessionId = sessionId;

      // Update sidebar active highlights
      document.querySelectorAll('.onyx-sidebar-item').forEach((item) => {
        const sid = item.getAttribute('data-session-id');
        item.classList.toggle('active', sid === sessionId);
      });

      const container = document.getElementById('chat-container');
      const hero = document.getElementById('chat-hero-view');
      if (!container) return;

      if (sessionId === 'onyx_use_cases') {
        if (hero) hero.style.display = 'none';
        container.style.display = 'flex';
        container.innerHTML = this.renderOnyxShowcaseHTML();
      } else {
        // Clear for fresh session or generic note session
        if (hero) hero.style.display = 'none';
        container.style.display = 'flex';
        container.innerHTML = `
          <div class="chat-message-bubble user-bubble">
            <div class="chat-message-content">Hello, can you help me with ${sessionId.replace(/_/g, ' ')}?</div>
          </div>
          <div class="chat-message-bubble assistant-bubble">
            <div class="chat-message-content">
              I am ready to assist with <strong>${sessionId.replace(/_/g, ' ')}</strong> across your connected knowledge base and tools. How would you like to proceed?
            </div>
            <div class="onyx-turn-actions-bar">
              <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.copyCurrentTurn(this)" title="Copy">📋</button>
              <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(true)" title="Helpful">👍</button>
              <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(false)" title="Unhelpful">👎</button>
              <button class="onyx-sources-btn" onclick="window.OnyxInterface.openSourcesDrawer()">📑 Sources</button>
            </div>
          </div>
        `;
      }
    }

    renderOnyxShowcaseHTML() {
      const s = ONYX_SHOWCASE_SESSION;
      return `
        <!-- User Question Bubble -->
        <div class="chat-message-bubble user-bubble">
          <div class="chat-message-content">${s.userQuery}</div>
        </div>

        <!-- Assistant Answer Turn -->
        <div class="chat-message-bubble assistant-bubble" id="onyx-assistant-turn-primary">
          
          <!-- Collapsible Thought Accordion -->
          <div class="onyx-thought-box">
            <div class="onyx-thought-header" onclick="window.OnyxInterface.toggleThought()">
              <div class="onyx-thought-left">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Thought for ${s.thoughtTime}</span>
                <svg id="onyx-thought-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transition: transform 0.2s ease;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div class="onyx-thought-right">
                <span class="onyx-steps-badge">${s.thoughtSteps} steps</span>
                <button class="onyx-action-icon-btn" title="Refresh reasoning" onclick="event.stopPropagation(); window.OnyxInterface.refreshReasoning();">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </button>
              </div>
            </div>
            <div id="onyx-thought-content" class="onyx-thought-content">
              ${s.thoughtDetails.map(d => `<div style="margin-bottom: 4px;">• ${d}</div>`).join('')}
            </div>
          </div>

          <!-- Answer Markdown Content -->
          <div class="chat-message-content">
            <p style="margin-bottom: 12px; font-weight: 500; color: #111827;">Good Onyx use cases include:</p>
            <ul style="padding-left: 20px; margin: 10px 0 16px 0; display: flex; flex-direction: column; gap: 9px; list-style-type: disc;">
              <li style="line-height: 1.6;"><strong style="color: #111827;">Enterprise search</strong>: Find answers across Slack, Google Drive, email, CRM, tickets, and other tools.</li>
              <li style="line-height: 1.6;"><strong style="color: #111827;">Internal AI assistant</strong>: Answer company-specific questions with source-backed responses.</li>
              <li style="line-height: 1.6;"><strong style="color: #111827;">Customer intelligence</strong>: Analyze calls, support tickets, CRM data, and usage signals to identify ICPs and improve messaging <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.</li>
              <li style="line-height: 1.6;"><strong style="color: #111827;">Product feedback synthesis</strong>: Cluster duplicate issues, detect trends, and prioritize work by customer or revenue impact <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.</li>
              <li style="line-height: 1.6;"><strong style="color: #111827;">Sales enablement</strong>: Prepare account briefs, handle objections, and surface relevant proof points <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.</li>
              <li style="line-height: 1.6;"><strong style="color: #111827;">Knowledge preservation</strong>: Make decisions and historical context searchable when people or teams change <span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('fireflies')">Fireflies</span>.</li>
            </ul>
          </div>

          <!-- Response Action Toolbar -->
          <div class="onyx-turn-actions-bar">
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.copyCurrentTurn(this)" title="Copy response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(true)" title="Good response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(false)" title="Poor response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.regenerateShowcase()" title="Regenerate">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.reportIssue()" title="Report issue">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </button>
            <button class="onyx-sources-btn" onclick="window.OnyxInterface.openSourcesDrawer()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span>Sources</span>
            </button>
          </div>
        </div>
      `;
    }

    toggleThought() {
      const content = document.getElementById('onyx-thought-content');
      const chevron = document.getElementById('onyx-thought-chevron');
      if (!content) return;
      this.thoughtExpanded = !this.thoughtExpanded;
      content.classList.toggle('open', this.thoughtExpanded);
      if (chevron) {
        chevron.style.transform = this.thoughtExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    }

    openSourcesDrawer(toolFilter) {
      const drawer = document.getElementById('onyx-sources-drawer-overlay');
      const container = document.getElementById('onyx-sources-cards-container');
      if (!drawer || !container) return;

      const sources = ONYX_SHOWCASE_SESSION.sources;
      container.innerHTML = sources.map(s => `
        <div class="onyx-source-card">
          <div class="onyx-source-card-header">
            <span class="onyx-source-tag">${s.tool}</span>
            <span style="font-size: 11px; color: #9CA3AF;">${s.type}</span>
          </div>
          <div style="font-size: 13.5px; font-weight: 600; color: #111827;">${s.title}</div>
          <div style="font-size: 12.5px; line-height: 1.5; color: #4B5563;">${s.snippet}</div>
        </div>
      `).join('');

      drawer.classList.add('open');
    }

    closeSourcesDrawer() {
      const drawer = document.getElementById('onyx-sources-drawer-overlay');
      if (drawer) drawer.classList.remove('open');
    }

    openConnectorsModal() {
      const modal = document.getElementById('onyx-connectors-modal-overlay');
      if (modal) modal.classList.add('open');
    }

    closeConnectorsModal() {
      const modal = document.getElementById('onyx-connectors-modal-overlay');
      if (modal) modal.classList.remove('open');
    }

    copyCurrentTurn(btn) {
      const text = ONYX_SHOWCASE_SESSION.answerMarkdown.replace(/<[^>]+>/g, '');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          if (window.showToast) window.showToast('Copied answer to clipboard', 'success');
        });
      }
    }

    rateTurn(isPositive) {
      if (window.showToast) {
        window.showToast(isPositive ? 'Thanks for the feedback!' : 'Feedback recorded', 'info');
      }
    }

    refreshReasoning() {
      if (window.showToast) window.showToast('Reasoning refreshed across active connectors', 'info');
    }

    reportIssue() {
      if (window.showToast) window.showToast('Report submitted to Onyx administration', 'info');
    }

    regenerateShowcase() {
      if (window.showToast) window.showToast('Regenerating response with current temperature settings...', 'info');
    }

    createNewSession() {
      const container = document.getElementById('chat-container');
      const hero = document.getElementById('chat-hero-view');
      const input = document.getElementById('rag-query-input');

      if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
      }
      if (hero) {
        hero.style.display = 'flex';
      }
      if (input) {
        input.value = '';
        input.focus();
      }

      document.querySelectorAll('.onyx-sidebar-item').forEach(i => i.classList.remove('active'));
      if (window.showToast) window.showToast('New session started', 'info');
    }

    shareSession() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
      }
      if (window.showToast) window.showToast('Session link copied to clipboard!', 'success');
    }

    selectAgent(agentId) {
      const input = document.getElementById('rag-query-input');
      if (agentId === 'support') {
        if (input) input.placeholder = 'Ask Customer Support AI anything...';
        if (window.showToast) window.showToast('Active persona: Customer Support AI', 'info');
      } else if (agentId === 'sales') {
        if (input) input.placeholder = 'Ask Sales Assistant for account briefs & signals...';
        if (window.showToast) window.showToast('Active persona: Sales Assistant', 'info');
      } else if (agentId === 'helpdesk') {
        if (window.activateView) window.activateView('code');
      }
    }
  }

  window.OnyxInterface = new OnyxInterfaceController();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.OnyxInterface.init());
  } else {
    window.OnyxInterface.init();
  }
})();
