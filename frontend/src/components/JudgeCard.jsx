/**
 * JudgeCard — displays the AI Judge benchmark result card with animated comparison bars.
 *
 * Props:
 *  - judgeResult: { verdict, reasoning, modelA, modelB }
 *    modelA/modelB: { overallScore, accuracy, formatting, logic, conciseness }
 */
export function JudgeCard({ judgeResult, voteResult, modelAName, modelBName }) {
  if (!judgeResult) return null;

  const { verdict, reasoning, modelA, modelB } = judgeResult;

  const isRevealed = Boolean(voteResult?.modelA?.name || modelAName);
  const nameA = voteResult?.modelA?.name || modelAName || 'Model A';
  const nameB = voteResult?.modelB?.name || modelBName || 'Model B';

  const isTie = verdict === 'TIE';
  const scoreDiff = Math.abs((modelA?.overallScore || 0) - (modelB?.overallScore || 0)).toFixed(1);

  const winnerName = verdict === 'A' ? nameA : verdict === 'B' ? nameB : null;

  // Enhance reasoning text with revealed model names if identities are known
  const displayReasoning = reasoning
    ? (isRevealed
        ? reasoning
            .replace(/\bModel A\b/g, nameA)
            .replace(/\bModel B\b/g, nameB)
            .replace(/\bResponse A\b/g, `${nameA}'s response`)
            .replace(/\bResponse B\b/g, `${nameB}'s response`)
        : reasoning)
    : null;

  const criteriaList = [
    { key: 'accuracy', label: 'Accuracy & Correctness', icon: '🎯' },
    { key: 'logic', label: 'Reasoning & Logic', icon: '🧠' },
    { key: 'formatting', label: 'Formatting & Structure', icon: '📐' },
    { key: 'conciseness', label: 'Conciseness & Clarity', icon: '✂️' },
  ];

  const getScoreColorClass = (score) => {
    if (score >= 8.5) return 'score-pill--high';
    if (score >= 7.0) return 'score-pill--med';
    return 'score-pill--low';
  };

  return (
    <div className="judge-card">
      {/* Verdict Header */}
      <div className="judge-header">
        <div className="judge-header-left">
          <div className="judge-eyebrow">
            <span className="judge-pulse-dot"></span>
            🤖 AUTOMATED AI BENCHMARK (GPT-4O JUDGE)
          </div>
          <h3 className="judge-headline">
            {isTie ? (
              <span>🤝 AI Verdict: <strong style={{ color: '#fbbf24' }}>Draw / Even Match</strong></span>
            ) : (
              <span>
                🏆 AI Verdict:{' '}
                <strong style={{ color: verdict === 'A' ? 'var(--accent-cyan)' : 'var(--accent-secondary)' }}>
                  {winnerName} Wins
                </strong>{' '}
                {scoreDiff > 0 && <span className="verdict-diff-pill">+{scoreDiff} pts</span>}
              </span>
            )}
          </h3>
        </div>

        {/* Overall Score Badges */}
        <div className="judge-overall-summary">
          <div className="model-score-badge model-a" title={nameA}>
            <span className="badge-tag">{nameA}</span>
            <span className="badge-val">{modelA?.overallScore?.toFixed(1) ?? '—'}<small>/10</small></span>
          </div>
          <span className="score-vs-divider">vs</span>
          <div className="model-score-badge model-b" title={nameB}>
            <span className="badge-tag">{nameB}</span>
            <span className="badge-val">{modelB?.overallScore?.toFixed(1) ?? '—'}<small>/10</small></span>
          </div>
        </div>
      </div>

      {/* Head-to-Head Rubric Comparison */}
      <div className="rubric-comparison-deck">
        <div className="rubric-deck-header">
          <span>EVALUATION RUBRIC</span>
          <div className="rubric-legend">
            <span className="legend-chip legend-chip--a" title={nameA}>🔵 {nameA}</span>
            <span className="legend-chip legend-chip--b" title={nameB}>🟣 {nameB}</span>
          </div>
        </div>

        <div className="rubric-rows-container">
          {criteriaList.map(({ key, label, icon }) => {
            const valA = modelA?.[key] ?? 0;
            const valB = modelB?.[key] ?? 0;
            const pctA = Math.min(100, Math.max(0, (valA / 10) * 100));
            const pctB = Math.min(100, Math.max(0, (valB / 10) * 100));

            return (
              <div key={key} className="rubric-row">
                <div className="rubric-info">
                  <span className="rubric-label">
                    <span className="rubric-icon">{icon}</span> {label}
                  </span>
                  <div className="rubric-scores-quick">
                    <span className={`score-tag score-tag--a ${getScoreColorClass(valA)}`} title={`${nameA}: ${valA}/10`}>A: {valA}/10</span>
                    <span className={`score-tag score-tag--b ${getScoreColorClass(valB)}`} title={`${nameB}: ${valB}/10`}>B: {valB}/10</span>
                  </div>
                </div>

                <div className="dual-progress-track">
                  {/* Model A bar */}
                  <div className="progress-lane lane--a">
                    <div
                      className="progress-fill fill--a"
                      style={{ width: `${pctA}%` }}
                      title={`${nameA}: ${valA}/10`}
                    />
                  </div>
                  {/* Model B bar */}
                  <div className="progress-lane lane--b">
                    <div
                      className="progress-fill fill--b"
                      style={{ width: `${pctB}%` }}
                      title={`${nameB}: ${valB}/10`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Judge Reasoning Quote */}
      {displayReasoning && (
        <div className="judge-reasoning-card">
          <div className="judge-reasoning-header">
            <span>⚖️ Impartial Deliberation</span>
          </div>
          <p className="judge-reasoning-text">“{displayReasoning}”</p>
        </div>
      )}
    </div>
  );
}
