/**
 * Milo AI Workspace — Khoj-Inspired Interactive Welcome Screen & Assistant Modes
 *
 * Implements:
 * - Small, typed configuration model for Assistant Modes (Milo, Coach, Research, Coding)
 * - Three primary responsive suggestion cards (Learn, Build, Plan)
 * - Understated "More ideas" expandable drawer
 * - Time-aware & personalized greeting headline
 * - Keyboard navigation (Arrow keys, Tab, Enter, Space) and ARIA support
 * - Honest capability status (e.g. Research mode with unconfigured web search notice)
 * - Clean integration with existing production chat controller and AI gateway
 */

(function (global) {
  'use strict';

  /**
   * Typed configuration model for Assistant Modes
   */
  const ASSISTANT_MODES = {
    milo: {
      id: 'milo',
      name: 'Milo',
      shortLabel: 'Milo',
      tagline: 'General Assistant',
      description: 'General-purpose assistance, fast answers, and multi-turn follow-up conversations.',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.2 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c3-1.2 5-4.1 5-7.4a8 8 0 0 0-8-8z"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>',
      placeholder: 'How can Milo help you today?',
      guidance: 'Ask anything or follow up on your recent topics.',
      capabilityNotice: null
    },
    coach: {
      id: 'coach',
      name: 'Coach',
      shortLabel: 'Coach',
      tagline: 'Learning & Milestones',
      description: 'Concept breakdowns, goal milestones, interview preparation, and structured study plans.',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
      placeholder: 'Ask to learn a concept, plan milestones, or prepare for an interview...',
      guidance: 'Guide me step-by-step with practical examples and milestones.',
      capabilityNotice: null
    },
    research: {
      id: 'research',
      name: 'Research',
      shortLabel: 'Research',
      tagline: 'Evidence & Documents',
      description: 'Evidence-based exploration, document search, and grounded knowledge synthesis.',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6M8 11h6"/></svg>',
      placeholder: 'Explore research topics, compare evidence, or search your saved notes...',
      guidance: 'Synthesize evidence with clear citations and critical evaluation.',
      capabilityNotice: {
        text: 'Vault & Document Search active · Live Web Search requires external API key',
        warning: false
      }
    },
    coding: {
      id: 'coding',
      name: 'Coding',
      shortLabel: 'Coding',
      tagline: 'Development & Debug',
      description: 'Code explanation, debugging, programming practice, and safe architecture assistance.',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      placeholder: 'Describe a bug, paste code to debug, or architect an algorithm...',
      guidance: 'Produce runnable, production-grade code with error handling and edge cases.',
      capabilityNotice: null
    }
  };

  /**
   * Suggestion Cards Model
   * 3 primary cards + 5 secondary cards for "More ideas"
   */
  const PRIMARY_SUGGESTIONS = [
    {
      id: 'sugg_learn',
      tag: 'Learn',
      title: 'Explain a concept',
      prompt: 'Explain a difficult concept using examples.',
      icon: '💡',
      ariaLabel: 'Learn: Explain a difficult concept using examples'
    },
    {
      id: 'sugg_build',
      tag: 'Build',
      title: 'Debug & improve code',
      prompt: 'Help me debug and improve my code.',
      icon: '🛠️',
      ariaLabel: 'Build: Help me debug and improve my code'
    },
    {
      id: 'sugg_plan',
      tag: 'Plan',
      title: 'Actionable milestones',
      prompt: 'Turn my goal into milestones and actionable tasks.',
      icon: '🎯',
      ariaLabel: 'Plan: Turn my goal into milestones and actionable tasks'
    }
  ];

  const MORE_IDEAS_SUGGESTIONS = [
    {
      id: 'sugg_notes',
      tag: 'Vault',
      title: 'Explore saved notes',
      prompt: 'Explore my saved notes.',
      icon: '🧠',
      ariaLabel: 'Vault: Explore my saved notes'
    },
    {
      id: 'sugg_research',
      tag: 'Research',
      title: 'Topic & citations',
      prompt: 'Research a topic and cite sources.',
      icon: '🔬',
      ariaLabel: 'Research: Research a topic and cite sources'
    },
    {
      id: 'sugg_interview',
      tag: 'Career',
      title: 'Prepare for interview',
      prompt: 'Prepare for an interview on systems design and data structures.',
      icon: '💼',
      ariaLabel: 'Career: Prepare for an interview'
    },
    {
      id: 'sugg_summarize',
      tag: 'Summary',
      title: 'Summarize a document',
      prompt: 'Summarize a document with key takeaways and action items.',
      icon: '📄',
      ariaLabel: 'Summary: Summarize a document'
    },
    {
      id: 'sugg_study_plan',
      tag: 'Plan',
      title: 'Study or project plan',
      prompt: 'Create a study or project plan with weekly milestones.',
      icon: '📅',
      ariaLabel: 'Plan: Create a study or project plan'
    }
  ];

  class MiloWelcomeManager {
    constructor() {
      this.selectedMode = 'milo';
      this.moreIdeasExpanded = false;
      this.initialized = false;
    }

    /**
     * Initializes the welcome screen and registers event listeners
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;

      this.loadSavedMode();
      this.render();
      this.wireEvents();
    }

    /**
     * Loads the saved mode preference from Store or localStorage
     */
    loadSavedMode() {
      try {
        if (typeof global.Store !== 'undefined' && typeof global.Store.getAssistantMode === 'function') {
          const saved = global.Store.getAssistantMode();
          if (ASSISTANT_MODES[saved]) {
            this.selectedMode = saved;
            return;
          }
        }
        const local = localStorage.getItem('milo_assistant_mode');
        if (local && ASSISTANT_MODES[local]) {
          this.selectedMode = local;
        }
      } catch (_) {
        this.selectedMode = 'milo';
      }
    }

    /**
     * Persists the selected mode
     */
    persistMode(mode) {
      if (!ASSISTANT_MODES[mode]) return;
      this.selectedMode = mode;
      try {
        localStorage.setItem('milo_assistant_mode', mode);
        if (typeof global.Store !== 'undefined' && typeof global.Store.setAssistantMode === 'function') {
          global.Store.setAssistantMode(mode);
        } else if (typeof global.Store !== 'undefined' && global.Store.settings) {
          global.Store.settings.assistantMode = mode;
          if (typeof global.Store.saveSettings === 'function') global.Store.saveSettings();
        }
      } catch (_) {}
    }

    /**
     * Returns the currently selected assistant mode id
     */
    getSelectedMode() {
      return this.selectedMode || 'milo';
    }

    /**
     * Generates a friendly, personalized welcome headline
     */
    getGreetingHeadline() {
      const hour = new Date().getHours();
      let timeGreeting = 'Good morning';
      if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
      else if (hour >= 17 || hour < 4) timeGreeting = 'Good evening';

      let safeName = '';
      try {
        const userEl = document.getElementById('user-display-name');
        if (userEl && userEl.textContent.trim()) {
          safeName = userEl.textContent.trim();
        }
        if (!safeName) {
          const stored = JSON.parse(localStorage.getItem('second_brain_user') || '{}');
          if (stored && typeof stored.name === 'string') safeName = stored.name.trim();
        }
      } catch (_) {}

      safeName = safeName.replace(/[^\w\s-]/g, '').trim().slice(0, 30);
      return safeName ? `${timeGreeting}, ${safeName}` : `${timeGreeting}, what would you like to explore?`;
    }

    /**
     * Renders the welcome screen UI components into the DOM
     */
    render() {
      this.renderHeroHeader();
      this.renderModeNav();
      this.renderSuggestionCards();
      this.updateComposerPlaceholder();
    }

    /**
     * Renders the hero header with branding, headline, and subtext
     */
    renderHeroHeader() {
      const hero = document.getElementById('chat-hero-view');
      if (!hero) return;

      let brandWrapper = document.getElementById('milo-welcome-brand-wrap');
      if (!brandWrapper) {
        brandWrapper = document.createElement('div');
        brandWrapper.id = 'milo-welcome-brand-wrap';
        brandWrapper.className = 'milo-welcome-brand-wrap';
        hero.prepend(brandWrapper);
      }

      const headlineText = this.getGreetingHeadline();
      brandWrapper.innerHTML = `
        <div class="milo-welcome-mascot-row">
          <div class="milo-welcome-avatar" aria-hidden="true">
            <img src="assets/milo_robot_mascot.png" alt="" class="milo-welcome-avatar-img" onerror="this.src='assets/logo.svg'">
          </div>
          <span class="milo-welcome-badge">
            <span class="milo-welcome-pulse-dot" aria-hidden="true"></span>
            <span>Milo AI</span>
          </span>
        </div>
        <h1 class="claude-serif-headline milo-welcome-headline" id="milo-welcome-title">${this.escapeHTML(headlineText)}</h1>
        <p class="hero-subtitle-text milo-welcome-subtitle">
          Your personal AI workspace for research, coding, planning, and knowledge synthesis.
        </p>
      `;

      // Hide or replace old static headline wrapper if present
      const oldHeadline = hero.querySelector('.claude-brand-headline-wrapper');
      if (oldHeadline && oldHeadline !== brandWrapper) {
        oldHeadline.style.display = 'none';
      }
    }

    /**
     * Renders the selectable mode pill navigation
     */
    renderModeNav() {
      const hero = document.getElementById('chat-hero-view');
      if (!hero) return;

      let modeNav = document.getElementById('milo-mode-nav-container');
      if (!modeNav) {
        modeNav = document.createElement('div');
        modeNav.id = 'milo-mode-nav-container';
        modeNav.className = 'milo-mode-nav-container';
        hero.appendChild(modeNav);
      }

      const modeKeys = ['milo', 'coach', 'research', 'coding'];
      const currentMode = this.selectedMode;
      const activeMeta = ASSISTANT_MODES[currentMode] || ASSISTANT_MODES.milo;

      modeNav.innerHTML = `
        <div class="milo-mode-tablist" role="tablist" aria-label="Assistant modes">
          ${modeKeys.map((key) => {
            const m = ASSISTANT_MODES[key];
            const isSelected = key === currentMode;
            return `
              <button
                type="button"
                role="tab"
                class="milo-mode-pill ${isSelected ? 'active' : ''}"
                id="milo-mode-tab-${m.id}"
                data-mode="${m.id}"
                aria-selected="${isSelected ? 'true' : 'false'}"
                aria-controls="milo-mode-panel"
                tabindex="${isSelected ? '0' : '-1'}"
              >
                <span class="milo-mode-icon" aria-hidden="true">${m.icon}</span>
                <span class="milo-mode-label">${this.escapeHTML(m.name)}</span>
              </button>
            `;
          }).join('')}
        </div>
        
        <!-- Accessible Live Announcement for Screen Readers -->
        <div id="milo-mode-live-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>

        <!-- Mode Guidance & Capability Notice Panel -->
        <div id="milo-mode-panel" class="milo-mode-panel" role="tabpanel" aria-labelledby="milo-mode-tab-${activeMeta.id}">
          <p class="milo-mode-desc">${this.escapeHTML(activeMeta.description)}</p>
          ${activeMeta.capabilityNotice ? `
            <div class="milo-capability-notice" role="status">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>${this.escapeHTML(activeMeta.capabilityNotice.text)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    /**
     * Renders the 3 primary suggestion cards and "More ideas" expander
     */
    renderSuggestionCards() {
      // Place suggestion cards inside #hero-starter-chips to maintain DOM layout stability
      let container = document.getElementById('milo-welcome-suggestions');
      const chipsSlot = document.getElementById('hero-starter-chips');

      if (!container) {
        container = document.createElement('div');
        container.id = 'milo-welcome-suggestions';
        container.className = 'milo-welcome-suggestions';

        if (chipsSlot) {
          chipsSlot.innerHTML = '';
          chipsSlot.appendChild(container);
          chipsSlot.classList.remove('hidden');
          chipsSlot.style.display = 'flex';
          chipsSlot.style.flexDirection = 'column';
          chipsSlot.style.alignItems = 'center';
        } else {
          const wrapper = document.querySelector('.nori-reference-composer-wrapper');
          if (wrapper) wrapper.appendChild(container);
        }
      }

      container.innerHTML = `
        <div class="milo-primary-cards-grid" role="region" aria-label="Prompt suggestions">
          ${PRIMARY_SUGGESTIONS.map((card) => `
            <button
              type="button"
              class="milo-suggestion-card"
              data-prompt="${this.escapeHTML(card.prompt)}"
              aria-label="${this.escapeHTML(card.ariaLabel)}"
            >
              <div class="milo-card-header">
                <span class="milo-card-tag">${this.escapeHTML(card.tag)}</span>
                <span class="milo-card-emoji" aria-hidden="true">${card.icon}</span>
              </div>
              <div class="milo-card-title">${this.escapeHTML(card.title)}</div>
              <div class="milo-card-prompt">${this.escapeHTML(card.prompt)}</div>
              <div class="milo-card-action" aria-hidden="true">
                <span>Use prompt</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
            </button>
          `).join('')}
        </div>

        <!-- More Ideas Expand Control -->
        <div class="milo-more-ideas-wrap">
          <button
            type="button"
            id="milo-more-ideas-btn"
            class="milo-more-ideas-btn"
            aria-expanded="${this.moreIdeasExpanded ? 'true' : 'false'}"
            aria-controls="milo-more-ideas-drawer"
          >
            <span>${this.moreIdeasExpanded ? 'Fewer ideas' : 'More ideas'}</span>
            <svg class="milo-chevron-icon ${this.moreIdeasExpanded ? 'expanded' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <!-- Expandable Drawer of Additional Ideas -->
        <div
          id="milo-more-ideas-drawer"
          class="milo-more-ideas-drawer ${this.moreIdeasExpanded ? 'expanded' : 'collapsed'}"
          role="region"
          aria-label="Additional prompt ideas"
          ${this.moreIdeasExpanded ? '' : 'style="display: none;"'}
        >
          <div class="milo-secondary-cards-grid">
            ${MORE_IDEAS_SUGGESTIONS.map((card) => `
              <button
                type="button"
                class="milo-suggestion-card milo-secondary-card"
                data-prompt="${this.escapeHTML(card.prompt)}"
                aria-label="${this.escapeHTML(card.ariaLabel)}"
              >
                <div class="milo-card-header">
                  <span class="milo-card-tag">${this.escapeHTML(card.tag)}</span>
                  <span class="milo-card-emoji" aria-hidden="true">${card.icon}</span>
                </div>
                <div class="milo-card-title">${this.escapeHTML(card.title)}</div>
                <div class="milo-card-prompt">${this.escapeHTML(card.prompt)}</div>
                <div class="milo-card-action" aria-hidden="true">
                  <span>Use prompt</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    /**
     * Updates the composer textarea placeholder according to active mode
     */
    updateComposerPlaceholder() {
      const input = document.getElementById('rag-query-input');
      const activeMeta = ASSISTANT_MODES[this.selectedMode] || ASSISTANT_MODES.milo;
      if (input && activeMeta) {
        input.placeholder = activeMeta.placeholder;
        input.setAttribute('aria-label', activeMeta.placeholder);
      }
    }

    /**
     * Wires keyboard and click event listeners
     */
    wireEvents() {
      const modeNav = document.getElementById('milo-mode-nav-container');
      if (modeNav && !modeNav.dataset.miloWired) {
        modeNav.dataset.miloWired = '1';

        modeNav.addEventListener('click', (e) => {
          const btn = e.target.closest('.milo-mode-pill');
          if (!btn) return;
          const modeId = btn.getAttribute('data-mode');
          if (modeId) this.selectMode(modeId, true);
        });

        modeNav.addEventListener('keydown', (e) => {
          const pills = Array.from(modeNav.querySelectorAll('.milo-mode-pill'));
          const currentIndex = pills.findIndex((p) => p === document.activeElement);
          if (currentIndex === -1) return;

          let targetIndex = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (currentIndex + 1) % pills.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (currentIndex - 1 + pills.length) % pills.length;
          } else if (e.key === 'Home') {
            e.preventDefault();
            targetIndex = 0;
          } else if (e.key === 'End') {
            e.preventDefault();
            targetIndex = pills.length - 1;
          }

          if (targetIndex !== -1 && pills[targetIndex]) {
            const nextMode = pills[targetIndex].getAttribute('data-mode');
            this.selectMode(nextMode, true);
            pills[targetIndex].focus();
          }
        });
      }

      // Delegate click on suggestion cards
      const suggestions = document.getElementById('milo-welcome-suggestions');
      if (suggestions && !suggestions.dataset.miloWired) {
        suggestions.dataset.miloWired = '1';

        suggestions.addEventListener('click', (e) => {
          const card = e.target.closest('.milo-suggestion-card');
          if (card) {
            e.preventDefault();
            const prompt = card.getAttribute('data-prompt');
            if (prompt) this.handleSuggestionSelected(prompt);
            return;
          }

          const moreBtn = e.target.closest('#milo-more-ideas-btn');
          if (moreBtn) {
            e.preventDefault();
            this.toggleMoreIdeas();
          }
        });
      }
    }

    /**
     * Selects an assistant mode, updates state, guidance, and announces change
     */
    selectMode(modeId, userInitiated = false) {
      if (!ASSISTANT_MODES[modeId]) return;
      this.selectedMode = modeId;
      this.persistMode(modeId);

      const modeNav = document.getElementById('milo-mode-nav-container');
      if (modeNav) {
        const pills = modeNav.querySelectorAll('.milo-mode-pill');
        pills.forEach((p) => {
          const isThis = p.getAttribute('data-mode') === modeId;
          p.classList.toggle('active', isThis);
          p.setAttribute('aria-selected', isThis ? 'true' : 'false');
          p.tabIndex = isThis ? 0 : -1;
        });

        const activeMeta = ASSISTANT_MODES[modeId];
        const panel = document.getElementById('milo-mode-panel');
        if (panel) {
          panel.setAttribute('aria-labelledby', `milo-mode-tab-${activeMeta.id}`);
          panel.innerHTML = `
            <p class="milo-mode-desc">${this.escapeHTML(activeMeta.description)}</p>
            ${activeMeta.capabilityNotice ? `
              <div class="milo-capability-notice" role="status">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>${this.escapeHTML(activeMeta.capabilityNotice.text)}</span>
              </div>
            ` : ''}
          `;
        }

        const announcer = document.getElementById('milo-mode-live-announcer');
        if (announcer && userInitiated) {
          announcer.textContent = `Mode switched to ${activeMeta.name}: ${activeMeta.tagline}`;
        }
      }

      this.updateComposerPlaceholder();

      // Dispatch custom event for telemetry or test suites
      window.dispatchEvent(new CustomEvent('milo:mode-change', {
        detail: { mode: modeId, meta: ASSISTANT_MODES[modeId] }
      }));
    }

    /**
     * Handles selecting a suggestion card
     * Populates input and focuses composer; submits cleanly if user triggers enter
     */
    handleSuggestionSelected(prompt) {
      const input = document.getElementById('rag-query-input');
      if (!input) return;

      input.value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Sizing adjustment
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 132)}px`;

      try {
        input.focus({ preventScroll: true });
      } catch (_) {
        input.focus();
      }

      // Smooth scroll composer into view if needed
      const composer = document.querySelector('.nori-reference-composer-wrapper');
      if (composer && typeof composer.scrollIntoView === 'function') {
        composer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    /**
     * Toggles expansion of additional suggestion ideas
     */
    toggleMoreIdeas() {
      this.moreIdeasExpanded = !this.moreIdeasExpanded;
      const drawer = document.getElementById('milo-more-ideas-drawer');
      const btn = document.getElementById('milo-more-ideas-btn');

      if (btn) {
        btn.setAttribute('aria-expanded', this.moreIdeasExpanded ? 'true' : 'false');
        btn.innerHTML = `
          <span>${this.moreIdeasExpanded ? 'Fewer ideas' : 'More ideas'}</span>
          <svg class="milo-chevron-icon ${this.moreIdeasExpanded ? 'expanded' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        `;
      }

      if (drawer) {
        if (this.moreIdeasExpanded) {
          drawer.style.display = 'block';
          requestAnimationFrame(() => {
            drawer.classList.remove('collapsed');
            drawer.classList.add('expanded');
          });
        } else {
          drawer.classList.remove('expanded');
          drawer.classList.add('collapsed');
          setTimeout(() => {
            if (!this.moreIdeasExpanded) drawer.style.display = 'none';
          }, 240);
        }
      }
    }

    /**
     * Handles conversation state transition (empty vs active chat)
     */
    onConversationStateChange(isEmpty) {
      const hero = document.getElementById('chat-hero-view');
      const chipsSlot = document.getElementById('hero-starter-chips');
      const suggestions = document.getElementById('milo-welcome-suggestions');

      if (isEmpty) {
        if (hero) {
          hero.style.display = 'flex';
          hero.classList.remove('hidden');
        }
        if (chipsSlot) {
          chipsSlot.style.display = 'flex';
          chipsSlot.classList.remove('hidden');
        }
        if (suggestions) {
          suggestions.style.display = 'flex';
          suggestions.classList.remove('hidden');
        }
        this.renderHeroHeader();
        this.updateComposerPlaceholder();
      } else {
        if (hero) {
          hero.style.display = 'none';
          hero.classList.add('hidden');
        }
        if (chipsSlot) {
          chipsSlot.style.display = 'none';
          chipsSlot.classList.add('hidden');
        }
        if (suggestions) {
          suggestions.style.display = 'none';
          suggestions.classList.add('hidden');
        }
      }
    }

    escapeHTML(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  const instance = new MiloWelcomeManager();

  // Export globally
  global.MiloWelcome = instance;
  global.ASSISTANT_MODES = ASSISTANT_MODES;

  function bootWelcome() {
    instance.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWelcome, { once: true });
  } else {
    bootWelcome();
  }

  // Second pass for late injected templates
  setTimeout(() => instance.init(), 150);
  setTimeout(() => instance.init(), 600);

})(typeof window !== 'undefined' ? window : this);
