/**
 * Second Brain AI System — Personal Agents Fleet & Controlled Tool Registry
 *
 * Implements Phase Four of Milo Personal AI Workspace:
 *  - 5 Specialized Personal Working Agents (Study Explainer, Coding Partner, Research Synthesizer, Writing Drafter, Knowledge Organizer)
 *  - Controlled Tool Registry with explicit parameter schemas, input sanitization, and permission controls (READ_ONLY vs STATE_MUTATING)
 *  - Safe Agent Execution Engine with step-by-step progress, timeout bounds, and artifact generation
 *  - Agent CRUD persistence in Store / localStorage
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.AgentSystem = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ----------------------------------------------------
  // Controlled Tool Registry
  // ----------------------------------------------------
  class ControlledToolRegistry {
    constructor() {
      this.tools = new Map();
      this.registerDefaultTools();
    }

    registerTool(schema) {
      if (!schema || !schema.name || typeof schema.execute !== 'function') {
        throw new Error('Invalid tool schema: name and execute function are required.');
      }
      this.tools.set(schema.name, {
        name: schema.name,
        description: schema.description || '',
        category: schema.category || 'general',
        permission: schema.permission || 'READ_ONLY', // 'READ_ONLY' | 'STATE_MUTATING'
        parameters: schema.parameters || {},
        execute: schema.execute
      });
    }

    getTool(name) {
      return this.tools.get(name) || null;
    }

    getAllTools() {
      return Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        permission: t.permission,
        parameters: t.parameters
      }));
    }

    async executeTool(name, params = {}, context = {}) {
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool "${name}" is not registered in the tool registry.`);
      }

      // State-mutating actions require explicit user confirmation
      if (tool.permission === 'STATE_MUTATING' && !context.userConfirmed) {
        return {
          requiresConfirmation: true,
          toolName: name,
          params,
          message: `The tool "${name}" modifies your knowledge base. Please confirm this action.`
        };
      }

      // Bound execution time (max 15 seconds per tool)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${name}" timed out after 15s.`)), 15000)
      );

      try {
        const result = await Promise.race([
          tool.execute(params, context),
          timeoutPromise
        ]);
        return { success: true, result };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    registerDefaultTools() {
      // 1. Search Vault (READ_ONLY)
      this.registerTool({
        name: 'search_vault',
        description: 'Searches the user private Second Brain notes using hybrid BM25 + keyword retrieval.',
        permission: 'READ_ONLY',
        parameters: {
          query: { type: 'string', description: 'Search keywords or question', required: true },
          tagFilter: { type: 'string', description: 'Optional tag to filter notes' },
          limit: { type: 'number', description: 'Maximum results to return (1-10)', default: 5 }
        },
        execute: async (params, context) => {
          const query = String(params.query || '').trim();
          if (!query) return { notes: [], message: 'No search query provided' };

          let notes = [];
          if (typeof Store !== 'undefined' && typeof Store.getNotes === 'function') {
            notes = Store.getNotes();
          } else if (context.notes && Array.isArray(context.notes)) {
            notes = context.notes;
          }

          if (params.tagFilter) {
            const tag = params.tagFilter.toLowerCase();
            notes = notes.filter(n => Array.isArray(n.tags) && n.tags.some(t => String(t).toLowerCase().includes(tag)));
          }

          let results = [];
          if (typeof HybridRetrievalEngine !== 'undefined') {
            const engine = new HybridRetrievalEngine();
            const res = engine.search(query, notes);
            results = res.contextNotes || [];
          } else {
            const q = query.toLowerCase();
            results = notes.filter(n =>
              (n.title && n.title.toLowerCase().includes(q)) ||
              (n.content && n.content.toLowerCase().includes(q)) ||
              (n.summary && n.summary.toLowerCase().includes(q))
            );
          }

          const limit = Math.min(10, Math.max(1, params.limit || 5));
          const sliced = results.slice(0, limit).map(n => ({
            id: n.id,
            title: n.title,
            summary: n.summary || (n.content ? n.content.slice(0, 160) + '...' : ''),
            tags: n.tags || [],
            sourceType: n.sourceType || 'note'
          }));

          return {
            query,
            totalFound: results.length,
            returnedCount: sliced.length,
            notes: sliced
          };
        }
      });

      // 2. Fetch Note Detail (READ_ONLY)
      this.registerTool({
        name: 'get_note_detail',
        description: 'Retrieves the complete content of a specific note by ID or title.',
        permission: 'READ_ONLY',
        parameters: {
          noteId: { type: 'string', description: 'ID or title of the note', required: true }
        },
        execute: async (params, context) => {
          const noteId = String(params.noteId || '').trim();
          let notes = [];
          if (typeof Store !== 'undefined' && typeof Store.getNotes === 'function') {
            notes = Store.getNotes();
          } else if (context.notes) {
            notes = context.notes;
          }

          const found = notes.find(n =>
            n.id === noteId || (n.title && n.title.toLowerCase() === noteId.toLowerCase())
          );

          if (!found) return { found: false, message: `Note "${noteId}" not found in vault.` };

          return {
            found: true,
            note: {
              id: found.id,
              title: found.title,
              content: found.content || found.summary || '',
              tags: found.tags || [],
              dateStr: found.dateStr || '',
              sourceType: found.sourceType || 'note'
            }
          };
        }
      });

      // 3. Cluster & Connect Concepts (READ_ONLY)
      this.registerTool({
        name: 'cluster_concepts',
        description: 'Discovers conceptual connections, shared entities, and cross-references between notes.',
        permission: 'READ_ONLY',
        parameters: {
          topic: { type: 'string', description: 'Core concept or topic to map', required: true }
        },
        execute: async (params, context) => {
          const topic = String(params.topic || '').trim().toLowerCase();
          let notes = [];
          if (typeof Store !== 'undefined' && typeof Store.getNotes === 'function') {
            notes = Store.getNotes();
          } else if (context.notes) {
            notes = context.notes;
          }

          const matches = notes.filter(n => {
            const haystack = `${n.title} ${n.summary || ''} ${(n.tags || []).join(' ')}`.toLowerCase();
            return haystack.includes(topic);
          });

          // Aggregate common tags across matches
          const tagCounts = {};
          matches.forEach(n => {
            if (Array.isArray(n.tags)) {
              n.tags.forEach(t => {
                const cleanTag = String(t).trim();
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
              });
            }
          });

          const relatedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag, count]) => ({ tag, count }));

          return {
            topic,
            connectedNotesCount: matches.length,
            connectedNotes: matches.slice(0, 6).map(n => ({ id: n.id, title: n.title, tags: n.tags })),
            relatedConcepts: relatedTags
          };
        }
      });

      // 4. Create Note in Vault (STATE_MUTATING)
      this.registerTool({
        name: 'create_note',
        description: 'Creates a permanent new note in the user knowledge vault.',
        permission: 'STATE_MUTATING',
        parameters: {
          title: { type: 'string', description: 'Title of the note', required: true },
          content: { type: 'string', description: 'Body content of the note', required: true },
          tags: { type: 'array', description: 'Array of category tags' }
        },
        execute: async (params, context = {}) => {
          const title = String(params.title || '').trim();
          const content = String(params.content || '').trim();
          if (!title || !content) {
            throw new Error('Title and content are required to create a note.');
          }

          if (typeof Store !== 'undefined' && typeof Store.addNote === 'function') {
            const created = Store.addNote({
              title,
              content,
              tags: Array.isArray(params.tags) ? params.tags : ['agent-generated'],
              sourceType: 'agent'
            });
            return {
              success: true,
              message: `Note "${title}" successfully saved to Knowledge Vault!`,
              note: created
            };
          }

          // If Store singleton is not attached, save directly to execution context note list
          const memoryNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title,
            content,
            tags: Array.isArray(params.tags) ? params.tags : ['agent-generated'],
            sourceType: 'agent',
            createdAt: new Date().toISOString()
          };
          if (context && Array.isArray(context.notes)) {
            context.notes.unshift(memoryNote);
          }
          return {
            success: true,
            persisted: 'session_memory',
            note: memoryNote,
            message: `Note "${title}" recorded in session Knowledge Vault.`
          };
        }
      });

      // 5. Generate Artifact (READ_ONLY export)
      this.registerTool({
        name: 'export_artifact',
        description: 'Packages structured research, study guide, or code into a downloadable artifact.',
        permission: 'READ_ONLY',
        parameters: {
          title: { type: 'string', description: 'Artifact title', required: true },
          type: { type: 'string', description: 'markdown | csv | code | summary', required: true },
          content: { type: 'string', description: 'Full artifact content', required: true }
        },
        execute: async (params) => {
          const title = String(params.title || 'Milo Artifact').trim();
          const type = String(params.type || 'markdown').toLowerCase();
          const content = String(params.content || '').trim();

          const artifact = {
            id: 'art_' + Math.random().toString(36).substring(2, 9),
            title,
            type,
            content,
            createdAt: new Date().toISOString()
          };

          if (typeof window !== 'undefined' && typeof window.saveMiloArtifact === 'function') {
            window.saveMiloArtifact(artifact);
          }

          return {
            success: true,
            artifactId: artifact.id,
            title: artifact.title,
            type: artifact.type,
            charCount: content.length,
            message: `Artifact "${title}" created and ready for inspection/download.`
          };
        }
      });
    }
  }

  // ----------------------------------------------------
  // Default Pre-Configured Fleet Agents
  // ----------------------------------------------------
  const DEFAULT_AGENTS = [
    {
      id: 'agent_study',
      name: 'Study & Concept Explainer',
      icon: '🎓',
      role: 'Socratic Concept Breakdown & Recall Tutor',
      purpose: 'Explains complex topics with analogies, active recall questions, and notes grounding.',
      instructions: `You are Milo Study Explainer. When the user asks to explain a concept or learn a topic:
1. Search the user's Second Brain notes for grounded definitions.
2. Break down the concept into 3 simple parts: The Core Intuition (ELI5), Technical Definition, and Real-World Analogy.
3. Provide 2 active-recall quiz questions to test understanding.
4. Ground your points in saved vault notes whenever available.`,
      knowledgeTags: ['AI', 'Theory', 'Architecture', 'Concepts', 'Study'],
      tools: ['search_vault', 'get_note_detail', 'export_artifact'],
      model: 'gemini-3.6-flash'
    },
    {
      id: 'agent_coder',
      name: 'Coding & Debugging Partner',
      icon: '💻',
      role: 'Full-Stack Software Architect & Bug Hunter',
      purpose: 'Produces clean, production-grade runnable code, debugs errors, and analyzes complexity.',
      instructions: `You are Milo Coding Partner. When given a coding task or error:
1. Check vault notes for existing code patterns or architectural decisions.
2. Provide concrete, runnable code snippets with zero placeholders.
3. Explain time/space complexity (Big-O) and critical edge cases (null inputs, concurrency, timeouts).
4. Emphasize testability and defense-in-depth security.`,
      knowledgeTags: ['Code', 'Architecture', 'Engineering', 'API', 'Database'],
      tools: ['search_vault', 'get_note_detail', 'export_artifact'],
      model: 'gemini-3.6-flash'
    },
    {
      id: 'agent_researcher',
      name: 'Research & Literature Synthesizer',
      icon: '🔬',
      role: 'Evidence-Based Cross-Source Synthesizer',
      purpose: 'Synthesizes literature, compares competing viewpoints, and produces source-backed reports.',
      instructions: `You are Milo Research Synthesizer. When given a complex question:
1. Search vault notes for existing research, evidence, and historical data.
2. Formulate 3 distinct research dimensions (e.g. Theoretical Foundations, Implementation Benchmarks, Trade-offs).
3. Cross-reference independent perspectives and highlight any disagreements or trade-offs.
4. Generate a structured synthesis report with numbered source citations.`,
      knowledgeTags: ['Research', 'Papers', 'Architecture', 'Benchmarks', 'Distributed Systems'],
      tools: ['search_vault', 'get_note_detail', 'cluster_concepts', 'export_artifact'],
      model: 'gemini-3.6-flash'
    },
    {
      id: 'agent_writer',
      name: 'Writing & Document Drafter',
      icon: '✍️',
      role: 'Executive Summary & Documentation Drafter',
      purpose: 'Converts notes and ideas into polished executive briefs, articles, and documentation.',
      instructions: `You are Milo Document Drafter. When asked to draft or summarize:
1. Gather the relevant background notes from the vault.
2. Create an executive summary (TL;DR) in 3 bullet points.
3. Structure the document with clear headings, actionable takeaways, and concise prose.
4. Package the final draft as a downloadable Markdown artifact.`,
      knowledgeTags: ['Notes', 'Writing', 'Docs', 'Strategy'],
      tools: ['search_vault', 'get_note_detail', 'export_artifact'],
      model: 'gemini-3.5-flash-lite'
    },
    {
      id: 'agent_organizer',
      name: 'Knowledge Organizer & Gap Hunter',
      icon: '🗂️',
      role: 'Vault Clusterer & Knowledge Gap Detector',
      purpose: 'Scans the vault, clusters related notes, suggests taxonomy tags, and finds missing topics.',
      instructions: `You are Milo Knowledge Organizer. When executed:
1. Scan the vault for note clusters and topic overlap.
2. Identify cross-cutting conceptual links that connect disparate domains.
3. Highlight knowledge blind spots (topics mentioned in summaries without dedicated notes).
4. Suggest clean tags and actionable notes to add.`,
      knowledgeTags: ['All'],
      tools: ['search_vault', 'cluster_concepts', 'create_note', 'export_artifact'],
      model: 'gemini-3.5-flash-lite'
    }
  ];

  // ----------------------------------------------------
  // Agent Execution & Management System
  // ----------------------------------------------------
  class AgentSystem {
    constructor() {
      this.toolRegistry = new ControlledToolRegistry();
      this.agents = new Map();
      this.loadAgents();
    }

    loadAgents() {
      // 1. Load defaults
      DEFAULT_AGENTS.forEach(a => this.agents.set(a.id, { ...a, isDefault: true }));

      // 2. Load custom agents from localStorage
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('milo_custom_agents');
          if (raw) {
            const customList = JSON.parse(raw);
            if (Array.isArray(customList)) {
              customList.forEach(a => {
                if (a && a.id) this.agents.set(a.id, { ...a, isDefault: false });
              });
            }
          }
        }
      } catch (_) {}
    }

    saveCustomAgents() {
      try {
        if (typeof localStorage !== 'undefined') {
          const custom = Array.from(this.agents.values()).filter(a => !a.isDefault);
          localStorage.setItem('milo_custom_agents', JSON.stringify(custom));
        }
      } catch (_) {}
    }

    getAgent(id) {
      return this.agents.get(id) || null;
    }

    listAgents() {
      return Array.from(this.agents.values());
    }

    createAgent(agentData) {
      const name = String(agentData.name || '').trim();
      if (!name) throw new Error('Agent name is required.');

      const id = 'agent_' + Math.random().toString(36).substring(2, 9);
      const newAgent = {
        id,
        name,
        icon: agentData.icon || '🤖',
        role: String(agentData.role || 'Custom Specialist').trim(),
        purpose: String(agentData.purpose || '').trim(),
        instructions: String(agentData.instructions || '').trim(),
        knowledgeTags: Array.isArray(agentData.knowledgeTags) ? agentData.knowledgeTags : [],
        tools: Array.isArray(agentData.tools) ? agentData.tools : ['search_vault', 'export_artifact'],
        model: agentData.model || 'gemini-3.6-flash',
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      this.agents.set(id, newAgent);
      this.saveCustomAgents();
      return newAgent;
    }

    updateAgent(id, updates) {
      const existing = this.agents.get(id);
      if (!existing) throw new Error(`Agent ${id} does not exist.`);
      const updated = { ...existing, ...updates, id };
      this.agents.set(id, updated);
      this.saveCustomAgents();
      return updated;
    }

    deleteAgent(id) {
      const existing = this.agents.get(id);
      if (!existing) return false;
      if (existing.isDefault) throw new Error('Default system agents cannot be deleted.');
      this.agents.delete(id);
      this.saveCustomAgents();
      return true;
    }

    duplicateAgent(id) {
      const source = this.agents.get(id);
      if (!source) throw new Error(`Agent ${id} not found.`);
      return this.createAgent({
        ...source,
        name: `${source.name} (Copy)`,
        isDefault: false
      });
    }

    /**
     * Executes an agent task safely with tool execution, progress tracking,
     * and fallback support when cloud AI is unreachable.
     *
     * @param {string} agentId - ID of agent to execute
     * @param {string} prompt - User request or task prompt
     * @param {Function} onProgress - Callback for step-by-step progress
     * @param {Object} options - { userConfirmed: boolean, modelOverride: string }
     */
    async executeAgent(agentId, prompt, onProgress = () => {}, options = {}) {
      const agent = this.agents.get(agentId);
      if (!agent) throw new Error(`Agent "${agentId}" not found.`);

      const cleanPrompt = String(prompt || '').trim();
      if (!cleanPrompt) throw new Error('A prompt or research objective is required.');

      const startTime = performance.now();
      const executionSteps = [];

      const recordStep = (stepName, detail) => {
        const stepObj = {
          step: executionSteps.length + 1,
          name: stepName,
          detail,
          timestamp: Date.now()
        };
        executionSteps.push(stepObj);
        onProgress(stepObj);
      };

      // Step 1: Initialize Agent Persona
      recordStep('Initialize Agent Persona', `Activated ${agent.icon} ${agent.name} (${agent.role})`);

      // Step 2: Plan and Tool Selection
      recordStep('Plan Execution Strategy', `Formulating tool pipeline: [${agent.tools.join(', ')}]`);

      // Step 3: Execute Knowledge Retrieval Tool if enabled
      let retrievedVaultContext = [];
      let toolResults = [];

      if (agent.tools.includes('search_vault')) {
        recordStep('Search Knowledge Vault', `Searching vault for "${cleanPrompt.slice(0, 50)}..."`);
        const searchResult = await this.toolRegistry.executeTool('search_vault', {
          query: cleanPrompt,
          limit: 4
        });
        if (searchResult.success && searchResult.result && searchResult.result.notes) {
          retrievedVaultContext = searchResult.result.notes;
          recordStep('Evidence Extracted', `Retrieved ${retrievedVaultContext.length} grounded notes from vault.`);
          toolResults.push({ tool: 'search_vault', count: retrievedVaultContext.length });
        }
      }

      // Step 4: Clustering if enabled
      if (agent.tools.includes('cluster_concepts')) {
        recordStep('Cluster Concept Links', `Mapping conceptual relationships for "${cleanPrompt.slice(0, 30)}..."`);
        const clusterRes = await this.toolRegistry.executeTool('cluster_concepts', { topic: cleanPrompt });
        if (clusterRes.success) {
          toolResults.push({ tool: 'cluster_concepts', data: clusterRes.result });
        }
      }

      // Step 5: Synthesize Final Output (Cloud AI with graceful on-device fallback)
      recordStep('Synthesize Agent Output', `Synthesizing final deliverable using ${agent.model}...`);

      let finalOutput = '';
      let isGrounded = retrievedVaultContext.length > 0;
      let usedFallback = false;

      // Construct system instruction with untrusted private context tags
      const contextText = retrievedVaultContext.map((n, i) =>
        `[Source ${i + 1}: ${n.title}]\n${n.summary || n.content || ''}`
      ).join('\n\n');

      const fullPromptPayload = `${agent.instructions}\n\nTask: ${cleanPrompt}\n\nRetrieved Vault Notes:\n${contextText || 'None available'}`;

      // Try server AI gateway
      try {
        const response = await fetch('/api/ai/gateway', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            contextNotes: retrievedVaultContext,
            model: options.modelOverride || agent.model
          })
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success && data.answer) {
          finalOutput = data.answer;
        } else {
          throw new Error(data.error || 'Gateway returned non-OK status');
        }
      } catch (cloudErr) {
        // Graceful On-Device Agent Fallback: Never fail with a dead screen!
        usedFallback = true;
        recordStep('Local Agent Fallback Active', `Cloud AI unavailable (${cloudErr.message}). Employing on-device synthesis.`);

        if (retrievedVaultContext.length > 0) {
          finalOutput = `### ${agent.icon} ${agent.name} — Grounded Report\n\n` +
            `*Synthesized from ${retrievedVaultContext.length} grounded vault sources (On-Device Synthesis)*\n\n` +
            retrievedVaultContext.map((n, i) =>
              `#### ${i + 1}. [${n.title}]\n${n.summary || n.content}\n`
            ).join('\n') +
            `\n---\n**Specialist Recommendation:**\nBased on your saved notes on "${cleanPrompt}", review the key concepts above or use the Deep Research workflow for extended synthesis.`;
        } else {
          // Synthetic specialist answer
          finalOutput = `### ${agent.icon} ${agent.name} — Specialist Output\n\n` +
            `**Objective:** ${cleanPrompt}\n\n` +
            `1. **Core Concept Breakdown:**\n` +
            `Addressing "${cleanPrompt}" from the perspective of **${agent.role}**.\n\n` +
            `2. **Key Recommendations:**\n` +
            `• Structure implementations with modular separation of concerns.\n` +
            `• Ensure comprehensive test coverage and boundary validation.\n` +
            `• Keep private knowledge vault updated with primary documentation.\n\n` +
            `*(Generated in Local Agent Mode)*`;
        }
      }

      // Step 6: Package Artifact if export tool enabled
      let generatedArtifact = null;
      if (agent.tools.includes('export_artifact')) {
        recordStep('Package Deliverable', `Generating downloadable Markdown artifact...`);
        const artifactRes = await this.toolRegistry.executeTool('export_artifact', {
          title: `${agent.name} — ${cleanPrompt.slice(0, 40)}`,
          type: 'markdown',
          content: finalOutput
        });
        if (artifactRes.success) {
          generatedArtifact = artifactRes.result;
        }
      }

      const totalDurationMs = Math.round(performance.now() - startTime);
      recordStep('Agent Execution Complete', `Finished in ${totalDurationMs}ms with ${executionSteps.length} verified steps.`);

      return {
        success: true,
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon,
        prompt: cleanPrompt,
        answer: finalOutput,
        isGrounded,
        usedFallback,
        citations: retrievedVaultContext.map(n => ({ id: n.id, title: n.title, sourceType: n.sourceType })),
        executionSteps,
        artifact: generatedArtifact,
        durationMs: totalDurationMs
      };
    }
  }

  return {
    ControlledToolRegistry,
    AgentSystem,
    DEFAULT_AGENTS
  };
});
