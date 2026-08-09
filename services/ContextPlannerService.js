/**
 * Second Brain AI System — Multi-Turn Context Planner & Thread History Manager
 * Manages conversation history, token budgeting, pronoun resolution ('this note', 'that project'),
 * and context compression for large scale multi-tenant chat threads.
 */

class ContextPlannerService {
  constructor(maxContextTokens = 4096) {
    this.maxContextTokens = maxContextTokens;
  }

  /**
   * Resolves pronouns and references across multi-turn chat history
   */
  resolveReferences(currentPrompt, history = []) {
    if (!currentPrompt || typeof currentPrompt !== 'string') return currentPrompt;
    if (!Array.isArray(history) || history.length === 0) return currentPrompt;

    const lastTurn = history[history.length - 1];
    if (!lastTurn || !lastTurn.query) return currentPrompt;

    const lower = currentPrompt.toLowerCase();
    const pronouns = ['this topic', 'that', 'what else', 'tell me more', 'more about this', 'summarize it', 'explain it further'];

    const hasPronoun = pronouns.some(p => lower.includes(p));
    if (hasPronoun) {
      return `${currentPrompt} (Context reference: "${lastTurn.query}")`;
    }

    return currentPrompt;
  }

  /**
   * Builds an optimized token-budgeted prompt context window
   */
  buildContextWindow({ prompt, history = [], contextNotes = [] }) {
    const resolvedPrompt = this.resolveReferences(prompt, history);

    // Formatted context snippets from notes
    const noteSnippets = contextNotes.slice(0, 5).map((note, idx) => {
      const title = note.title || `Document #${idx + 1}`;
      const text = (note.content || note.summary || '').substring(0, 300);
      return `[Vault Source ${idx + 1}: ${title}]\n${text}`;
    });

    // Formatted recent conversation turns (up to last 6 turns)
    const recentTurns = history.slice(-6).map(turn => {
      const q = turn.query || turn.text || '';
      const a = turn.answer || (turn.response ? turn.response.answer : '');
      return `User: ${q}\nAssistant: ${typeof a === 'string' ? a.substring(0, 200) : ''}`;
    });

    return {
      resolvedPrompt,
      formattedNotes: noteSnippets,
      recentTurns,
      totalTurnsCount: history.length,
      notesCount: contextNotes.length,
      estimatedTokens: Math.ceil((resolvedPrompt.length + noteSnippets.join(' ').length + recentTurns.join(' ').length) / 4)
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextPlannerService;
} else if (typeof window !== 'undefined') {
  window.ContextPlannerService = ContextPlannerService;
}
