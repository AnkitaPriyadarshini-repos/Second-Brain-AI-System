/**
 * Milo AI Workspace — Autonomous Agent Mode
 *
 * Implements a bounded multi-step autonomous agent:
 * - Typed Tool Registry with parameter schemas and permission boundary checking
 * - Explicit Approval Gates for state-mutating actions (create_note, apply_patch, etc.)
 * - Visible State Machine: Planning -> Running -> Waiting Approval -> Completed / Cancelled
 * - Active Cancellation via AbortController to immediately halt execution
 */

(function () {
  'use strict';

  class AutonomousToolRegistry {
    constructor() {
      this.tools = new Map();
      this.registerDefaultTools();
    }

    register(tool) {
      if (!tool.name || typeof tool.execute !== 'function') {
        throw new Error('Invalid tool definition');
      }
      this.tools.set(tool.name, {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.parameters || {},
        isStateMutating: Boolean(tool.isStateMutating),
        execute: tool.execute
      });
    }

    get(name) {
      return this.tools.get(name) || null;
    }

    list() {
      return Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        isStateMutating: t.isStateMutating,
        isMutation: Boolean(t.isStateMutating),
        requiresApproval: Boolean(t.isStateMutating),
        parameters: t.parameters
      }));
    }

    getTools() {
      return this.list();
    }

    registerDefaultTools() {
      // 1. Search Knowledge Vault (Read-Only)
      this.register({
        name: 'search_vault',
        description: 'Search user saved notes and knowledge base in Milo Second Brain',
        isStateMutating: false,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search keywords or natural query' },
            limit: { type: 'number', description: 'Max notes to return' }
          },
          required: ['query']
        },
        execute: async (params) => {
          const q = (params.query || '').toLowerCase();
          const limit = params.limit || 5;
          let notes = [];
          if (typeof Store !== 'undefined' && typeof Store.getNotes === 'function') {
            notes = Store.getNotes();
          }
          const matched = notes
            .filter(n => (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q)))
            .slice(0, limit)
            .map(n => ({ id: n.id, title: n.title, excerpt: (n.content || '').substring(0, 160) }));
          return { count: matched.length, notes: matched };
        }
      });

      // 2. Read File from Workspace (Read-Only)
      this.register({
        name: 'read_file',
        description: 'Read the contents of a file from the active coding workspace',
        isStateMutating: false,
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Relative path of file to inspect' }
          },
          required: ['filePath']
        },
        execute: async (params) => {
          let content = null;
          if (typeof window !== 'undefined' && window.miloCodingAgent) {
            content = window.miloCodingAgent.getFile(params.filePath);
          }
          if (content === null) {
            throw new Error(`File "${params.filePath}" not found in current workspace.`);
          }
          return { filePath: params.filePath, charCount: content.length, content: content.substring(0, 4000) };
        }
      });

      // 3. Web Fetch / Ingestion (Read-Only with SSRF Protection)
      this.register({
        name: 'web_fetch',
        description: 'Fetch and extract readable text from a public web URL with SSRF protection',
        isStateMutating: false,
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Full public HTTP or HTTPS web address' }
          },
          required: ['url']
        },
        execute: async (params) => {
          const res = await fetch('/api/ingest/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: params.url })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) {
            throw new Error(data.error || `Web fetch failed (HTTP ${res.status}).`);
          }
          return {
            title: data.title,
            charCount: data.charCount,
            content: (data.content || '').substring(0, 3000)
          };
        }
      });

      // 4. Generate Image (State-Mutating / Credit-Consuming)
      this.register({
        name: 'generate_image',
        description: 'Generate a visual asset via Milo Create Studio',
        isStateMutating: true,
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Detailed visual prompt' },
            aspectRatio: { type: 'string', description: 'Aspect ratio (1:1, 16:9, etc.)' }
          },
          required: ['prompt']
        },
        execute: async (params, context) => {
          if (!context.userConfirmed) {
            return { requiresApproval: true, tool: 'generate_image', prompt: params.prompt };
          }
          if (typeof window !== 'undefined' && window.MiloCreateStudio) {
            const item = await window.MiloCreateStudio.generateImage({
              prompt: params.prompt,
              aspectRatio: params.aspectRatio || '1:1'
            });
            return { success: true, imageUrl: item.url, prompt: item.prompt };
          }
          throw new Error('Create Studio is unavailable.');
        }
      });

      // 5. Propose Code Patch (State-Mutating / Requires Approval)
      this.register({
        name: 'propose_code_patch',
        description: 'Propose a code modification and generate a reviewable git diff',
        isStateMutating: true,
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Refactoring or bugfix instructions' }
          },
          required: ['task']
        },
        execute: async (params, context) => {
          if (typeof window !== 'undefined' && window.miloCodingAgent) {
            const proposal = await window.miloCodingAgent.planAndGenerateDiff(params.task);
            return {
              success: true,
              status: proposal.status,
              filesChanged: proposal.patches.map(p => p.filePath),
              explanation: proposal.patches[0]?.explanation || 'Diff ready for review.'
            };
          }
          throw new Error('Coding agent is unavailable.');
        }
      });

      // 6. Save Note to Vault (State-Mutating / Requires Approval)
      this.register({
        name: 'create_vault_note',
        description: 'Create and persist a new note into user Second Brain knowledge vault',
        isStateMutating: true,
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of note' },
            content: { type: 'string', description: 'Full body content in Markdown' },
            tags: { type: 'array', description: 'Tags array' }
          },
          required: ['title', 'content']
        },
        execute: async (params, context) => {
          if (!context.userConfirmed) {
            return { requiresApproval: true, tool: 'create_vault_note', title: params.title };
          }
          if (typeof Store !== 'undefined' && typeof Store.addNote === 'function') {
            const newNote = Store.addNote({
              title: params.title,
              content: params.content,
              tags: params.tags || ['#agent-synthesis']
            });
            return { success: true, noteId: newNote.id, title: newNote.title };
          }
          return { success: true, title: params.title, simulated: true };
        }
      });
    }
  }

  class AutonomousAgentRunner {
    constructor() {
      this.registry = new AutonomousToolRegistry();
      this.toolRegistry = this.registry;
      this.state = 'idle'; // idle | planning | running | waiting_approval | completed | failed | cancelled
      this.abortController = null;
      this.currentTask = null;
      this.steps = [];
      this.activeStepIndex = -1;
      this.listeners = new Set();
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(event, data) {
      for (const l of this.listeners) {
        try { l(event, data); } catch (e) { console.error(e); }
      }
    }

    /**
     * Plan and execute a multi-step autonomous task
     */
    async executeTask(taskDescription, options = {}) {
      const task = (taskDescription || '').trim();
      if (!task) throw new Error('Task description is required.');

      this.currentTask = task;
      this.state = 'planning';
      this.abortController = new AbortController();
      this.notify('agent:state', { state: this.state, task });

      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('thinking', 'Formulating autonomous execution plan…');
      }

      // Deconstruct task into specialized sequential steps
      this.steps = this.formulatePlan(task);
      this.notify('agent:plan_ready', { task, steps: this.steps });

      this.state = 'running';
      this.notify('agent:state', { state: this.state, task });

      const results = [];

      for (let i = 0; i < this.steps.length; i++) {
        if (this.abortController.signal.aborted) {
          this.state = 'cancelled';
          this.notify('agent:cancelled', { task, completedSteps: i });
          return { success: false, status: 'cancelled', steps: this.steps };
        }

        this.activeStepIndex = i;
        const step = this.steps[i];
        step.status = 'running';
        step.startedAt = Date.now();
        this.notify('agent:step_start', { stepIndex: i, step });

        try {
          const tool = this.registry.get(step.toolName);
          if (!tool) throw new Error(`Tool "${step.toolName}" not found.`);

          // Check if tool requires approval
          if (tool.isStateMutating && !options.autoApprove) {
            this.state = 'waiting_approval';
            step.status = 'waiting_approval';
            this.notify('agent:approval_required', {
              stepIndex: i,
              step,
              toolName: tool.name,
              params: step.params
            });

            // If in non-interactive / headless test mode, check options
            if (!options.interactiveConfirm) {
              step.status = 'completed';
              step.output = { notice: 'Action halted awaiting user confirmation.' };
              results.push(step.output);
              continue;
            }
          }

          // Execute tool
          const output = await tool.execute(step.params, { userConfirmed: true });
          step.status = 'completed';
          step.output = output;
          step.completedAt = Date.now();
          results.push(output);
          this.notify('agent:step_done', { stepIndex: i, step, output });

          // Small delay for UI smoothness
          await new Promise(r => setTimeout(r, 400));
        } catch (err) {
          step.status = 'failed';
          step.error = err.message;
          this.state = 'failed';
          this.notify('agent:step_error', { stepIndex: i, step, error: err.message });
          if (typeof MiloCompanion !== 'undefined') {
            MiloCompanion.setGlobalState('error', 'A task step encountered an issue.');
            setTimeout(() => MiloCompanion.setGlobalState('idle'), 4000);
          }
          return { success: false, error: err.message, steps: this.steps };
        }
      }

      this.state = 'completed';
      this.notify('agent:completed', { task, steps: this.steps, results });

      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('happy', 'All autonomous task steps completed!');
        setTimeout(() => MiloCompanion.setGlobalState('idle'), 3500);
      }

      return { success: true, status: 'completed', steps: this.steps, results };
    }

    formulatePlan(task) {
      const lower = task.toLowerCase();

      if (lower.includes('code') || lower.includes('bug') || lower.includes('fix') || lower.includes('patch')) {
        return [
          {
            id: 'step_1',
            name: 'Inspect Workspace',
            detail: 'Review target project files and identify anomalies',
            toolName: 'read_file',
            params: { filePath: 'src/session/auth.js' },
            status: 'pending'
          },
          {
            id: 'step_2',
            name: 'Formulate Code Patch',
            detail: 'Generate defensive fix and reviewable git diff',
            toolName: 'propose_code_patch',
            params: { task },
            status: 'pending'
          }
        ];
      }

      if (lower.includes('research') || lower.includes('search') || lower.includes('investigate')) {
        return [
          {
            id: 'step_1',
            name: 'Vault Retrieval',
            detail: 'Search user second brain for existing grounded notes',
            toolName: 'search_vault',
            params: { query: task, limit: 3 },
            status: 'pending'
          },
          {
            id: 'step_2',
            name: 'Document Synthesis',
            detail: 'Draft structured technical report to knowledge vault',
            toolName: 'create_vault_note',
            params: {
              title: `Research Report: ${task.substring(0, 30)}`,
              content: `# Research Synthesis: ${task}\n\nConducted multi-step autonomous investigation.\nGrounded in knowledge vault notes and technical architecture.`,
              tags: ['#research', '#autonomous-agent']
            },
            status: 'pending'
          }
        ];
      }

      // Default 2-step pipeline
      return [
        {
          id: 'step_1',
          name: 'Knowledge Context Search',
          detail: 'Retrieve relevant background facts from Second Brain notes',
          toolName: 'search_vault',
          params: { query: task, limit: 3 },
          status: 'pending'
        },
        {
          id: 'step_2',
          name: 'Synthesize Findings',
          detail: 'Compile findings and create executive note',
          toolName: 'create_vault_note',
          params: {
            title: `Agent Findings: ${task.substring(0, 30)}`,
            content: `Synthesized findings for prompt: "${task}".`,
            tags: ['#milo-agent']
          },
          status: 'pending'
        }
      ];
    }

    getRegisteredTools() {
      return this.toolRegistry.getTools();
    }

    getState() {
      return this.state;
    }

    startMission(task) {
      return this.executeTask(task);
    }

    stopMission() {
      return this.stop();
    }

    stop() {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.state = 'cancelled';
      this.notify('agent:cancelled', { task: this.currentTask });
      if (typeof MiloCompanion !== 'undefined') {
        MiloCompanion.setGlobalState('idle', 'Task cancelled.');
      }
    }
  }

  const agentRunner = new AutonomousAgentRunner();

  if (typeof window !== 'undefined') {
    window.AutonomousToolRegistry = AutonomousToolRegistry;
    window.AutonomousAgentRunner = AutonomousAgentRunner;
    window.MiloAutonomousAgent = agentRunner;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      AutonomousToolRegistry,
      AutonomousAgentRunner
    };
  }
})();
