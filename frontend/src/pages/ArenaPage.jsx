import { useState } from 'react';
import { useBattle } from '../hooks/useBattle.js';
import { FormattedResponse } from '../components/FormattedResponse.jsx';
import { VotingBar } from '../components/VotingBar.jsx';
import { JudgeCard } from '../components/JudgeCard.jsx';
import { ResultBanner } from '../components/ResultBanner.jsx';
import { SkeletonPanel } from '../components/SkeletonPanel.jsx';
import { addToast } from '../components/Toast.jsx';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_PLACEHOLDERS,
  getRandomPrompt
} from '../constants.js';

// Suggested starter prompts for quick testing
const QUICK_STARTERS = [
  { label: 'Explain Quantum Computing', prompt: 'Explain quantum computing to a 12-year-old using clear analogies and 3 bullet points.' },
  { label: 'Python LRU Cache', prompt: 'Write an efficient LRU Cache class in Python with get and put methods in O(1) time complexity.' },
  { label: 'Kafka vs RabbitMQ', prompt: 'Compare Apache Kafka and RabbitMQ. Detail 3 architectural differences and when to choose which.' },
];

/**
 * ArenaPage — the Blind Battle tab.
 *
 * Renders:
 *  1. Arena Hero intro + category selector + starter prompts + prompt form
 *  2. Multi-turn conversation with two themed anonymous model panels + center VS badge
 *  3. Follow-up multi-turn dock, human voting deck, and automated AI Judge summon
 *  4. Post-vote identity reveal + Elo badges + rubric comparison
 */
export function ArenaPage() {
  const [selectedCategory, setSelectedCategory] = useState('General');

  const {
    prompt, setPrompt,
    followUpPrompt, setFollowUpPrompt,
    isStreaming, voting, evaluatingJudge,
    currentBattle, voteResult, judgeResult,
    handleStartBattle, handleSendFollowUp,
    handleVote, handleRunAIJudge, handleNextBattle,
  } = useBattle();

  // Wrap vote to emit toast feedback
  const handleVoteWithToast = async (winner) => {
    await handleVote(winner);
    if (winner === 'TIE') {
      addToast('🤝 Tie vote recorded! Model identities revealed.', 'info');
    } else {
      addToast(`👍 Vote for Model ${winner} recorded! Elo ratings updated.`, 'success');
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to submit
  const handlePromptKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (prompt.trim() && !isStreaming) {
        handleStartBattle(e, selectedCategory);
      }
    }
  };

  const handleFollowUpKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (followUpPrompt.trim() && !isStreaming) {
        handleSendFollowUp(e);
      }
    }
  };

  // Token estimate (~0.75 words per token)
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).filter(Boolean).length : 0;
  const tokenEst = Math.round(wordCount / 0.75);

  return (
    <div className="arena-wrapper">
      {/* ── Arena Hero & Prompt Deck ───────────────────────────── */}
      {!currentBattle && (
        <div className="arena-setup-container">
          {/* Hero Banner */}
          <div className="arena-hero">
            <div className="arena-hero-badge">
              <span className="hero-pulse-dot"></span>
              ⚔️ BLIND LLM EVALUATION ARENA
            </div>
            <h2 className="arena-hero-title">
              Side-by-Side Model Battleground
            </h2>
            <p className="arena-hero-desc">
              Submit any question, code, or prompt. Two anonymous state-of-the-art models generate answers in real-time. Compare speed, nuance, and logic — then vote or summon our automated AI Judge.
            </p>
          </div>

          {/* Prompt Form */}
          <form onSubmit={(e) => handleStartBattle(e, selectedCategory)} className="arena-prompt-card">
            {/* Category Selector */}
            <div className="prompt-header-row">
              <span className="prompt-card-label">Select Evaluation Domain:</span>
              <div className="category-pill-group">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                    disabled={isStreaming}
                  >
                    <span className="cat-icon">{CATEGORY_ICONS[cat] || '✨'}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea container */}
            <div className="prompt-textarea-wrapper">
              <textarea
                id="prompt-input"
                className="prompt-textarea"
                placeholder={CATEGORY_PLACEHOLDERS[selectedCategory] || CATEGORY_PLACEHOLDERS.General}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                rows={4}
                disabled={isStreaming}
              />

              {/* Counter / Shortcut indicator */}
              <div className="prompt-meta-bar">
                <span className="prompt-shortcut-hint">Press Ctrl+Enter to Stream</span>
                {wordCount > 0 && (
                  <span className="prompt-counter">
                    {wordCount} words · ~{tokenEst} tokens
                  </span>
                )}
              </div>
            </div>

            {/* Quick Starters */}
            <div className="quick-starters-row">
              <span className="quick-starters-label">💡 Quick Starters:</span>
              <div className="quick-chips-wrap">
                {QUICK_STARTERS.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => setPrompt(item.prompt)}
                    disabled={isStreaming}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="prompt-actions-row">
              <button
                type="button"
                className="random-prompt-btn"
                onClick={() => setPrompt(getRandomPrompt(selectedCategory))}
                disabled={isStreaming}
                title="Fill with a random example prompt"
              >
                🎲 Random {selectedCategory} Prompt
              </button>

              <button
                type="submit"
                className="submit-battle-btn"
                disabled={!prompt.trim() || isStreaming}
              >
                {isStreaming ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Streaming Responses...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Stream Battle [{selectedCategory}]</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Active Battle ────────────────────────────────────── */}
      {currentBattle && (
        <div className="active-battle-container">
          {currentBattle.turns.map((turnItem, idx) => {
            const isLastTurn = idx === currentBattle.turns.length - 1;
            const showSkeleton = isStreaming && isLastTurn;

            return (
              <div key={idx} className="battle-round-block">
                {/* Round Prompt Header Card */}
                <div className="battle-prompt-card">
                  <div className="battle-prompt-meta">
                    <div className="prompt-meta-left">
                      <span className="turn-pill">ROUND {turnItem.turn}</span>
                      <span className="category-tag-pill">
                        {CATEGORY_ICONS[currentBattle.category] || '🌐'} {currentBattle.category || 'General'}
                      </span>
                    </div>
                    <span className="prompt-user-label">USER QUERY</span>
                  </div>
                  <div className="battle-prompt-content">
                    <p className="battle-prompt-text">{turnItem.prompt}</p>
                  </div>
                </div>

                {/* Side-by-Side Model Arena Grid with Central VS Badge */}
                <div className="battle-grid-wrapper">
                  <div className="battle-grid">
                    <ResponsePanel
                      modelRole="A"
                      label={voteResult ? voteResult.modelA.name : 'Model A'}
                      response={turnItem.responseA}
                      isStreaming={isStreaming && isLastTurn}
                      showSkeleton={showSkeleton && !turnItem.responseA}
                      isWinner={voteResult && voteResult.winner === 'A'}
                      isTie={voteResult && voteResult.winner === 'TIE'}
                      eloInfo={voteResult && isLastTurn ? voteResult.modelA : null}
                    />

                    <ResponsePanel
                      modelRole="B"
                      label={voteResult ? voteResult.modelB.name : 'Model B'}
                      response={turnItem.responseB}
                      isStreaming={isStreaming && isLastTurn}
                      showSkeleton={showSkeleton && !turnItem.responseB}
                      isWinner={voteResult && voteResult.winner === 'B'}
                      isTie={voteResult && voteResult.winner === 'TIE'}
                      eloInfo={voteResult && isLastTurn ? voteResult.modelB : null}
                    />
                  </div>

                  <div className="battle-center-vs">
                    <div className="vs-badge-inner">
                      <span>VS</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Follow-up input dock — hidden after vote */}
          {!voteResult && (
            <form onSubmit={handleSendFollowUp} className="followup-card">
              <div className="followup-header">
                <span className="followup-tag">💬 MULTI-TURN CONTINUATION</span>
                <span className="followup-subtext">Ask follow-ups to test memory, nuance, or code fixes</span>
              </div>
              <div className="followup-input-row">
                <input
                  id="followup-input"
                  type="text"
                  className="followup-input"
                  placeholder="e.g. Can you clarify point 2, or optimize your code for time complexity?"
                  value={followUpPrompt}
                  onChange={(e) => setFollowUpPrompt(e.target.value)}
                  onKeyDown={handleFollowUpKeyDown}
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  className="followup-submit-btn"
                  disabled={!followUpPrompt.trim() || isStreaming}
                >
                  {isStreaming ? '⚡ Streaming...' : '⚡ Send Follow-up'}
                </button>
              </div>
            </form>
          )}

          {/* Voting Bar & AI Judge Trigger Deck — hidden after vote */}
          {!voteResult && (
            <div className="decision-deck-container">
              {/* Human Voting Bar */}
              <VotingBar
                onVote={handleVoteWithToast}
                disabled={voting || isStreaming || !currentBattle.battleId}
              />

              {/* AI Judge Benchmark Summon Deck */}
              <div className="ai-judge-summon-card">
                <div className="judge-summon-info">
                  <div className="judge-summon-title">
                    <span className="judge-summon-icon">🤖</span>
                    <span>Automated AI Judge Benchmark</span>
                  </div>
                  <p className="judge-summon-desc">
                    Need an objective machine verdict? Summon our GPT-4o judge to score Accuracy, Reasoning, Formatting, and Conciseness with deterministic temperature.
                  </p>
                </div>
                <button
                  type="button"
                  className="judge-summon-btn"
                  onClick={handleRunAIJudge}
                  disabled={evaluatingJudge || isStreaming || !currentBattle.battleId}
                >
                  {evaluatingJudge ? (
                    <>
                      <span className="btn-spinner"></span>
                      <span>AI Judge Deliberating...</span>
                    </>
                  ) : (
                    <>
                      <span>⚖️ Trigger Automated AI Judge</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI Judge result card */}
          <JudgeCard judgeResult={judgeResult} />

          {/* Post-vote reveal banner */}
          <ResultBanner voteResult={voteResult} onNextBattle={handleNextBattle} />
        </div>
      )}
    </div>
  );
}

// ─── Internal: ResponsePanel ──────────────────────────────────────────────────

function ResponsePanel({
  modelRole,
  label,
  response,
  isStreaming,
  showSkeleton,
  isWinner,
  isTie,
  eloInfo
}) {
  const isA = modelRole === 'A';
  const wordCount = response ? response.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTimeSec = Math.max(1, Math.round(wordCount / 3.5));

  return (
    <div className={`response-panel ${isA ? 'model-a-panel' : 'model-b-panel'} ${isWinner ? 'panel-winner' : ''}`}>
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-wrap">
          <div className={`panel-avatar-badge ${isA ? 'avatar-a' : 'avatar-b'}`}>
            {isWinner ? '👑' : isA ? '🔵' : '🟣'}
          </div>
          <div className="panel-text-block">
            <div className="panel-title-row">
              <span className="panel-title">{label}</span>
              {isWinner && <span className="winner-pill">WINNER</span>}
              {isTie && <span className="tie-pill">TIED</span>}
            </div>
            <span className="panel-role-subtitle">
              {isA ? 'Competitor Alpha' : 'Competitor Beta'}
            </span>
          </div>
        </div>

        <div className="panel-header-right">
          {/* Elo Badge if vote completed */}
          {eloInfo && (
            <div className="elo-badge">
              <span className="elo-label">Elo</span>
              <span className="elo-number">{eloInfo.newElo}</span>
              <span className={eloInfo.newElo >= eloInfo.oldElo ? 'elo-plus' : 'elo-minus'}>
                ({eloInfo.newElo >= eloInfo.oldElo ? '+' : ''}
                {eloInfo.newElo - eloInfo.oldElo})
              </span>
            </div>
          )}

          {/* Live Status indicator */}
          {!eloInfo && (
            <div className="live-status-badge">
              {isStreaming ? (
                <span className="status-streaming">
                  <span className="pulse-indicator"></span> Streaming
                </span>
              ) : response ? (
                <span className="status-ready">
                  ✓ {wordCount} words · {readTimeSec}s
                </span>
              ) : (
                <span className="status-waiting">Waiting</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel Body */}
      <div className="response-content">
        {showSkeleton ? (
          <SkeletonPanel />
        ) : (
          <FormattedResponse text={response} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}
