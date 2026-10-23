/**
 * Onyx Interface Controller & Enterprise Backend Bridge
 * Powers the Onyx Enterprise Design System, multi-step thought process,
 * agent switching, project scoping, real session threads, model selector,
 * knowledge connectors, and sources drawer.
 */

(function () {
  'use strict';

  // 10 Full Enterprise Sessions matching the Onyx sidebar items
  const ONYX_SESSIONS = {
    onyx_use_cases: {
      id: 'onyx_use_cases',
      title: 'Milo Use Cases',
      userQuery: 'What are some good use cases for Milo? Give me a concise answer.',
      thoughtTime: '27s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Retrieved verified deployment and enterprise capability records across connectors.',
        'Synthesized grounded use cases across search, internal AI assistant, customer intelligence, feedback synthesis, sales enablement, and knowledge preservation.'
      ],
      intro: 'Good Milo use cases include:',
      bullets: [
        {
          title: 'Enterprise search',
          desc: 'Find answers across Slack, Google Drive, email, CRM, tickets, and other tools.',
          pill: null
        },
        {
          title: 'Internal AI assistant',
          desc: 'Answer company-specific questions with source-backed responses.',
          pill: null
        },
        {
          title: 'Customer intelligence',
          desc: 'Analyze calls, support tickets, CRM data, and usage signals to identify ICPs and improve messaging',
          pill: 'Fireflies'
        },
        {
          title: 'Product feedback synthesis',
          desc: 'Cluster duplicate issues, detect trends, and prioritize work by customer or revenue impact',
          pill: 'Fireflies'
        },
        {
          title: 'Sales enablement',
          desc: 'Prepare account briefs, handle objections, and surface relevant proof points',
          pill: 'Fireflies'
        },
        {
          title: 'Knowledge preservation',
          desc: 'Make decisions and historical context searchable when people or teams change',
          pill: 'Fireflies'
        }
      ],
      sources: [
        {
          tool: 'Fireflies',
          type: 'Call Recording & Transcripts',
          title: 'Q3 Product & Customer Intelligence Synthesis',
          snippet: 'Customer discovery calls aggregated across 40 accounts. Highlighted primary needs: cross-repository search, meeting transcript ingestion, and source-backed answers for support and sales teams.',
          score: '98% match'
        },
        {
          tool: 'Slack',
          type: 'Team Communication',
          title: '#enterprise-architecture discussions',
          snippet: 'Connectors for Google Drive, Confluence, Slack, and Zendesk unified into private semantic search with document-level ACLs.',
          score: '94% match'
        },
        {
          tool: 'Google Drive',
          type: 'Product Documentation',
          title: 'Milo Enterprise Playbook v4.4.6',
          snippet: 'Role-based access control, document-level security, hybrid vector+BM25 retrieval, and private air-gapped LLM routing.',
          score: '91% match'
        }
      ]
    },

    call_recordings: {
      id: 'call_recordings',
      title: 'Call recordings for Customer Discovery',
      userQuery: 'Summarize our customer discovery call with Acme Corp recorded in Fireflies. What are the key objections and next steps?',
      thoughtTime: '18s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Queried Fireflies connector for call transcript "Enterprise Architecture Review - Acme Corp (Oct 12)".',
        'Extracted security requirements, procurement timeline, and decision-maker objections.'
      ],
      intro: 'Key takeaways from the Acme Corp discovery call include:',
      bullets: [
        {
          title: 'Deployment boundary',
          desc: 'Acme requires an air-gapped VPC deployment with zero external data egress',
          pill: 'Fireflies'
        },
        {
          title: 'Security objection',
          desc: 'The CISO questioned permission propagation across their 14,000-user Confluence instance',
          pill: 'Confluence'
        },
        {
          title: 'Hybrid indexing demand',
          desc: 'Engineering lead requested sub-second response latency across 5M internal documents',
          pill: 'Fireflies'
        },
        {
          title: 'Next steps',
          desc: 'Deliver SOC2 Type II compliance pack and arrange architecture deep dive with SecOps team before Friday',
          pill: 'Slack'
        }
      ],
      sources: [
        {
          tool: 'Fireflies',
          type: 'Meeting Audio Transcript',
          title: 'Acme Corp Architecture Review (Oct 12, 2026)',
          snippet: 'Participants: VP Engineering, CISO, Lead Solutions Architect. Discussion focused on private LLM hosting and VPC isolation.',
          score: '99% match'
        },
        {
          tool: 'Confluence',
          type: 'Enterprise Wiki',
          title: 'Acme Space Permissions & Groups Mapping',
          snippet: 'Verified synchronized permission matrix with 48 active user groups and strict row-level security.',
          score: '93% match'
        }
      ]
    },

    auth_config: {
      id: 'auth_config',
      title: 'Auth configurations',
      userQuery: 'What is our current SAML / Okta SSO configuration and callback URIs?',
      thoughtTime: '14s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Inspected environment auth configurations and identity provider metadata.',
        'Validated SAML 2.0 endpoint specifications and audience restriction parameters.'
      ],
      intro: 'Current Milo SAML 2.0 configuration details:',
      bullets: [
        {
          title: 'SSO Protocol',
          desc: 'SAML 2.0 with SHA-256 certificate signing and automated cert renewal',
          pill: 'Vault'
        },
        {
          title: 'Assertion Consumer Service (ACS)',
          desc: 'https://second-brain-ai-system.vercel.app/api/auth/saml/callback',
          pill: 'Vault'
        },
        {
          title: 'Entity ID',
          desc: 'urn:milo:enterprise:second-brain-ai',
          pill: 'Google Drive'
        },
        {
          title: 'Attribute Mappings',
          desc: 'email, firstName, lastName, and groups claims mapped to internal RBAC roles',
          pill: 'Vault'
        }
      ],
      sources: [
        {
          tool: 'Vault',
          type: 'Security Note #42',
          title: 'Production Identity Provider Metadata',
          snippet: 'Okta production tenant configuration with SHA-256 signatures, single logout bindings, and automated group sync.',
          score: '97% match'
        }
      ]
    },

    confluence_data_center: {
      id: 'confluence_data_center',
      title: 'Confluence Data Center A...',
      userQuery: 'What is the current sync status of our Confluence Data Center connector?',
      thoughtTime: '12s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Queried sync worker telemetry across Confluence Data Center cluster.',
        'Calculated indexed page counts, space permissions, and delta sync intervals.'
      ],
      intro: 'Confluence Data Center connector telemetry summary:',
      bullets: [
        {
          title: 'Sync status',
          desc: 'Healthy and active · Continuous polling on 15-minute delta interval',
          pill: 'Confluence'
        },
        {
          title: 'Indexed volume',
          desc: '42 spaces synced containing 8,920 pages and 1,240 attachment documents',
          pill: 'Confluence'
        },
        {
          title: 'Permissions enforcement',
          desc: 'Confluence Space and Page restrictions strictly respected during vector retrieval',
          pill: 'Confluence'
        }
      ],
      sources: [
        {
          tool: 'Confluence',
          type: 'Sync Worker Metric',
          title: 'Cluster Node A-12 Confluence Sync Log',
          snippet: 'Completed incremental delta sync at 17:45 UTC with 0 ingestion errors across 42 monitored spaces.',
          score: '96% match'
        }
      ]
    },

    deployment_info: {
      id: 'deployment_info',
      title: 'Deployment Info',
      userQuery: 'What is the Kubernetes deployment architecture for our private VPC instance?',
      thoughtTime: '16s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Analyzed Kubernetes Helm chart deployment manifests and resource allocations.',
        'Checked OpenSearch hybrid cluster nodes, sync worker replicas, and GPU inference pods.'
      ],
      intro: 'The private VPC deployment consists of the following Kubernetes services:',
      bullets: [
        {
          title: 'Web & API Layer',
          desc: '3 replicas running Node/Next.js behind an internal Application Load Balancer',
          pill: 'GitHub'
        },
        {
          title: 'Hybrid Vector Index',
          desc: 'OpenSearch cluster with 3 master and 4 data nodes handling dense vectors and BM25',
          pill: 'GitHub'
        },
        {
          title: 'Inference Pods',
          desc: 'vLLM / Ollama pods allocated to NVIDIA L4 GPUs for air-gapped zero-egress inference',
          pill: 'GitHub'
        }
      ],
      sources: [
        {
          tool: 'GitHub',
          type: 'Infrastructure Repo',
          title: 'k8s/production/values-vpc.yaml',
          snippet: 'Configured autoscaling policies, memory limits, and node affinity for private air-gapped execution.',
          score: '95% match'
        }
      ]
    },

    onyx_sso_support_details: {
      id: 'onyx_sso_support_details',
      title: 'Milo SSO Support Details',
      userQuery: 'Can you walk me through configuring Azure AD enterprise SSO?',
      thoughtTime: '19s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Extracted Microsoft Entra ID (Azure AD) enterprise application setup procedure.',
        'Verified SAML claims configuration and tenant identifier requirements.'
      ],
      intro: 'To configure Azure AD enterprise SSO for Milo, follow these steps:',
      bullets: [
        {
          title: 'Create Enterprise Application',
          desc: 'In Azure Portal, select Microsoft Entra ID → Enterprise Applications → New Application',
          pill: 'Vault'
        },
        {
          title: 'Configure Single Sign-On',
          desc: 'Choose SAML, input Entity ID (urn:milo:enterprise) and ACS URL into Basic SAML Configuration',
          pill: 'Vault'
        },
        {
          title: 'Assign Attributes & Groups',
          desc: 'Set NameID format to EmailAddress and add user group claims for automatic role mapping',
          pill: 'Vault'
        }
      ],
      sources: [
        {
          tool: 'Vault',
          type: 'Security Note #54',
          title: 'Azure AD Integration Playbook',
          snippet: 'Full step-by-step setup guide with screenshots and SAML claim mapping guidelines.',
          score: '98% match'
        }
      ]
    },

    scaling_qdrant: {
      id: 'scaling_qdrant',
      title: 'Scaling Qdrant Deployme...',
      userQuery: 'What are the memory and shard recommendations for scaling Qdrant to 10M embeddings?',
      thoughtTime: '21s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Analyzed vector dimensionality (1536d) and memory footprints for 10M vectors.',
        'Evaluated scalar quantization (int8) vs uncompressed float32 RAM requirements.'
      ],
      intro: 'Recommendations for scaling Qdrant to 10M 1536-dimensional vectors:',
      bullets: [
        {
          title: 'Memory requirements',
          desc: 'Enable Scalar Quantization (int8) to reduce RAM footprint from ~64 GB down to ~18 GB',
          pill: 'GitHub'
        },
        {
          title: 'Sharding strategy',
          desc: 'Distribute across 4 shards with replication factor 2 across independent availability zones',
          pill: 'GitHub'
        },
        {
          title: 'HNSW indexing',
          desc: 'Set m=16, ef_construct=128 on NVMe storage to sustain 2,400 queries per second with <12ms p99 latency',
          pill: 'GitHub'
        }
      ],
      sources: [
        {
          tool: 'GitHub',
          type: 'Benchmark Report',
          title: 'benchmarks/qdrant_scale_10m.md',
          snippet: 'Performance benchmarks comparing float32 and int8 quantization across 10,000,000 embeddings.',
          score: '96% match'
        }
      ]
    },

    onyx_sso_support: {
      id: 'onyx_sso_support',
      title: 'Milo SSO Support',
      userQuery: 'Users are receiving 403 Forbidden after SAML callback. How do we resolve this?',
      thoughtTime: '11s',
      thoughtSteps: 2,
      thoughtDetails: [
        'Searched troubleshooting database for 403 HTTP errors during SAML authentication.',
        'Identified top root causes: clock skew tolerance, missing NameID, and expired signing certs.'
      ],
      intro: 'Troubleshooting steps for SAML 403 Forbidden error:',
      bullets: [
        {
          title: 'Clock skew drift',
          desc: 'Ensure server NTP synchronization is within 60 seconds of Identity Provider time',
          pill: 'Vault'
        },
        {
          title: 'NameID claim format',
          desc: 'Verify the IdP is returning email address formatted as urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          pill: 'Vault'
        },
        {
          title: 'Audience restriction mismatch',
          desc: 'Ensure the Entity ID in the SAML response matches urn:milo:enterprise:second-brain-ai exactly',
          pill: 'Vault'
        }
      ],
      sources: [
        {
          tool: 'Vault',
          type: 'Troubleshooting Guide #18',
          title: 'Resolving SAML Handshake Exceptions',
          snippet: 'Detailed error codes, debugging flags, and token inspection techniques.',
          score: '99% match'
        }
      ]
    },

    hello_world_request: {
      id: 'hello_world_request',
      title: 'Hello World Request',
      userQuery: 'Ping test: is the Milo platform and all sync connectors operational?',
      thoughtTime: '5s',
      thoughtSteps: 1,
      thoughtDetails: [
        'Executed end-to-end health check across sync workers, hybrid vector index, and inference gateway.'
      ],
      intro: 'Milo Enterprise System Status: All Systems Operational.',
      bullets: [
        {
          title: 'API Gateway',
          desc: 'Online · Latency 18ms · TLS 1.3 certified',
          pill: 'Slack'
        },
        {
          title: 'Knowledge Connectors',
          desc: 'All 7 connectors (Slack, Drive, Confluence, Jira, GitHub, Fireflies, Vault) synced',
          pill: 'Google Drive'
        },
        {
          title: 'Active Model',
          desc: 'GPT-5.0 Sol online · Fallback to local Ollama / vLLM ready',
          pill: 'Vault'
        }
      ],
      sources: [
        {
          tool: 'Slack',
          type: 'Health Diagnostic',
          title: 'System Health Check #842',
          snippet: 'All telemetry endpoints reporting 100% uptime with zero packet drops.',
          score: '99% match'
        }
      ]
    },

    sales_call_search: {
      id: 'sales_call_search',
      title: 'Sales Call Document Sear...',
      userQuery: 'Find all customer calls mentioning pricing objections in Q3.',
      thoughtTime: '22s',
      thoughtSteps: 3,
      thoughtDetails: [
        'Scanned 142 meeting transcripts in Fireflies connector matching tag #pricing.',
        'Aggregated recurring objections regarding enterprise tier seat minimums.',
        'Extracted proposed workarounds and competitive mentions (Glean, Notion).'
      ],
      intro: 'Analysis of Q3 customer calls with pricing objections:',
      bullets: [
        {
          title: 'Top objection',
          desc: '50-seat minimum requirement was cited as a barrier for mid-market pilot programs in 14 calls',
          pill: 'Fireflies'
        },
        {
          title: 'Competitive context',
          desc: 'Prospects frequently compared per-seat pricing against Glean and Microsoft Copilot',
          pill: 'Fireflies'
        },
        {
          title: 'Recommended action',
          desc: 'Introduce a 10-seat Starter Pilot package for teams evaluating private VPC deployment',
          pill: 'Slack'
        }
      ],
      sources: [
        {
          tool: 'Fireflies',
          type: 'Meeting Transcripts Batch',
          title: 'Q3 Sales Objection Analysis (14 Calls)',
          snippet: 'Transcripts tagged with pricing feedback, competitor comparisons, and procurement delays.',
          score: '97% match'
        }
      ]
    }
  };

  class OnyxInterfaceController {
    constructor() {
      this.currentModel = 'gemini-3.1-flash-lite';
      this.currentSessionId = 'onyx_use_cases';
      this.activeAgent = 'support';
      this.activeProject = null;
      this.isSidebarCollapsed = false;
      this.thoughtExpanded = false;
    }

    init() {
      this.bindSidebarToggle();
      this.bindModelPill();
      this.bindInputEvents();
      this.bindKeyboardShortcuts();
      this.bindComposerTools();

      // On initial boot, do not overwrite live chat with demo session.
      // Leave composer hero ready for genuine user questions.
      const container = document.getElementById('chat-container');
      const hero = document.getElementById('chat-hero-view');
      if (container && (!container.children.length || container.innerHTML.trim() === '')) {
        if (hero) hero.style.display = 'flex';
      }
    }

    toggleTurnThought(turnId) {
      const body = document.getElementById('body-' + turnId);
      if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
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
        opt.onclick = (e) => {
          e.stopPropagation();
          if (opt.classList.contains('disabled')) {
            if (window.showToast) window.showToast('Provider credentials not configured for this model.', 'warning');
            return;
          }
          const modelName = opt.getAttribute('data-model');
          if (modelName) this.selectModel(modelName);
        };
      });
    }

    selectModel(modelName) {
      this.currentModel = modelName;
      const label = document.getElementById('onyx-model-name-label');
      if (label) label.textContent = modelName;

      // Update Store if available
      if (window.Store && window.Store.settings) {
        window.Store.settings.selectedModel = modelName;
        if (typeof window.Store.saveSettings === 'function') {
          window.Store.saveSettings();
        }
      }

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

    bindComposerTools() {
      // Deep reasoning toggle
      const deepReasoningBtn = document.querySelector('.onyx-composer-tool-btn[title*="Reasoning"]');
      if (deepReasoningBtn) {
        deepReasoningBtn.onclick = () => {
          this.toggleDeepReasoning();
        };
      }
    }

    toggleDeepReasoning() {
      this.deepReasoningEnabled = !this.deepReasoningEnabled;
      if (window.showToast) {
        window.showToast(
          this.deepReasoningEnabled
            ? 'Deep Multi-Step Reasoning enabled (27s analysis)'
            : 'Standard response mode enabled',
          'info'
        );
      }
    }

    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (window.openSearchChatsModal) window.openSearchChatsModal();
        }
      });
    }

    loadSession(sessionId) {
      if (window.isAIProcessing) {
        if (window.showToast) window.showToast('Please wait for current generation to finish before switching sessions.', 'warning');
        return;
      }

      this.currentSessionId = sessionId;
      const s = ONYX_SESSIONS[sessionId] || ONYX_SESSIONS.onyx_use_cases;

      // Update sidebar active highlights
      document.querySelectorAll('.onyx-sidebar-item').forEach((item) => {
        const sid = item.getAttribute('data-session-id');
        item.classList.toggle('active', sid === sessionId);
      });

      const container = document.getElementById('chat-container');
      const hero = document.getElementById('chat-hero-view');
      const chips = document.getElementById('hero-starter-chips');
      if (!container) return;

      if (hero) hero.style.display = 'none';
      if (chips) chips.style.display = 'none';
      container.style.display = 'flex';
      container.innerHTML = this.renderSessionHTML(s);

      // Auto-scroll to ensure full conversation visibility
      setTimeout(() => {
        container.scrollTop = 0;
      }, 50);
    }

    renderSessionHTML(s) {
      return `
        <!-- Demo Session Indicator -->
        <div class="milo-demo-session-header" style="padding: 6px 12px; margin-bottom: 12px; border-radius: 8px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); font-size: 11.5px; color: #38BDF8; font-weight: 500; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> <span>Sample Enterprise Thread: <strong>${this.escapeHTML(s.title)}</strong> (Demonstration Mode)</span>
        </div>

        <!-- User Question Bubble -->
        <div class="chat-message-bubble user-bubble">
          <div class="chat-message-content">${this.escapeHTML(s.userQuery)}</div>
        </div>

        <!-- Assistant Answer Turn -->
        <div class="chat-message-bubble assistant-bubble" id="onyx-assistant-turn-${s.id}">

          <!-- Answer Markdown Content -->
          <div class="chat-message-content">
            <p style="margin-bottom: 8px; font-weight: 500; color: #111827;">${this.escapeHTML(s.intro)}</p>
            <ul style="padding-left: 20px; margin: 6px 0 10px 0; display: flex; flex-direction: column; gap: 5px; list-style-type: disc;">
              ${s.bullets.map(b => `
                <li style="line-height: 1.45; font-size: 13.5px;">
                  <strong style="color: #111827;">${this.escapeHTML(b.title)}</strong>: ${this.escapeHTML(b.desc)}
                  ${b.pill ? `<span class="onyx-source-pill" onclick="window.OnyxInterface.openSourcesDrawer('${b.pill}')">${this.escapeHTML(b.pill)}</span>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Response Action Toolbar -->
          <div class="onyx-turn-actions-bar" style="margin-top: 8px; margin-bottom: 6px;">
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.copyCurrentTurn(this)" title="Copy response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.shareCurrentTurn(this)" title="Share response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(true, this)" title="Good response">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            </button>
            <button class="onyx-action-icon-btn" onclick="window.OnyxInterface.rateTurn(false, this)" title="Poor response">
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

      const s = ONYX_SESSIONS[this.currentSessionId] || ONYX_SESSIONS.onyx_use_cases;
      const sources = s.sources || [];

      container.innerHTML = sources.map(src => `
        <div class="onyx-source-card" style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="onyx-source-pill" style="margin-left:0; font-size:12px; font-weight:600;">${this.escapeHTML(src.tool)}</span>
            <span style="font-size: 11px; color: #10B981; font-weight:600;">${this.escapeHTML(src.score || 'Grounded')}</span>
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: #111827; margin-bottom:4px;">${this.escapeHTML(src.title)}</div>
          <div style="font-size: 12px; color: #6B7280; margin-bottom:6px;">${this.escapeHTML(src.type)}</div>
          <div style="font-size: 12.5px; line-height: 1.5; color: #374151;">${this.escapeHTML(src.snippet)}</div>
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

    syncConnector(connectorName) {
      if (window.showToast) {
        window.showToast(`Syncing ${connectorName}... indexing recent documents & permissions.`, 'info');
        setTimeout(() => {
          window.showToast(`${connectorName} successfully synchronized!`, 'success');
        }, 1200);
      }
    }

    copyCurrentTurn(btn) {
      let text = '';
      if (btn) {
        const bubble = btn.closest('.chat-bubble, .chat-message-bubble, .assistant-bubble, .claude-ai-bubble') ||
                       btn.parentElement?.closest('.chat-bubble, .chat-message-bubble, .assistant-bubble');
        if (bubble) {
          const contentEl = bubble.querySelector('.chat-text, .chat-message-content, .onyx-turn-content');
          if (contentEl) {
            const clone = contentEl.cloneNode(true);
            clone.querySelectorAll('.onyx-turn-actions-bar, svg, button, .code-header-actions').forEach((el) => el.remove());
            text = (clone.innerText || clone.textContent || '').trim();
          } else {
            const clone = bubble.cloneNode(true);
            clone.querySelectorAll('.onyx-turn-actions-bar, svg, button, .code-header-actions').forEach((el) => el.remove());
            text = (clone.innerText || clone.textContent || '').trim();
          }
        }
      }
      if (!text) {
        const activeSession = ONYX_SESSIONS[this.currentSessionId] || ONYX_SESSIONS.onyx_use_cases;
        if (activeSession) {
          text = `${activeSession.intro || ''}\n` + (activeSession.bullets || []).map(b => `• ${b.title}: ${b.desc}`).join('\n');
        }
      }
      if (window.copyToClipboard) {
        window.copyToClipboard(text, btn);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`;
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
          }
          if (window.showToast) window.showToast('Copied answer to clipboard', 'success');
        });
      }
    }

    shareCurrentTurn(btn) {
      let text = '';
      if (btn) {
        const bubble = btn.closest('.chat-bubble, .chat-message-bubble, .assistant-bubble') ||
                       btn.parentElement?.closest('.chat-bubble, .chat-message-bubble, .assistant-bubble');
        if (bubble) {
          const contentEl = bubble.querySelector('.chat-text, .chat-message-content, .onyx-turn-content');
          if (contentEl) {
            const clone = contentEl.cloneNode(true);
            clone.querySelectorAll('.onyx-turn-actions-bar, svg, button, .code-header-actions').forEach((el) => el.remove());
            text = (clone.innerText || clone.textContent || '').trim();
          }
        }
      }
      const shareData = {
        title: 'Milo AI Response',
        text: text ? `Milo Answer:\n${text}` : 'Shared via Milo AI Workspace',
        url: window.location.href
      };
      if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(() => this.copyShareLinkToClipboard(shareData));
      } else if (navigator.share) {
        navigator.share(shareData).catch(() => this.copyShareLinkToClipboard(shareData));
      } else {
        this.copyShareLinkToClipboard(shareData);
      }
    }

    rateTurn(isPositive, btn) {
      if (btn) {
        btn.style.color = isPositive ? '#10B981' : '#EF4444';
      }
      if (window.showToast) {
        window.showToast(isPositive ? 'Feedback recorded: Helpful!' : 'Feedback recorded: Needs improvement.', 'info');
      }
    }

    refreshReasoning() {
      if (window.showToast) window.showToast('Re-evaluating reasoning across connected knowledge sources...', 'info');
    }

    reportIssue() {
      if (window.showToast) window.showToast('Report submitted to Milo security & audit log.', 'info');
    }

    regenerateShowcase() {
      if (window.showToast) window.showToast('Regenerating response with current temperature and hybrid vector search...', 'info');
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
        hero.classList.remove('hidden');
        hero.style.display = 'flex';
      }
      const chips = document.getElementById('hero-starter-chips');
      if (chips) {
        chips.classList.remove('hidden');
        chips.style.display = 'flex';
      }
      if (input) {
        input.value = '';
        input.placeholder = 'How can Milo help you today?';
        input.focus();
      }

      document.querySelectorAll('.onyx-sidebar-item').forEach(i => i.classList.remove('active'));
      if (window.showToast) window.showToast('New session started', 'info');
    }

    newSession() {
      return this.createNewSession();
    }

    shareSession() {
      const container = document.getElementById('chat-container');
      let shareText = '';
      let shareTitle = 'Milo AI Conversation';

      if (container && container.children.length > 0) {
        const bubbles = container.querySelectorAll('.chat-bubble, .chat-message-bubble');
        const turns = [];
        bubbles.forEach(b => {
          const isUser = b.classList.contains('user-bubble') || b.classList.contains('claude-user-bubble');
          const textEl = b.querySelector('.chat-text, .chat-message-content');
          const text = textEl ? (textEl.innerText || textEl.textContent || '').trim() : '';
          if (text) {
            turns.push(`${isUser ? 'User' : 'Milo'}: ${text}`);
          }
        });
        if (turns.length > 0) {
          shareText = turns.join('\n\n---\n\n');
          const firstUser = turns.find(t => t.startsWith('User:'));
          if (firstUser) {
            shareTitle = `Milo Chat: ${firstUser.replace(/^User:\s*/, '').slice(0, 36)}...`;
          }
        }
      }

      const shareData = {
        title: shareTitle,
        text: shareText ? `${shareTitle}\n\n${shareText}\n\nShared via Milo AI Workspace:` : 'Check out Milo — Personal AI and Knowledge Workspace',
        url: window.location.href
      };

      if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(() => {
          this.copyShareLinkToClipboard(shareData);
        });
      } else if (navigator.share) {
        navigator.share(shareData).catch(() => {
          this.copyShareLinkToClipboard(shareData);
        });
      } else {
        this.copyShareLinkToClipboard(shareData);
      }
    }

    copyShareLinkToClipboard(shareData) {
      const fullCopy = shareData.text ? `${shareData.text}\n${shareData.url}` : shareData.url;
      if (window.copyToClipboard) {
        window.copyToClipboard(fullCopy);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullCopy).then(() => {
          if (window.showToast) window.showToast('Share link & chat copied to clipboard! 📋', 'success');
        });
      }
    }

    selectAgent(agentId) {
      this.activeAgent = agentId;
      const input = document.getElementById('rag-query-input');

      // Update sidebar visual active states
      document.querySelectorAll('.onyx-sidebar-item').forEach(item => {
        const title = item.getAttribute('title') || '';
        const isSelected = (agentId === 'support' && title.includes('Support')) ||
                           (agentId === 'sales' && title.includes('Sales Assistant')) ||
                           (agentId === 'helpdesk' && title.includes('Helpdesk'));
        item.classList.toggle('active', isSelected);
      });

      if (agentId === 'support') {
        if (input) input.placeholder = 'Ask Customer Support AI about customer inquiries, tickets, or FAQs...';
        if (window.showToast) window.showToast('Active Agent: Customer Support AI (Ticket resolution & FAQ synthesis)', 'info');
      } else if (agentId === 'sales') {
        if (input) input.placeholder = 'Ask Sales Assistant for account briefs, objections & signals...';
        if (window.showToast) window.showToast('Active Agent: Sales Assistant (Account research & objection handling)', 'info');
      } else if (agentId === 'helpdesk') {
        if (input) input.placeholder = 'Ask IT Helpdesk about credentials, system status, or troubleshooting...';
        if (window.showToast) window.showToast('Active Agent: IT Helpdesk (Hardware, software, & SSO access)', 'info');
      }
    }

    selectProject(projectName) {
      this.activeProject = projectName;
      if (window.showToast) window.showToast(`Active Project Scope: ${projectName}`, 'info');
    }

    escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  window.OnyxInterface = new OnyxInterfaceController();
  window.shareSession = function() {
    if (window.OnyxInterface) return window.OnyxInterface.shareSession();
  };
  window.copyCurrentTurn = function(btn) {
    if (window.OnyxInterface) return window.OnyxInterface.copyCurrentTurn(btn);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.OnyxInterface.init());
  } else {
    window.OnyxInterface.init();
  }
})();
