/**
 * Second Brain AI System — Intent Classifier & Tool Calling Orchestrator
 * Analyzes user prompts, identifies intent, selects modular tools (search_vault,
 * create_note, update_goal, execute_code, web_lookup), and plans multi-step execution.
 */

class OrchestratorService {
  constructor() {
    this.tools = [
      {
        name: 'search_vault',
        description: 'Searches user private knowledge vault for saved notes, documents, and research using hybrid BM25 and vector similarity.',
        keywords: ['find', 'search', 'vault', 'note', 'saved', 'what did i write', 'my research', 'summary of my']
      },
      {
        name: 'create_note',
        description: 'Creates and saves a new note or document directly to the knowledge vault.',
        keywords: ['save note', 'create note', 'add note', 'remember this', 'store note', 'write down']
      },
      {
        name: 'update_goal',
        description: 'Updates goal progress or creates a new milestone in user learning dashboard.',
        keywords: ['goal', 'milestone', 'learning progress', 'update goal', 'track goal']
      },
      {
        name: 'execute_code',
        description: 'Executes or audits code snippets, algorithms, and mathematical computations.',
        keywords: ['code', 'python', 'javascript', 'sql', 'script', 'algorithm', 'bug', 'function', 'audit security']
      },
      {
        name: 'web_lookup',
        description: 'Queries external AI general knowledge model for global news, tech trends, and external topics.',
        keywords: ['latest news', 'what is', 'explain', 'tell me about', 'how does', 'definition']
      }
    ];
  }

  classifyIntent(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { primaryIntent: 'general_chat', selectedTools: ['web_lookup'], confidence: 0.5 };
    }

    const lower = prompt.toLowerCase();

    // Check greeting / casual conversation
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'who are you', 'help', 'yo', 'sup'];
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    if (words.length <= 3 && greetings.some(g => words.includes(g))) {
      return {
        primaryIntent: 'conversational_greeting',
        selectedTools: [],
        confidence: 0.98,
        explanation: 'Casual conversational prompt detected'
      };
    }

    // Score tools based on keyword matches
    const toolScores = this.tools.map(tool => {
      let score = 0;
      tool.keywords.forEach(kw => {
        if (lower.includes(kw)) score += 1;
      });
      return { toolName: tool.name, score };
    });

    toolScores.sort((a, b) => b.score - a.score);

    const activeTools = toolScores.filter(t => t.score > 0).map(t => t.toolName);

    let primaryIntent = 'general_knowledge';
    if (activeTools.includes('search_vault')) {
      primaryIntent = 'vault_grounded_search';
    } else if (activeTools.includes('create_note')) {
      primaryIntent = 'note_ingestion';
    } else if (activeTools.includes('execute_code')) {
      primaryIntent = 'code_execution_analysis';
    } else if (activeTools.includes('update_goal')) {
      primaryIntent = 'goal_management';
    }

    return {
      primaryIntent,
      selectedTools: activeTools.length > 0 ? activeTools : ['web_lookup'],
      confidence: activeTools.length > 0 ? 0.90 : 0.70,
      explanation: `Selected tools [${(activeTools.length > 0 ? activeTools : ['web_lookup']).join(', ')}] based on intent classification`
    };
  }

  executePlan({ prompt, contextNotes = [], dbInstance = null }) {
    const classification = this.classifyIntent(prompt);
    const executionSteps = [];

    executionSteps.push(`Intent classified: ${classification.primaryIntent} (Confidence: ${(classification.confidence * 100).toFixed(0)}%)`);

    if (classification.selectedTools.includes('search_vault')) {
      executionSteps.push(`Tool execution [search_vault]: Querying local vault notes... (${contextNotes.length} notes available)`);
    }

    if (classification.selectedTools.includes('execute_code')) {
      executionSteps.push(`Tool execution [execute_code]: Parsing syntax trees and security bounds...`);
    }

    if (classification.selectedTools.includes('create_note')) {
      executionSteps.push(`Tool execution [create_note]: Formatting note DTO for vault storage...`);
    }

    return {
      intent: classification.primaryIntent,
      selectedTools: classification.selectedTools,
      confidence: classification.confidence,
      executionSteps,
      timestamp: new Date().toISOString()
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrchestratorService;
} else if (typeof window !== 'undefined') {
  window.OrchestratorService = OrchestratorService;
}
